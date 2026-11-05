/** Shapes of the MM API v2 masjid-reminders endpoints (camelCase JSON). Errors are RFC 9457 problem details. */

import type { MasjidEditors, Pager } from "./masjid-types";

export type ReminderFlow = "unpublished" | "published";
export type ReminderState = "reminding" | "allSent" | "readyToPublish" | "autoDeleted" | "autoUnpublished";
export type ReminderDeliveryStatus = "unknown" | "delivered" | "partial" | "failed";
export type AutoActionType = "delete" | "unpublish";
export type ReminderStepStatus = "sent" | "failed" | "next" | "pending";
export type ReminderEventType =
  | "reminderSent"
  | "readyForPublishNotified"
  | "autoDeleted"
  | "autoUnpublished"
  | "cycleReset"
  | "resendRequested";
export type ReminderEventOutcome = "succeeded" | "failed";

export interface ReminderAutoAction {
  type: AutoActionType;
  at: string;
  /** A projection that assumes the remaining reminders go out on schedule. */
  isEarliest: boolean;
  /** The latest reminder reached no editor, so the job will not act until it is delivered. */
  isOnHold: boolean;
}

export interface ReminderDelivery {
  status: ReminderDeliveryStatus;
  succeeded: number;
  failed: number;
}

export interface ReminderResend {
  allowed: boolean;
  /** Error code the resend would fail with, for example "reminder.resendTooSoon". */
  reason: string | null;
  /** Only with reminder.resendTooSoon. */
  retryAfter: string | null;
}

export interface ReminderListItem {
  masjidId: number;
  masjidName: string;
  city: string;
  flow: ReminderFlow;
  state: ReminderState;
  remindersSent: number;
  remindersTotal: number;
  lastSentAt: string | null;
  nextReminderAt: string | null;
  autoAction: ReminderAutoAction | null;
  /** When the masjid became ready to publish, was auto-deleted or was auto-unpublished. */
  stateAt: string | null;
  editors: MasjidEditors;
  delivery: ReminderDelivery;
  resend: ReminderResend;
}

export interface ReminderListResponse {
  data: ReminderListItem[];
  pager: Pager;
}

export interface ReminderSummary {
  inFlow: number;
  dueThisWeek: number;
  autoActionWithin7Days: number;
  deliveryFailed: number;
  readyToPublish: number;
  ended: number;
}

export interface ReminderStep {
  number: number;
  status: ReminderStepStatus;
  at: string | null;
}

export interface ReminderEditor {
  email: string;
  isActivated: boolean;
  lastLoginAt: string | null;
}

export interface ReminderDetail {
  reminder: ReminderListItem;
  cycleId: string | null;
  startedAt: string | null;
  steps: ReminderStep[];
  editors: ReminderEditor[];
}

export interface ReminderEvent {
  id: string;
  at: string;
  cycleId: string;
  flow: ReminderFlow;
  eventType: ReminderEventType;
  reminderNumber: number | null;
  recipient: string | null;
  outcome: ReminderEventOutcome;
  failureReason: string | null;
  triggeredByUserId: number | null;
}

export interface ReminderEventListResponse {
  data: ReminderEvent[];
  pager: Pager;
}

export interface ReminderSettings {
  unpublished: { reminderDays: number[]; deleteAfterDays: number };
  /** reachableReminders is lower than reminderDays.length when the gaps add up to more than the unpublish date allows. */
  published: { inactiveMonths: number; reminderDays: number[]; unpublishAfterDays: number; reachableReminders: number };
  resendCooldownMinutes: number;
}

export interface ResendResponse {
  reminderNumber: number;
  recipients: number;
}
