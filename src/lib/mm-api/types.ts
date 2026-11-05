/**
 * Shapes of the MM API v1 account endpoints (Teo.My-Masjid). v1 always answers HTTP 200 and reports
 * the outcome in the body (`hasError` + `statusCode`), serialized in camelCase.
 */

export interface ApiEnvelope {
  hasError: boolean;
  message?: string | null;
  /** HTTP status the call would have had, as a number (e.g. 401) or its name. */
  statusCode: number | string;
}

export interface UserEnvelope<T> extends ApiEnvelope {
  model: T | null;
  requiresTwoFactor?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface LoginResponse {
  /** Already prefixed with "Bearer ". */
  accessToken: string;
  refreshToken: string;
  userRole: string;
  userName: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  masjidId: number | null;
  masjidName: string | null;
  organizationId: number | null;
  organizationName: string | null;
  phoneNumber: string | null;
}
