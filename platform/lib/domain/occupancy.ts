import { z } from 'zod';
import type { RoomRequest } from '@/lib/db/schema';

export const MAX_ROOMS = 9;

export const roomRequestSchema = z.object({
  adults: z.number().int().min(1, 'Each room needs at least one adult').max(4, 'At most 4 adults per room'),
  childAges: z.array(z.number().int().min(0).max(17, 'Children are 0–17; older guests count as adults')).max(3, 'At most 3 children per room'),
});

export const roomsSchema = z.array(roomRequestSchema).min(1, 'Add at least one room').max(MAX_ROOMS, `At most ${MAX_ROOMS} rooms per booking — use Group Desk for more`);

/** Compact URL form: "2,2-5|1" = room 1: 2 adults; room 2: 2 adults + child aged 5; room 3: 1 adult. */
export function encodeRooms(rooms: RoomRequest[]): string {
  return rooms.map((r) => (r.childAges.length ? `${r.adults}-${r.childAges.join('-')}` : String(r.adults))).join('|');
}

export function decodeRooms(s: string | undefined | null): RoomRequest[] {
  if (!s) return [{ adults: 2, childAges: [] }];
  const rooms = s.split('|').filter(Boolean).map((part) => {
    const [a, ...kids] = part.split('-').map((x) => Number(x));
    return { adults: a, childAges: kids };
  });
  const parsed = roomsSchema.safeParse(rooms);
  return parsed.success ? parsed.data : [{ adults: 2, childAges: [] }];
}

export function describeRoom(r: RoomRequest): string {
  const a = `${r.adults} adult${r.adults === 1 ? '' : 's'}`;
  if (!r.childAges.length) return a;
  return `${a}, ${r.childAges.length} child${r.childAges.length === 1 ? '' : 'ren'} (${r.childAges.join(', ')})`;
}

export function describeRooms(rooms: RoomRequest[]): string {
  const guests = rooms.reduce((n, r) => n + r.adults + r.childAges.length, 0);
  return `${rooms.length} room${rooms.length === 1 ? '' : 's'} · ${guests} guest${guests === 1 ? '' : 's'}`;
}

export type RoomCapacity = { maxAdults: number; maxChildren: number; maxOccupancy: number };

export function fits(room: RoomRequest, cap: RoomCapacity): boolean {
  return room.adults <= cap.maxAdults
    && room.childAges.length <= cap.maxChildren
    && room.adults + room.childAges.length <= cap.maxOccupancy;
}
