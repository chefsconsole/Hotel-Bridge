import { ForbiddenError } from './errors';

/** Who is acting. Built from the session on the server — never from the client. */
export type Actor = {
  userId: string;
  label: string; // "Name (email)" for audit trails
  platformRole: 'admin' | 'ops' | 'finance' | null;
  agencyId: string | null;
  agencyRole: 'owner' | 'agent' | null;
  partnerHotelId: string | null;
};

export const SYSTEM: Actor = { userId: '00000000-0000-0000-0000-000000000000', label: 'System', platformRole: 'admin', agencyId: null, agencyRole: null, partnerHotelId: null };

export function isStaff(a: Actor): boolean {
  return a.platformRole != null;
}

export function requireStaff(a: Actor, roles: Array<'admin' | 'ops' | 'finance'> = ['admin', 'ops', 'finance']) {
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
