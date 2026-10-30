import { Pill } from './ui';
import { STAGE_LABEL } from '@/lib/services/groups';

export function StagePill({ status }: { status: string }) {
  const tone = status === 'won' ? 'positive' : ['lost', 'cancelled'].includes(status) ? 'neutral' : status === 'sent_to_agent' ? 'attention' : 'pending';
  return <Pill tone={tone}>{STAGE_LABEL[status] ?? status}</Pill>;
}

export function roomsText(r: { single: number; double: number; twin: number; triple: number }) {
  return [r.single && `${r.single} single`, r.double && `${r.double} double`, r.twin && `${r.twin} twin`, r.triple && `${r.triple} triple`].filter(Boolean).join(' · ');
}
