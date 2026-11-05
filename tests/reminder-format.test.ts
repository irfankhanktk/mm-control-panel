import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  actionVerb,
  daysFromNow,
  eventTitle,
  formatDay,
  formatDayTime,
  relativeDays,
  recipientResults,
  reminderBadge,
  resendBlockedText,
  stepTone,
} from "../src/lib/reminders/format.ts";
import type { ReminderEvent, ReminderListItem } from "../src/lib/mm-api/reminder-types.ts";

const NOW = Date.UTC(2026, 9, 27, 12, 0, 0);
const day = (month: number, date: number) => new Date(Date.UTC(2026, month - 1, date, 8, 30)).toISOString();

function item(patch: Partial<ReminderListItem> = {}): ReminderListItem {
  return {
    masjidId: 1,
    masjidName: "Al-Noor Masjid",
    city: "Lahore",
    flow: "unpublished",
    state: "reminding",
    remindersSent: 2,
    remindersTotal: 3,
    lastSentAt: day(10, 6),
    nextReminderAt: day(11, 5),
    autoAction: { type: "delete", at: day(12, 5), isEarliest: true, isOnHold: false },
    stateAt: null,
    editors: { total: 1, activated: 1, lastLoginAt: null },
    delivery: { status: "delivered", succeeded: 1, failed: 0 },
    resend: { allowed: false, reason: "reminder.alreadyDelivered", retryAfter: null },
    ...patch,
  };
}

describe("dates", () => {
  it("counts whole UTC days regardless of the time of day", () => {
    assert.equal(daysFromNow(day(10, 27), NOW), 0);
    assert.equal(daysFromNow(day(10, 28), NOW), 1);
    assert.equal(daysFromNow(day(10, 24), NOW), -3);
    assert.equal(daysFromNow(day(12, 5), NOW), 39);
  });

  it("words relative days", () => {
    assert.equal(relativeDays(0), "today");
    assert.equal(relativeDays(1), "tomorrow");
    assert.equal(relativeDays(-1), "yesterday");
    assert.equal(relativeDays(5), "in 5 days");
    assert.equal(relativeDays(-5), "5 days ago");
  });

  it("formats dd/MM/yyyy in UTC and tolerates missing or bad values", () => {
    assert.equal(formatDay(day(10, 6)), "06/10/2026");
    assert.equal(formatDayTime(day(10, 6)), "06/10/2026 08:30 UTC");
    assert.equal(formatDay(null), "-");
    assert.equal(formatDay("not a date"), "-");
    assert.equal(formatDayTime(undefined), "-");
  });
});

describe("reminderBadge", () => {
  it("shows progress while reminders are going out", () => {
    assert.deepEqual(reminderBadge(item(), NOW), { tone: "prog", label: "Reminder 2 of 3 sent" });
    assert.deepEqual(reminderBadge(item({ flow: "published" }), NOW), { tone: "prog", label: "Inactive, reminder 2 of 3 sent" });
    assert.deepEqual(reminderBadge(item({ remindersSent: 0, lastSentAt: null }), NOW), { tone: "prog", label: "No reminder sent yet" });
  });

  it("waits quietly after the last reminder while the action is far away", () => {
    const waiting = item({ state: "allSent", remindersSent: 3, nextReminderAt: null, autoAction: { type: "delete", at: day(12, 5), isEarliest: false, isOnHold: false } });

    assert.deepEqual(reminderBadge(waiting, NOW), { tone: "wait", label: "All 3 sent, waiting" });
  });

  it("turns urgent when a firm delete or unpublish is within a week", () => {
    const soon = item({ state: "allSent", remindersSent: 3, nextReminderAt: null, autoAction: { type: "delete", at: day(10, 30), isEarliest: false, isOnHold: false } });
    const tomorrow = item({ flow: "published", autoAction: { type: "unpublish", at: day(10, 28), isEarliest: false, isOnHold: false } });

    assert.deepEqual(reminderBadge(soon, NOW), { tone: "bad", label: "Deletes in 3 days" });
    assert.deepEqual(reminderBadge(tomorrow, NOW), { tone: "bad", label: "Unpublishes tomorrow" });
  });

  it("does not call a projected (earliest) action urgent", () => {
    const projected = item({ autoAction: { type: "delete", at: day(10, 30), isEarliest: true, isOnHold: false } });

    assert.equal(reminderBadge(projected, NOW).tone, "prog");
  });

  it("puts a failed delivery before anything else that is still running", () => {
    const failed = item({ delivery: { status: "failed", succeeded: 0, failed: 2 }, autoAction: { type: "delete", at: day(10, 28), isEarliest: false, isOnHold: true } });

    assert.deepEqual(reminderBadge(failed, NOW), { tone: "bad", label: "Delivery failed" });
  });

  it("names the end states", () => {
    assert.deepEqual(reminderBadge(item({ state: "readyToPublish" }), NOW), { tone: "ok", label: "Ready to publish" });
    assert.deepEqual(reminderBadge(item({ state: "autoDeleted" }), NOW), { tone: "ended", label: "Auto-deleted" });
    assert.deepEqual(reminderBadge(item({ state: "autoUnpublished" }), NOW), { tone: "ended", label: "Auto-unpublished" });
  });
});

