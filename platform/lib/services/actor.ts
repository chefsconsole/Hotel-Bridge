import { ForbiddenError } from './errors';

/** HotelBridge's own team. Admin can do everything; the others their part. */
export const STAFF_ROLES = ['admin', 'ops', 'sales', 'finance'] as const;
export type StaffRole = typeof STAFF_ROLES[number];
export const ROLE_LABEL: Record<StaffRole, string> = { admin: 'Admin', ops: 'Operations', sales: 'Sales & contracting', finance: 'Finance' };
export const ROLE_SUMMARY: Record<StaffRole, string> = {
  admin: 'Everything, including activating contracts, pricing, settings and the team.',
  ops: 'Bookings, hotel confirmations, cancellations, Group Desk, arrivals, agency approvals, hotel content.',
  sales: 'Hotels, contracts and rate sheets (activation stays with admin), agency onboarding and approvals, partner applications, Group Desk proposals.',
  finance: 'Payments, refunds, wallet payouts, agency credit, hotel settlements, pricing rules and invoices.',
};

/** Who is acting. Built from the session on the server — never from the client. */
export type Actor = {
  userId: string;
  label: string; // "Name (email)" for audit trails
  platformRole: StaffRole | null;
  agencyId: string | null;
  agencyRole: 'owner' | 'agent' | null;
  partnerHotelId: string | null;
};

export const SYSTEM: Actor = { userId: '00000000-0000-0000-0000-000000000000', label: 'System', platformRole: 'admin', agencyId: null, agencyRole: null, partnerHotelId: null };

export function isStaff(a: Actor): boolean {
  return a.platformRole != null;
}

export function requireStaff(a: Actor, roles: StaffRole[] = ['admin', 'ops', 'sales', 'finance']) {
  if (!a.platformRole || !roles.includes(a.platformRole)) throw new ForbiddenError();
}

/** The agency this actor may act for. Agents get exactly their own. */
export function agencyOf(a: Actor): string {
  if (!a.agencyId) throw new ForbiddenError('This action is for travel agency accounts');
  return a.agencyId;
}

export function actorId(a: Actor): string | null {
  return a.userId === SYSTEM.userId ? null : a.userId;
}
