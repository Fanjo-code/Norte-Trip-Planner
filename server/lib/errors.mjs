export class AppError extends Error {
  constructor(code, stage, message, { status = 502, retryable = true, cause } = {}) {
    super(message, { cause });
    this.name = 'AppError';
    this.code = code;
    this.stage = stage;
    this.status = status;
    this.retryable = retryable;
  }
}

export function publicError(error, requestId) {
  const known = error instanceof AppError;
  return {
    status: known ? error.status : 502,
    body: {
      error: {
        code: known ? error.code : 'UPSTREAM_UNAVAILABLE',
        stage: known ? error.stage : 'landmarks',
        message: known ? error.message : 'The travel data service is temporarily unavailable.',
        retryable: known ? error.retryable : true,
        requestId,
      },
    },
  };
}
