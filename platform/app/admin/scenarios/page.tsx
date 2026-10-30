import { ScenarioModel } from '@/components/scenario-model';
import { Notice, PageHeader } from '@/components/ui';
import { requireStaff } from '@/lib/session';

export const metadata = { title: 'Scenario model' };

export default async function Scenarios() {
  await requireStaff();
  return (
    <>
      <PageHeader eyebrow="Founder tools" title="Scenario model" description="Test what the business model implies at different scales. Change any assumption; nothing here is stored or reported as performance." />
      <div className="mb-6"><Notice tone="warning" title="These are assumptions you type in">Gross booking value is not revenue. Net revenue is what HotelBridge keeps; contribution is after variable costs; operating profit also needs fixed costs.</Notice></div>
      <ScenarioModel currency="EUR" />
    </>
  );
}
