// Vercel serverless function — reads an uploaded hotel invoice/confirmation with
// Claude and returns structured fields so the CRM can bill the hotel a commission.
// The ANTHROPIC_API_KEY lives only here (Vercel env var), never in the browser.
//
// Model: defaults to claude-opus-5-5. Set INVOICE_MODEL=claude-haiku-5-5 in Vercel
// env to cut cost ~40x — invoice extraction is a simple task and Haiku handles it well.

const mod = require('@anthropic-ai/sdk');
const Anthropic = mod.default || mod;

const SCHEMA_PROMPT = `You are reading a HOTEL's invoice or booking confirmation. HotelBridge earns a commission from the hotel, billed on the NET room revenue. Extract the facts precisely.

Return ONLY a JSON object — no prose, no markdown fences. Use null for anything the document does not state. NEVER guess or invent a number.

{
  "hotelName": string|null,         // the hotel / billing entity (e.g. "Société Hôtel Gril de Villejuif & Cie")
  "hotelAddress": string|null,
  "hotelEmail": string|null,
  "hotelVat": string|null,          // the hotel's VAT / tax / GST number
  "operatorName": string|null,      // the travel operator / DMC / agency whose group this is (e.g. "Switrus Holidays GmbH")
  "destination": string|null,       // city
  "checkIn": string|null,           // ISO yyyy-mm-dd
  "checkOut": string|null,          // ISO yyyy-mm-dd
  "nights": number|null,
  "rooms": number|null,             // rooms per night at peak (e.g. 28), not room-nights
  "currency": string|null,          // ISO code or symbol, e.g. "EUR" or "€"
  "grossTotal": number|null,        // total payable INCLUDING all taxes (TTC / grand total)
  "cityTax": number|null,           // tourist / city tax total ("taxe de séjour") — a pass-through, NOT commissionable
  "commissionable": number|null,    // room charges INCLUDING VAT, EXCLUDING only the city/tourist tax = grossTotal − cityTax
  "taxPercent": number|null,        // VAT % applied to rooms (e.g. 10)
  "bookingRef": string|null,        // quote / booking file / voucher reference
  "notes": string|null              // anything important you are unsure about
}

How to find "commissionable" (critical — this is the commission base):
- commissionable = the room charges INCLUDING VAT, with ONLY the city/tourist tax removed. In practice: grossTotal (grand total / TOTAL NET A PAYER) MINUS the city/tourist tax ("taxe de séjour", usually shown as "Non Taxable").
- Equivalently, if a VAT table shows a room line "incl. VAT" (TTC) total, commissionable = that TTC room total (do NOT drop the VAT).
- City/tourist tax is NEVER part of commissionable. VAT on the rooms IS part of it.
- "Free of charge" / complimentary lines are already netted into the totals — do not add them back.
- Example: grand total 4633.88, city tax 517.28 → commissionable = 4116.60.
- All amounts are plain numbers: no currency symbols, no thousands separators (e.g. 4116.60).`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({
      error: 'not_configured',
      message: 'AI invoice reading is not set up yet. Add ANTHROPIC_API_KEY in Vercel → Project → Settings → Environment Variables, then redeploy.',
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { dataBase64, mediaType } = body;
    if (!dataBase64) return res.status(400).json({ error: 'no_file', message: 'No file received.' });
    // ~5MB of base64 ≈ 3.7MB file — keep within Vercel's body limit
    if (dataBase64.length > 7_000_000) {
      return res.status(413).json({ error: 'too_large', message: 'File is too large — please upload a file under ~3 MB.' });
    }

    const isPdf = (mediaType || '').includes('pdf');
    const docBlock = isPdf
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: dataBase64 } }
      : { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: dataBase64 } };

    const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

    const msg = await client.messages.create({
      model: process.env.INVOICE_MODEL || 'claude-opus-5-5',
      max_tokens: 2048,
      output_config: { effort: 'low' }, // extraction is simple — keep it fast + cheap
      messages: [{ role: 'user', content: [docBlock, { type: 'text', text: SCHEMA_PROMPT }] }],
    });

    if (msg.stop_reason === 'refusal') {
      return res.status(422).json({ error: 'refused', message: 'The document could not be processed.' });
    }

    const textBlock = (msg.content || []).find((b) => b.type === 'text');
    const raw = textBlock ? textBlock.text : '';
    const match = raw.match(/\{[\s\S]*\}/);
    let data;
    try {
      data = JSON.parse(match ? match[0] : raw);
    } catch {
      return res.status(502).json({ error: 'parse_failed', message: 'Could not read structured data from that document.', raw: raw.slice(0, 500) });
    }

    // Fallback: derive commissionable from grossTotal − cityTax if the model left it null.
    if ((data.commissionable == null || data.commissionable === 0) && data.grossTotal != null) {
      data.commissionable = Math.round(((Number(data.grossTotal) || 0) - (Number(data.cityTax) || 0)) * 100) / 100;
    }
    // Convenience: commission at the standard 8% on the commissionable base.
    const base = Number(data.commissionable) || 0;
    const suggested = Math.round(base * 0.08 * 100) / 100;

    return res.status(200).json({ ok: true, data, suggestedCommission: suggested, model: msg.model });
  } catch (e) {
    const status = (e && e.status) || 500;
    return res.status(status === 401 ? 401 : 500).json({
      error: 'extract_failed',
      message: status === 401 ? 'The Claude API key was rejected — check ANTHROPIC_API_KEY.' : String((e && e.message) || e),
    });
  }
};
