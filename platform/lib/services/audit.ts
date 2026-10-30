import { schema, type Executor } from '@/lib/db';
import { actorId, type Actor } from './actor';

export async function audit(db: Executor, actor: Actor, action: string, entity: string, entityId: string | null, detail?: unknown, agencyId?: string | null) {
  await db.insert(schema.auditLog).values({
    actorId: actorId(actor), actorLabel: actor.label, action, entity, entityId,
    agencyId: agencyId ?? actor.agencyId ?? null, detail: (detail ?? null) as object,
  });
}
