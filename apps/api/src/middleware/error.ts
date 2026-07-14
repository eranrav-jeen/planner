import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export class ApiError extends Error {
  status: number;
  fields?: Record<string, string>;

  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { message: 'Not found' } });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
      fields[issue.path.join('.') || '_'] = issue.message;
    }
    return res.status(422).json({ error: { message: 'Validation failed', fields } });
  }

  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: { message: err.message, fields: err.fields } });
  }

  console.error(err);
  return res.status(500).json({ error: { message: 'Internal server error' } });
}