describe("resendBlockedText", () => {
  const time = (iso: string) => formatDayTime(iso);

  it("is null when resending is allowed", () => {
    assert.equal(resendBlockedText({ allowed: true, reason: null, retryAfter: null }, time), null);
  });

  it("explains each refusal", () => {
    assert.match(resendBlockedText({ allowed: false, reason: "reminder.alreadyDelivered", retryAfter: null }, time)!, /reached at least one editor/);
    assert.match(resendBlockedText({ allowed: false, reason: "reminder.noFailedDelivery", retryAfter: null }, time)!, /nothing to resend/);
    assert.match(resendBlockedText({ allowed: false, reason: "reminder.noEditors", retryAfter: null }, time)!, /no editor/);
    assert.match(resendBlockedText({ allowed: false, reason: "reminder.notSent", retryAfter: null }, time)!, /No reminder has been sent/);
  });

  it("tells when the cooldown ends", () => {
    const text = resendBlockedText({ allowed: false, reason: "reminder.resendTooSoon", retryAfter: day(10, 27) }, time);

    assert.match(text!, /after 27\/10\/2026 08:30 UTC/);
  });
});

describe("small helpers", () => {
  it("words the action", () => {
    assert.equal(actionVerb("delete"), "Deletes");
    assert.equal(actionVerb("unpublish"), "Unpublishes");
  });

  it("maps step statuses to tones", () => {
    assert.equal(stepTone({ number: 1, status: "sent", at: null }), "done");
    assert.equal(stepTone({ number: 1, status: "failed", at: null }), "fail");
    assert.equal(stepTone({ number: 1, status: "next", at: null }), "next");
    assert.equal(stepTone({ number: 1, status: "pending", at: null }), "pending");
  });

  it("titles events", () => {
    assert.equal(eventTitle("reminderSent", 2), "Reminder 2");
    assert.equal(eventTitle("cycleReset", null), "Reminder cycle restarted");
    assert.equal(eventTitle("autoDeleted", null), "Masjid deleted automatically");
    assert.equal(eventTitle("somethingNew", null), "somethingNew");
  });
});

describe("recipientResults", () => {
  const email = (id: string, recipient: string | null, outcome: "succeeded" | "failed", at: string, failureReason: string | null = null): ReminderEvent => ({
    id,
    at,
    cycleId: "c1",
    flow: "unpublished",
    eventType: "reminderSent",
    reminderNumber: 2,
    recipient,
    outcome,
    failureReason,
    triggeredByUserId: null,
  });

  it("shows a recipient as delivered when a retry succeeded after a failure", () => {
    const results = recipientResults([
      email("1", "Obaidtest27@yopmail.com", "failed", day(10, 28), "We were unable to send your email at this time."),
      email("2", "Obaidtest27@yopmail.com", "succeeded", day(10, 28)),
    ]);

    assert.deepEqual(results, [{ recipient: "Obaidtest27@yopmail.com", delivered: true, failedAttempts: 1, reason: null }]);
  });

  it("keeps the last failure reason for a recipient that was never delivered", () => {
    const results = recipientResults([
      email("1", "a@example.com", "failed", day(10, 28), "mailbox full"),
      email("2", "a@example.com", "failed", day(10, 29), "address rejected"),
    ]);

    assert.deepEqual(results, [{ recipient: "a@example.com", delivered: false, failedAttempts: 2, reason: "address rejected" }]);
  });

  it("gives each recipient their own result, matching addresses without regard to case", () => {
    const results = recipientResults([
      email("1", "A@Example.com", "succeeded", day(10, 28)),
      email("2", "b@example.com", "failed", day(10, 28), "mailbox full"),
      email("3", "a@example.com", "failed", day(10, 27), "timeout"),
    ]);

    assert.deepEqual(
      results.map((r) => [r.recipient, r.delivered, r.failedAttempts]),
      [["A@Example.com", true, 1], ["b@example.com", false, 1]],
    );
  });

  it("ignores events without a recipient", () => {
    assert.deepEqual(recipientResults([email("1", null, "succeeded", day(10, 28))]), []);
  });

  it("titles a resend request", () => {
    assert.equal(eventTitle("resendRequested", 2), "Resend requested by an admin");
  });
});
