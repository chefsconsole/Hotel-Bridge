/* The verification checklist, documents and upload form — shared by the
 * agency's profile and the staff approval screen. */
import { ActionForm, Field, SubmitButton } from './forms';
import { Panel, Pill, cx } from './ui';
import type { ActionResult } from '@/lib/action';
import { formatDateTime } from '@/lib/domain/dates';
import { DOCUMENT_KINDS, type KycStatus } from '@/lib/services/kyc';

type Action = (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;

function Check({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className={cx('mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-bold', ok ? 'bg-positive-bg text-positive' : 'bg-attention-bg text-attention')}>{ok ? '✓' : '!'}</span>
      <span>{children}</span>
    </li>
  );
}

export function KycPanel({ k, uploadAction, taxAction, agencyId, editableTax, title = 'Verification (KYC)' }: {
  k: KycStatus; uploadAction: Action; taxAction?: Action; agencyId?: string; editableTax: boolean; title?: string;
}) {
  return (
    <Panel title={title} actions={<Pill tone={k.ready ? 'positive' : 'attention'}>{k.ready ? 'Complete' : `${k.missing.length} missing`}</Pill>}
      description={k.required ? 'Indian agencies: PAN and a PAN card are required; GSTIN and certificate if GST-registered.' : 'A business registration or trade licence.'}>
      <ul className="space-y-2 text-[0.9rem]">
        {k.required && <Check ok={k.pan.valid}>PAN {k.pan.value ? <span className="num font-medium">{k.pan.value}</span> : <span className="text-muted">not given</span>}{k.pan.value && !k.pan.valid && <span className="text-negative"> — not a valid PAN</span>}</Check>}
        {k.required && <Check ok={k.hasPanCard}>PAN card {k.hasPanCard ? 'uploaded' : <span className="text-muted">not uploaded</span>}</Check>}
        {k.gstin.value ? (
          <Check ok={k.gstin.valid && k.gstin.matchesPan !== false && k.hasGstCertificate}>
            GSTIN <span className="num font-medium">{k.gstin.value}</span>
            {k.gstin.valid ? <span className="text-muted"> · {k.gstin.state ?? 'state unknown'}</span> : <span className="text-negative"> — not valid</span>}
            {k.gstin.matchesPan === false && <span className="text-negative"> · different PAN</span>}
            {!k.hasGstCertificate && <span className="text-muted"> · certificate not uploaded</span>}
          </Check>
        ) : k.required ? <li className="pl-7.5 text-[0.85rem] text-muted">No GSTIN — fine for agencies not registered for GST.</li> : null}
      </ul>

      {k.documents.length > 0 && (
        <ul className="mt-5 divide-y divide-line rounded-[var(--radius-sm)] border border-line text-[0.86rem]">
          {k.documents.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
              <span><span className="font-medium">{DOCUMENT_KINDS[d.kind as keyof typeof DOCUMENT_KINDS] ?? d.kind}</span> <span className="text-muted">· {d.fileName} · {Math.ceil(d.sizeBytes / 1024)} KB · {formatDateTime(d.createdAt)}</span></span>
              <a href={`/documents/${d.id}`} target="_blank" rel="noreferrer" className="font-medium underline underline-offset-4">View</a>
            </li>
          ))}
        </ul>
      )}

      {editableTax && taxAction && (
        <ActionForm action={taxAction} className="mt-5 grid gap-3 border-t border-line pt-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          {agencyId && <input type="hidden" name="agencyId" value={agencyId} />}
          <Field label="PAN"><input name="pan" defaultValue={k.pan.value ?? ''} maxLength={10} className="field num uppercase" placeholder="ABCDE1234F" /></Field>
          <Field label="GSTIN"><input name="gstin" defaultValue={k.gstin.value ?? ''} maxLength={15} className="field num uppercase" /></Field>
          <SubmitButton size="sm" variant="secondary" pendingLabel="Saving…" className="h-[2.9rem]">Save</SubmitButton>
        </ActionForm>
      )}

      <ActionForm action={uploadAction} resetOnSuccess className="mt-5 grid gap-3 border-t border-line pt-5 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
        {agencyId && <input type="hidden" name="agencyId" value={agencyId} />}
        <Field label="Document"><select name="kind" className="field" defaultValue={k.required && !k.hasPanCard ? 'pan_card' : 'gst_certificate'}>{Object.entries(DOCUMENT_KINDS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        <Field label="File" hint="PDF, JPG or PNG · max 4 MB"><input name="document" type="file" accept="application/pdf,image/jpeg,image/png" className="field file:mr-3 file:rounded-full file:border-0 file:bg-mist file:px-3 file:py-1 file:text-[0.8rem]" /></Field>
        <SubmitButton size="sm" pendingLabel="Uploading…" className="h-[2.9rem] sm:mb-[1.35rem]">Upload</SubmitButton>
      </ActionForm>
    </Panel>
  );
}
