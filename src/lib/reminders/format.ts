/**
 * Wording and tones for reminder rows. Only type imports, so the unit tests can load it directly.
 */
import type { ReminderAutoAction, ReminderEvent, ReminderListItem, ReminderResend, ReminderStep } from "@/lib/mm-api/reminder-types";

export type BadgeTone = "prog" | "wait" | "bad" | "ok" | "ended";

export interface Badge {
  tone: BadgeTone;
  label: string;
}

const MS_PER_DAY = 86_400_000;
/** An automatic delete or unpublish this close is shown as urgent. */
export const URGENT_DAYS = 7;

const pad = (value: number) => String(value).padStart(2, "0");

/** dd/MM/yyyy in UTC, like the rest of the panel. */
export function formatDay(iso: string | null | undefined): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`;
}

/** dd/MM/yyyy HH:mm in UTC. */
export function formatDayTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return `${formatDay(iso)} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`;
}

/** Whole UTC calendar days from today to the given moment; negative when it is in the past. */
export function daysFromNow(iso: string, now: number): number {
  const target = new Date(iso);
  const today = new Date(now);
  const targetDay = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  const todayDay = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((targetDay - todayDay) / MS_PER_DAY);
}

export function relativeDays(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

export function actionVerb(type: ReminderAutoAction["type"]): "Deletes" | "Unpublishes" {
  return type === "delete" ? "Deletes" : "Unpublishes";
}

export function reminderBadge(item: ReminderListItem, now: number): Badge {
  switch (item.state) {
    case "readyToPublish":
      return { tone: "ok", label: "Ready to publish" };
    case "autoDeleted":
      return { tone: "ended", label: "Auto-deleted" };
    case "autoUnpublished":
      return { tone: "ended", label: "Auto-unpublished" };
  }

  if (item.delivery.status === "failed") return { tone: "bad", label: "Delivery failed" };

  const { autoAction } = item;
  if (autoAction && !autoAction.isEarliest) {
    const days = daysFromNow(autoAction.at, now);
    if (days <= URGENT_DAYS) return { tone: "bad", label: `${actionVerb(autoAction.type)} ${relativeDays(Math.max(days, 0))}` };
  }

  if (item.state === "allSent") return { tone: "wait", label: `All ${item.remindersTotal} sent, waiting` };
  if (item.remindersSent === 0) return { tone: "prog", label: "No reminder sent yet" };

  const progress = `Reminder ${item.remindersSent} of ${item.remindersTotal} sent`;
  return { tone: "prog", label: item.flow === "published" ? `Inactive, ${progress.toLowerCase()}` : progress };
}

/** Why the Resend button is not available, in words for an admin. Null when it is available. */
export function resendBlockedText(resend: ReminderResend, formatTime: (iso: string) => string): string | null {
  if (resend.allowed) return null;
  switch (resend.reason) {
    case "reminder.alreadyDelivered":
      return "The latest reminder reached at least one editor, so it cannot be resent.";
    case "reminder.noFailedDelivery":
      return "No failed delivery is recorded for the latest reminder, so there is nothing to resend.";
    case "reminder.noEditors":
      return "This masjid has no editor to send the reminder to.";
    case "reminder.resendTooSoon":
      return resend.retryAfter
        ? `The reminder was sent a moment ago. You can resend it after ${formatTime(resend.retryAfter)}.`
        : "The reminder was sent a moment ago. Try again in a few minutes.";
    default:
      return "No reminder has been sent in the current flow.";
  }
}

export function stepTone(step: ReminderStep): "done" | "fail" | "next" | "pending" {
  switch (step.status) {
    case "sent":
      return "done";
    case "failed":
      return "fail";
    case "next":
      return "next";
    default:
      return "pending";
  }
}

export function eventTitle(eventType: string, reminderNumber: number | null): string {
  switch (eventType) {
    case "reminderSent":
      return reminderNumber ? `Reminder ${reminderNumber}` : "Reminder";
    case "readyForPublishNotified":
      return "Admin told the masjid is ready to publish";
    case "autoDeleted":
      return "Masjid deleted automatically";
    case "autoUnpublished":
      return "Masjid unpublished automatically";
    case "cycleReset":
      return "Reminder cycle restarted";
    case "resendRequested":
      return "Resend requested by an admin";
    default:
      return eventType;
  }
}

export interface RecipientResult {
  recipient: string;
  delivered: boolean;
  /** Attempts that failed before the outcome shown (earlier failures of a recipient that was delivered after a retry or a resend). */
  failedAttempts: number;
  /** The last failure reason, shown only when the recipient was not delivered. */
  reason: string | null;
}

/**
 * One result per recipient for the emails of a reminder, oldest event first. A recipient is delivered once any attempt succeeded:
 * an automatic retry or an admin's resend can fix an earlier failure, which must not show up as "not delivered".
 */
export function recipientResults(events: ReminderEvent[]): RecipientResult[] {
  const byRecipient = new Map<string, ReminderEvent[]>();
  for (const event of events) {
    if (!event.recipient) continue;
    const key = event.recipient.toLowerCase();
    byRecipient.set(key, [...(byRecipient.get(key) ?? []), event]);
  }

  return [...byRecipient.values()].map((rows) => {
    const failures = rows.filter((row) => row.outcome === "failed");
    const delivered = rows.some((row) => row.outcome === "succeeded");
    return {
      recipient: rows[0].recipient as string,
      delivered,
      failedAttempts: failures.length,
      reason: !delivered && failures.length > 0 ? failures[failures.length - 1].failureReason : null,
    };
  });
}
