export interface LoginFormState {
  /** Values to put back in the form after a failed attempt (never the password). */
  fields?: { email: string; rememberMe: boolean };
  errors?: { email?: string; password?: string };
  /** A problem with the attempt as a whole (wrong password, locked account, API down). */
  message?: string;
}
