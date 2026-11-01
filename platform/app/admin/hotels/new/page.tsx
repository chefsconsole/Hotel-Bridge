import { HotelForm } from '@/components/admin-forms';
import { Notice, PageHeader, Panel } from '@/components/ui';
import { createHotelAction } from '@/app/actions/admin';
import { getDb } from '@/lib/db';
import { requireStaff } from '@/lib/session';
import { getProspect } from '@/lib/services/prospects';

export default async function NewHotel({ searchParams }: { searchParams: Promise<{ prospect?: string }> }) {
  await requireStaff();
  const { prospect } = await searchParams;
  const p = prospect ? await getProspect(await getDb(), prospect).catch(() => null) : null;
  // "Hotel Name (City)" in the research list → name and city.
  const m = p?.name.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  const prefill = p ? { prospectId: p.id, name: m ? m[1] : p.name, city: m ? m[2] : '' } : undefined;
  return (
    <>
      <PageHeader eyebrow="Portfolio" title="Add a hotel" description="Starts as a draft. Add room types and a contract, then publish." />
      {p && <div className="mb-6"><Notice title={`From outreach: ${p.name}`}>Creating the hotel links it to the outreach record and marks it signed. Check the name, city and country against the signed agreement.</Notice></div>}
      <Panel><HotelForm action={createHotelAction} submit="Create draft hotel" prefill={prefill} /></Panel>
    </>
  );
}
