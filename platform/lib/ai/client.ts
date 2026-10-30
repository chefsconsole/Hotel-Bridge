/* ------------------------------------------------------------------ *
 * The one door to Claude. Every AI feature goes through here so that
 *  - nothing runs without a configured key (features say "not connected"),
 *  - each user has an hourly limit and every call is recorded,
 *  - refusals and API failures become plain, safe messages.
 *
 * AI never writes to the database directly: it drafts, extracts or explains,
 * and a person reviews the result before anything is saved.
 * ------------------------------------------------------------------ */
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { z } from 'zod/v4';
import { and, eq, gt, sql } from 'drizzle-orm';
import { schema, type DB } from '@/lib/db';
import { AppError } from '@/lib/services/errors';
import type { Actor } from '@/lib/services/actor';

export const AI_MODEL = 'claude-opus-5-5';
const HOURLY_LIMIT = Number(process.env.HB_AI_HOURLY_LIMIT) || 40;
// Server-side fallback: if a request is declined, the API retries it on a suitable model.
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

export function aiConfigured(): boolean {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!aiConfigured()) throw new AppError('AI is not connected yet. Add ANTHROPIC_API_KEY to the server environment to turn it on.', 'ai_off');
  client ??= new Anthropic({ timeout: 90_000, maxRetries: 2 });
  return client;
}

async function checkLimit(db: DB, actor: Actor) {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.aiUsage)
    .where(and(eq(schema.aiUsage.userId, actor.userId), gt(schema.aiUsage.createdAt, sql`now() - interval '1 hour'`)));
  if (n >= HOURLY_LIMIT) throw new AppError(`You've reached the AI limit of ${HOURLY_LIMIT} requests an hour. Try again shortly.`, 'rate_limited');
}

async function record(db: DB, actor: Actor, tool: string, ok: boolean, usage?: { input_tokens?: number | null; output_tokens?: number | null }) {
  await db.insert(schema.aiUsage).values({
    userId: actor.userId, tool, ok, inputTokens: usage?.input_tokens ?? 0, outputTokens: usage?.output_tokens ?? 0,
  }).catch(() => undefined);
}

function friendly(e: unknown): AppError {
  if (e instanceof AppError) return e;
  if (e instanceof Anthropic.RateLimitError) return new AppError('The AI service is busy. Please try again in a minute.', 'ai_busy');
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) return new AppError('The AI key was rejected. An administrator needs to check ANTHROPIC_API_KEY.', 'ai_auth');
  if (e instanceof Anthropic.APIConnectionError) return new AppError('Could not reach the AI service. Check the connection and try again.', 'ai_network');
  if (e instanceof Anthropic.APIError) return new AppError('The AI service returned an error. Nothing was changed — please try again.', 'ai_error');
  console.error('[ai]', e);
  return new AppError('Something went wrong with the AI request. Nothing was changed.', 'ai_error');
}

type Effort = 'low' | 'medium' | 'high';

/** Structured extraction: returns data matching `format`, or throws a friendly AppError. */
export async function extract<S extends z.ZodType>(db: DB, actor: Actor, tool: string, args: {
  system: string; user: string; format: S; effort?: Effort; maxTokens?: number;
}): Promise<z.infer<S>> {
  const c = getClient();
  await checkLimit(db, actor);
  try {
    const res = await c.beta.messages.parse({
      model: AI_MODEL,
      max_tokens: args.maxTokens ?? 8000,
      betas: [FALLBACK_BETA],
      fallbacks: 'default',
      system: args.system,
      messages: [{ role: 'user', content: args.user }],
      output_config: { effort: args.effort ?? 'low', format: betaZodOutputFormat(args.format) },
    });
    await record(db, actor, tool, res.stop_reason !== 'refusal', res.usage);
    if (res.stop_reason === 'refusal') throw new AppError('The AI declined this request. Please rephrase it or do it manually.', 'ai_refusal');
    if (res.stop_reason === 'max_tokens' || !res.parsed_output) throw new AppError('The AI could not finish reading this. Try a shorter text.', 'ai_incomplete');
    return res.parsed_output as z.infer<S>;
  } catch (e) {
    if (!(e instanceof AppError)) await record(db, actor, tool, false);
    throw friendly(e);
  }
}

/** Free text (drafting, explaining). */
export async function write(db: DB, actor: Actor, tool: string, args: { system: string; user: string; effort?: Effort; maxTokens?: number }): Promise<string> {
  const c = getClient();
  await checkLimit(db, actor);
  try {
    const res = await c.beta.messages.create({
      model: AI_MODEL,
      max_tokens: args.maxTokens ?? 4000,
      betas: [FALLBACK_BETA],
      fallbacks: 'default',
      system: args.system,
      messages: [{ role: 'user', content: args.user }],
      output_config: { effort: args.effort ?? 'medium' },
    });
    await record(db, actor, tool, res.stop_reason !== 'refusal', res.usage);
    if (res.stop_reason === 'refusal') throw new AppError('The AI declined this request. Please rephrase it.', 'ai_refusal');
    const text = res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('\n').trim();
    if (!text) throw new AppError('The AI returned an empty answer. Please try again.', 'ai_incomplete');
    return text;
  } catch (e) {
    if (!(e instanceof AppError)) await record(db, actor, tool, false);
    throw friendly(e);
  }
}
