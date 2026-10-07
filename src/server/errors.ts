// Error with an HTTP status, usable by the scripts too (no Next.js imports here). http.ts turns it into the API response.
export class AppError extends Error {
  constructor(public status: number, public code: string, message: string, public extra?: Record<string, unknown>) { super(message); }
}
export const notFound = () => new AppError(404, 'not_found', 'Not found'); // same answer whether missing or forbidden
