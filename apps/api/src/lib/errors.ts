export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(code: string, message: string, details?: unknown) {
    return new ApiError(400, code, message, details);
  }
  static unauthorized(code = 'UNAUTHORIZED', message = 'Unauthorized') {
    return new ApiError(401, code, message);
  }
  static forbidden(code = 'FORBIDDEN', message = 'Forbidden') {
    return new ApiError(403, code, message);
  }
  static notFound(code = 'NOT_FOUND', message = 'Not found') {
    return new ApiError(404, code, message);
  }
  static conflict(code: string, message: string, details?: unknown) {
    return new ApiError(409, code, message, details);
  }
  static gone(code: string, message: string) {
    return new ApiError(410, code, message);
  }
  static tooMany(code = 'RATE_LIMITED', message = 'Too many requests') {
    return new ApiError(429, code, message);
  }
}
