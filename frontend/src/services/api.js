// ============================================================
// HotelBridge CRM — client-side data layer (localStorage)
// No backend required: every CRM screen works offline, in-browser,
// and persists per device. Same interface the pages already use
// ({ data } Promises), so nothing else needed to change.
//
// When Supabase is connected, this file is the ONLY thing that
// gets swapped — the screens stay exactly as they are.
// ============================================================

import {
  mockHotels, mockOperators, mockBookings, mockCommissions,
} from '../data/crmMockData';

const KEYS = {
  hotels:      'hotelbridge.crm.hotels',
  operators:   'hotelbridge.crm.operators',
  bookings:    'hotelbridge.crm.bookings',
  commissions: 'hotelbridge.crm.commissions',
};
const SEED_FLAG = 'hotelbridge.crm.seeded.v1';   // legacy: set by old builds that seeded demo data
const CLEAN_FLAG = 'hotelbridge.crm.realonly.v1'; // run the demo-data cleanup once

// IDs of the old demo/seed records, so we can remove exactly those and keep
// everything real the user added. Real records use string uids, not these ints.
const DEMO_IDS = {
  [KEYS.hotels]:      new Set(mockHotels.map((x) => String(x.id))),
  [KEYS.operators]:   new Set(mockOperators.map((x) => String(x.id))),
  [KEYS.bookings]:    new Set(mockBookings.map((x) => String(x.id))),
  [KEYS.commissions]: new Set(mockCommissions.map((x) => String(x.id))),
};

// Real data only. Never seed demo data; strip any demo records a previous
// build planted in this browser, leaving the user's real records untouched.
let _seeded = false;
function ensureSeed() {
  if (_seeded) return;
  try {
    if (!localStorage.getItem(CLEAN_FLAG)) {
      Object.keys(DEMO_IDS).forEach((key) => {
        try {
          const arr = JSON.parse(localStorage.getItem(key) || '[]');
          const cleaned = arr.filter((x) => !DEMO_IDS[key].has(String(x.id)));
          if (cleaned.length !== arr.length) localStorage.setItem(key, JSON.stringify(cleaned));
        } catch { /* ignore a bad key */ }
      });
      localStorage.removeItem(SEED_FLAG);
      localStorage.setItem(CLEAN_FLAG, '1');
    }
  } catch { /* private mode / disabled storage — degrade gracefully */ }
  _seeded = true;
}

function read(key) {
  ensureSeed();
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function write(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ }
}

// mimic axios: resolve to { data }, with a tiny delay so loading states show
const ok = (data) => new Promise((res) => setTimeout(() => res({ data }), 120));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function crud(key) {
  return {
    getAll: () => ok(read(key)),
    getOne: (id) => ok(read(key).find((x) => String(x.id) === String(id))),
    create: (data) => {
      const item = { id: uid(), createdAt: new Date().toISOString(), ...data };
      write(key, [item, ...read(key)]);
      return ok(item);
    },
    update: (id, data) => {
      const items = read(key).map((x) => (String(x.id) === String(id) ? { ...x, ...data } : x));
      write(key, items);
      return ok(items.find((x) => String(x.id) === String(id)));
    },
    delete: (id) => {
      write(key, read(key).filter((x) => String(x.id) !== String(id)));
      return ok({ success: true });
    },
  };
}

export const hotelsAPI    = {
  ...crud(KEYS.hotels),
  // Bulk import (e.g. a partner portfolio). De-dupes by name+city so re-running is safe.
  bulkCreate: (items) => {
    const existing = read(KEYS.hotels);
    const norm = (h) => `${(h.name || '').trim().toLowerCase()}|${(h.city || '').trim().toLowerCase()}`;
    const seen = new Set(existing.map(norm));
    const toAdd = [];
    (items || []).forEach((it, i) => {
      const k = norm(it);
      if (!it.name || seen.has(k)) return;
      seen.add(k);
      toAdd.push({ id: `${uid()}-${i}`, createdAt: new Date().toISOString(), ...it });
    });
    write(KEYS.hotels, [...toAdd, ...existing]);
    return ok({ added: toAdd.length, skipped: (items || []).length - toAdd.length });
  },
};
export const operatorsAPI = crud(KEYS.operators);

