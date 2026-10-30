import { HotelForm } from '@/components/admin-forms';
import { PageHeader, Panel } from '@/components/ui';
import { createHotelAction } from '@/app/actions/admin';
import { requireStaff } from '@/lib/session';

export default async function NewHotel() {
  await requireStaff();
  return (
    <>
      <PageHeader eyebrow="Portfolio" title="Add a hotel" description="Starts as a draft. Add room types and a contract, then publish." />
      <Panel><HotelForm action={createHotelAction} submit="Create draft hotel" /></Panel>
    </>
  );
}
