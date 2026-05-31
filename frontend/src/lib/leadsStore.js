// Simple localStorage-based lead capture — no backend needed
// When backend is wired up, swap saveLead() to POST /api/leads

const STORAGE_KEY = 'hotelbridge.leads';

export function getLeads() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLead(lead) {
  const leads = getLeads();
  const newLead = {
    id: `L-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    status: 'new', // new | contacted | qualified | closed | lost
    source: 'contact-form', // contact-form | newsletter | pricing-cta | whatsapp
    starred: false,
    notes: '',
    ...lead,
  };
  const updated = [newLead, ...leads];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return newLead;
}

export function updateLead(id, patch) {
  const leads = getLeads();
  const updated = leads.map((l) => (l.id === id ? { ...l, ...patch } : l));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function deleteLead(id) {
  const leads = getLeads().filter((l) => l.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
}

export const LEAD_STATUSES = {
  new:       { label: 'New',        color: 'bg-blue-50 text-blue-700 border-blue-200',     dot: 'bg-blue-500' },
  contacted: { label: 'Contacted',  color: 'bg-yellow-50 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500' },
  qualified: { label: 'Qualified',  color: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  closed:    { label: 'Closed Won', color: 'bg-green-50 text-green-700 border-green-200',  dot: 'bg-green-500' },
  lost:      { label: 'Lost',       color: 'bg-red-50 text-red-600 border-red-200',        dot: 'bg-red-500' },
};

export const LEAD_SOURCES = {
  'contact-form':  'Contact Form',
  'newsletter':    'Newsletter',
  'pricing-cta':   'Pricing CTA',
  'whatsapp':      'WhatsApp',
  'roi-cta':       'ROI Calculator',
};
