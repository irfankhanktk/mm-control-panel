import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}. Copy .env.example to .env.local and set it.`);
  }
  return value;
}

/**
 * Base URL of the MM API, for example http://localhost:6574 (no trailing slash needed).
 * Set MM_API_BASE_URL per environment; it is read on the server only and never sent to the browser.
 */
export function getMmApiBaseUrl(): string {
  return required("MM_API_BASE_URL").replace(/\/+$/, "");
}