// Bookings: auto-calc totalRevenue, and auto-create a commission when confirmed
export const bookingsAPI = {
  ...crud(KEYS.bookings),
  create: (data) => {
    const totalRevenue = (data.rooms || 0) * (data.nights || 0) * (data.ratePerRoom || 0);
    const booking = { id: uid(), createdAt: new Date().toISOString(), ...data, totalRevenue };
    write(KEYS.bookings, [booking, ...read(KEYS.bookings)]);

    if (booking.status === 'confirmed') {
      const hotel = read(KEYS.hotels).find((h) => String(h.id) === String(booking.hotelId));
      const pct = hotel?.commission ?? 12;
      const marginPerRoom = (booking.ratePerRoom || 0) * 0.2;
      const commission = {
        id: uid(),
        bookingId: booking.id,
        groupName: booking.groupName,
        totalBookingValue: totalRevenue,
        marginPerRoom,
        totalMargin: marginPerRoom * (booking.rooms || 0) * (booking.nights || 0),
        commissionPercent: pct,
        commissionAmount: totalRevenue * (pct / 100),
        paymentStatus: 'pending',
        paymentDueDate: booking.checkOut,
        paidDate: null,
      };
      write(KEYS.commissions, [commission, ...read(KEYS.commissions)]);
    }
    return ok(booking);
  },
  update: (id, data) => {
    const items = read(KEYS.bookings).map((x) => {
      if (String(x.id) !== String(id)) return x;
      const merged = { ...x, ...data };
      merged.totalRevenue = (merged.rooms || 0) * (merged.nights || 0) * (merged.ratePerRoom || 0);
      return merged;
    });
    write(KEYS.bookings, items);
    return ok(items.find((x) => String(x.id) === String(id)));
  },
};

export const commissionsAPI = {
  ...crud(KEYS.commissions),
  getByBooking: (bookingId) =>
    ok(read(KEYS.commissions).filter((c) => String(c.bookingId) === String(bookingId))),
};

// ---------- Dashboard (computed live from stored data) ----------
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function computeStats() {
  const bookings = read(KEYS.bookings);
  const confirmed = bookings.filter((b) => b.status === 'confirmed');
  const commissions = read(KEYS.commissions);
  return {
    totalRevenue: confirmed.reduce((s, b) => s + (b.totalRevenue || 0), 0),
    totalRoomNights: confirmed.reduce((s, b) => s + (b.rooms || 0) * (b.nights || 0), 0),
    totalCommission: commissions.reduce((s, c) => s + (c.commissionAmount || 0), 0),
    pendingPayments: commissions
      .filter((c) => c.paymentStatus === 'pending')
      .reduce((s, c) => s + (c.commissionAmount || 0), 0),
    confirmedBookings: confirmed.length,
    totalHotels: read(KEYS.hotels).filter((h) => h.status === 'active').length,
    totalOperators: read(KEYS.operators).length,
  };
}

function monthlyRevenue() {
  const bookings = read(KEYS.bookings).filter((b) => b.status === 'confirmed');
  if (!bookings.length) return []; // real data only — no placeholder numbers
  const acc = {};
  bookings.forEach((b) => {
    const d = new Date(b.checkIn);
    const m = MONTHS[isNaN(d) ? 0 : d.getMonth()];
    acc[m] = acc[m] || { revenue: 0, commission: 0 };
    acc[m].revenue += b.totalRevenue || 0;
    acc[m].commission += (b.totalRevenue || 0) * 0.12;
  });
  return MONTHS.filter((m) => acc[m]).map((m) => ({ month: m, ...acc[m] }));
}

function topHotels() {
  const bookings = read(KEYS.bookings);
  return read(KEYS.hotels)
    .map((h) => ({
      name: h.name,
      city: h.city,
      bookings: bookings.filter((b) => String(b.hotelId) === String(h.id)).length,
    }))
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 5);
}

function topOperators() {
  const bookings = read(KEYS.bookings);
  return read(KEYS.operators)
    .map((o) => {
      const ob = bookings.filter((b) => String(b.operatorId) === String(o.id));
      return {
        name: o.companyName,
        bookings: ob.length,
        revenue: ob.reduce((s, b) => s + (b.totalRevenue || 0), 0),
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
}

export const dashboardAPI = {
  getStats: () => ok(computeStats()),
  getMonthlyRevenue: () => ok(monthlyRevenue()),
  getTopHotels: () => ok(topHotels()),
  getTopOperators: () => ok(topOperators()),
};

// Auth kept for interface compatibility (real auth handled in Login/guard)
export const authAPI = {
  login: (email) => ok({ email }),
  logout: () => ok({ success: true }),
};

// Utility for the future Supabase migration / manual reset while testing
export function resetCrmData() {
  try {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem(SEED_FLAG);
    _seeded = false;
  } catch { /* ignore */ }
}
