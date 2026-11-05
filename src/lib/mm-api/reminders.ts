import "server-only";
import { toApiQuery, type ReminderFilters } from "@/lib/reminders/filters";
import type {
  ReminderDetail,
  ReminderEventListResponse,
  ReminderListResponse,
  ReminderSettings,
  ReminderSummary,
  ResendResponse,
} from "./reminder-types";
import { authorized, readJson, readProblem } from "./request";

export { MmApiError } from "./request";

export interface ReminderListResult extends ReminderListResponse {
  /** When the page was fetched (ms since epoch); "due in N days" is measured against it. */
  fetchedAt: number;
}

/** GET /api/v2/masjid-reminders */
export async function listReminders(filters: ReminderFilters): Promise<ReminderListResult> {
  const page = await readJson<ReminderListResponse>(await authorized("/api/v2/masjid-reminders", { searchParams: toApiQuery(filters) }));
  return { ...page, fetchedAt: Date.now() };
}

/** GET /api/v2/masjid-reminders/summary */
export async function getReminderSummary(): Promise<ReminderSummary> {
  return readJson(await authorized("/api/v2/masjid-reminders/summary"));
}

/** GET /api/v2/masjid-reminders/settings */
export async function getReminderSettings(): Promise<ReminderSettings> {
  return readJson(await authorized("/api/v2/masjid-reminders/settings"));
}

export interface ReminderDetailResult extends ReminderDetail {
  /** When the detail was fetched (ms since epoch); "due in N days" is measured against it. */
  fetchedAt: number;
}

/** GET /api/v2/masjid-reminders/{masjidId}; null when the masjid has no reminders. */
export async function getReminderDetail(masjidId: number): Promise<ReminderDetailResult | null> {
  const response = await authorized(`/api/v2/masjid-reminders/${masjidId}`);
  if (response.status === 404) return null;
  return { ...(await readJson<ReminderDetail>(response)), fetchedAt: Date.now() };
}

/** GET /api/v2/masjid-reminders/{masjidId}/events, newest first. */
export async function listReminderEvents(masjidId: number, pageSize = 100): Promise<ReminderEventListResponse> {
  return readJson(await authorized(`/api/v2/masjid-reminders/${masjidId}/events`, { searchParams: { pageNumber: 1, pageSize } }));
}

export type ResendResult = { ok: true; response: ResendResponse } | { ok: false; message: string; code: string | null };

/** POST /api/v2/masjid-reminders/{masjidId}/resend (202 when the emails were queued). */
export async function resendReminder(masjidId: number): Promise<ResendResult> {
  const response = await authorized(`/api/v2/masjid-reminders/${masjidId}/resend`, { method: "POST" });
  if (response.ok) return { ok: true, response: (await response.json()) as ResendResponse };

  const problem = await readProblem(response);
  return { ok: false, message: problem?.detail ?? "The reminder could not be resent.", code: problem?.code ?? null };
}
