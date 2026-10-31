import { eq } from 'drizzle-orm';
import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { DL, PageHeader, Panel, Pill } from '@/components/ui';
import { addTeamMemberAction, changePasswordAction, taxIdsAction, uploadKycAction } from '@/app/actions/agent';
import { KycPanel } from '@/components/kyc-panel';
import { kycStatus } from '@/lib/services/kyc';
import { brandingAction } from '@/app/actions/trips';
import { getDb, schema } from '@/lib/db';
import { formatDate } from '@/lib/domain/dates';
import { requireAgent } from '@/lib/session';

export const metadata = { title: 'Agency profile' };

export default async function ProfilePage() {
  const { agency, actor } = await requireAgent();
  const db = await getDb();
  const team = await db.select().from(schema.users).where(eq(schema.users.agencyId, agency.id));
  const k = await kycStatus(db, agency);
  return (
    <>
      <PageHeader eyebrow="Account" title={agency.name} description="To change registered details, contact HotelBridge — they are part of your verification." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Agency details" actions={<Pill tone={agency.status === 'verified' ? 'positive' : 'pending'}>{agency.status === 'verified' ? 'Verified' : agency.status}</Pill>}>
          <DL items={[['Legal name', agency.legalName], ['PAN', agency.pan], ['GSTIN', agency.gstin], ['Country', agency.country], ['City', agency.city], ['Tax / registration', agency.taxId], ['Website', agency.website], ['Phone', agency.phone], ['Billing currency', agency.billingCurrency], ['Verified on', agency.verifiedAt ? formatDate(agency.verifiedAt) : null]]} />
        </Panel>
        <div id="kyc" className="scroll-mt-6">
          <KycPanel k={k} uploadAction={uploadKycAction} taxAction={taxIdsAction} editableTax={agency.status !== 'verified' && actor.agencyRole === 'owner'}
            title={agency.status === 'verified' ? 'Verification documents' : 'Get verified to start booking'} />
        </div>
        <Panel title="Team" padded={false}>
          <ul className="divide-y divide-line">
            {team.map((u) => (
              <li key={u.id} className="flex items-center justify-between px-5 py-3"><div><p className="font-medium">{u.name}</p><p className="text-[0.8rem] text-muted">{u.email}</p></div><span className="text-[0.8rem] text-muted capitalize">{u.agencyRole}</span></li>
            ))}
          </ul>
          {actor.agencyRole === 'owner' && (
            <ActionForm action={addTeamMemberAction} resetOnSuccess className="border-t border-line p-5">
              <p className="mb-3 text-[0.9rem] font-semibold">Add a team member</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name"><input name="name" className="field" /></Field>
                <Field label="Email"><input name="email" type="email" className="field" /></Field>
                <Field label="First password" hint="10+ characters; share privately"><input name="password" type="password" className="field" autoComplete="new-password" /></Field>
                <Field label="Role"><select name="role" className="field"><option value="agent">Agent — search and book</option><option value="owner">Owner — also manages team</option></select></Field>
              </div>
              <SubmitButton size="sm" className="mt-4">Add member</SubmitButton>
            </ActionForm>
          )}
        </Panel>
        <div id="branding" className="lg:col-span-2 scroll-mt-6">
          <Panel title="Your brand on client documents" description="Trip plans, PDFs and reminders your clients receive carry these details — never HotelBridge's name.">
            <ActionForm action={brandingAction} className="grid gap-4 sm:grid-cols-2">
              <Field label="Name clients see" hint={`Leave empty to use “${agency.name}”`}><input name="brandName" defaultValue={agency.brandName ?? ''} className="field" /></Field>
              <Field label="Logo link" hint="An https:// link to your logo image (PNG or SVG)"><input name="logoUrl" defaultValue={agency.logoUrl ?? ''} className="field" placeholder="https://…/logo.png" /></Field>
              <Field label="WhatsApp / phone for clients"><input name="brandPhone" defaultValue={agency.brandPhone ?? ''} className="field" inputMode="tel" /></Field>
              <Field label="Email for clients"><input name="brandEmail" type="email" defaultValue={agency.brandEmail ?? ''} className="field" /></Field>
              <Field label="Footer" hint="Address, GST number, licence, payment details — printed at the bottom" className="sm:col-span-2"><textarea name="brandFooter" defaultValue={agency.brandFooter ?? ''} rows={3} className="field" /></Field>
              <div className="sm:col-span-2"><SubmitButton size="sm" pendingLabel="Saving…">Save brand</SubmitButton></div>
            </ActionForm>
          </Panel>
        </div>
        <Panel title="Change password" description="You will be signed out everywhere.">
          <ActionForm action={changePasswordAction} className="grid gap-3 sm:grid-cols-2">
            <Field label="Current password"><input name="current" type="password" className="field" autoComplete="current-password" /></Field>
            <Field label="New password"><input name="next" type="password" className="field" autoComplete="new-password" /></Field>
            <div><SubmitButton size="sm" variant="secondary">Change password</SubmitButton></div>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}
