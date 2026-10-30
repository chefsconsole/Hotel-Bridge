/** An error whose message is safe and useful to show the user. */
export class AppError extends Error {
  constructor(message: string, readonly code: string = 'invalid') { super(message); }
}
export class NotFoundError extends AppError {
  constructor(what = 'Record') { super(`${what} not found`, 'not_found'); }
}
export class ForbiddenError extends AppError {
  constructor(message = 'You do not have access to this') { super(message, 'forbidden'); }
}

export function isUniqueViolation(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === '23505' || err?.cause?.code === '23505';
}
