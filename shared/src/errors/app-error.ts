export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly details?: string[];

  constructor(message: string, statusCode: number, errorCode: string, details?: string[]) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Invalid request parameters', details?: string[]) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

export class InsufficientSeatsError extends AppError {
  constructor(message = 'No hay suficientes cupos disponibles') {
    super(message, 409, 'INSUFFICIENT_SEATS');
  }
}

