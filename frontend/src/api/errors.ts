import type { ApiErrorKind } from '../domain/types'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly retryAfterMs?: number

  constructor(kind: ApiErrorKind, message: string, retryAfterMs?: number) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    if (retryAfterMs !== undefined) this.retryAfterMs = retryAfterMs
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError
}
