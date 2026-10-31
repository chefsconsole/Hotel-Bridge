/* A KYC document, for HotelBridge staff and the agency that uploaded it.
 * Everyone else gets 404. Served inline with a fixed, sniffed content type. */
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/session';
import { readAgencyDocument } from '@/lib/services/kyc';

export async function GET(_: Request, { params }: { params: Promise<{ docId: string }> }) {
  const session = await getSession();
  if (!session) return new Response('Not found', { status: 404 });
  try {
    const d = await readAgencyDocument(await getDb(), session.actor, (await params).docId);
    return new Response(Buffer.from(d.data), {
      headers: {
        'Content-Type': d.mimeType,
        'Content-Disposition': `inline; filename="${d.fileName.replace(/"/g, '')}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; img-src 'self'; object-src 'self'; sandbox",
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
