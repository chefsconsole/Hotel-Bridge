import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { PageHeader, Panel, Pill } from '@/components/ui';
import { addStaffAction, updateStaffAction } from '@/app/actions/admin';
import { getDb } from '@/lib/db';
import { formatDate } from '@/lib/domain/dates';
import { requireStaff } from '@/lib/session';
import { ROLE_LABEL, ROLE_SUMMARY, STAFF_ROLES, type StaffRole } from '@/lib/services/actor';
import { listStaff } from '@/lib/services/staff';

export const metadata = { title: 'Team' };

export default async function TeamPage() {
  const { actor } = await requireStaff();
  const isAdmin = actor.platformRole === 'admin';
  const team = await listStaff(await getDb());
  return (
    <>
      <PageHeader eyebrow="Governance" title="HotelBridge team" description="Everyone who works in this console, and what each role can do. Every change is in the audit log; changing someone's access signs them out." />
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {STAFF_ROLES.map((r) => (
          <div key={r} className="rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-[var(--shadow-soft)]">
            <p className="font-medium">{ROLE_LABEL[r]}</p>
            <p className="mt-1.5 text-[0.82rem] leading-relaxed text-muted">{ROLE_SUMMARY[r]}</p>
            <p className="num mt-3 text-[0.75rem] text-faint">{team.filter((t) => t.role === r && t.status === 'active').length} active</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title="People" padded={false}>
          <table className="table">
            <thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Since</th>{isAdmin && <th>Change access</th>}</tr></thead>
            <tbody>{team.map((t) => (
              <tr key={t.id}>
                <td><p className="font-medium">{t.name}{t.id === actor.userId && <span className="ml-1.5 text-[0.75rem] font-normal text-faint">(you)</span>}</p><p className="text-[0.78rem] text-muted">{t.email}</p></td>
                <td>{ROLE_LABEL[t.role as StaffRole] ?? t.role}</td>
                <td><Pill tone={t.status === 'active' ? 'positive' : 'neutral'}>{t.status === 'active' ? 'Active' : 'Disabled'}</Pill></td>
                <td className="num text-[0.85rem]">{formatDate(t.createdAt)}</td>
                {isAdmin && (
                  <td>
                    <ActionForm action={updateStaffAction} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="userId" value={t.id} />
                      <select name="role" defaultValue={t.role ?? 'ops'} className="field !w-auto py-1.5 text-[0.82rem]">{STAFF_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
                      <SubmitButton size="sm" variant="secondary" name="intent" value="role">Save role</SubmitButton>
                      {t.id !== actor.userId && (t.status === 'active'
                        ? <SubmitButton size="sm" variant="ghost" name="intent" value="disable" confirm={`Disable ${t.name}? They are signed out immediately.`}>Disable</SubmitButton>
                        : <SubmitButton size="sm" variant="ghost" name="intent" value="enable">Enable</SubmitButton>)}
                    </ActionForm>
                  </td>
                )}
              </tr>
            ))}</tbody>
          </table>
        </Panel>
        {isAdmin ? (
          <Panel title="Add a team member" description="Share the first password privately; they can change it after signing in.">
            <ActionForm action={addStaffAction} resetOnSuccess className="space-y-3">
              <Field label="Name"><input name="name" className="field" /></Field>
              <Field label="Work email"><input name="email" type="email" className="field" /></Field>
              <Field label="Role"><select name="role" defaultValue="ops" className="field">{STAFF_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></Field>
              <Field label="First password" hint="10+ characters"><input name="password" type="password" autoComplete="new-password" className="field" /></Field>
              <SubmitButton size="sm" pendingLabel="Adding…">Add to team</SubmitButton>
            </ActionForm>
          </Panel>
        ) : <Panel title="Changes"><p className="text-[0.88rem] text-muted">Only admins add people or change access.</p></Panel>}
      </div>
    </>
  );
}
