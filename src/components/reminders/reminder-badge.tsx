import { reminderBadge, type BadgeTone } from "@/lib/reminders/format";
import type { ReminderListItem } from "@/lib/mm-api/reminder-types";

export const BADGE_CLASSES: Record<BadgeTone, string> = {
  prog: "bg-amber-100 text-amber-900",
  wait: "bg-orange-100 text-orange-900",
  bad: "bg-danger-soft text-danger",
  ok: "bg-teal/15 text-emerald-900",
  ended: "bg-ink text-white",
};

export function ReminderBadge({ item, now }: { item: ReminderListItem; now: number }) {
  const badge = reminderBadge(item, now);
  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${BADGE_CLASSES[badge.tone]}`}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {badge.label}
    </span>
  );
}

/** One dot per reminder, plus a square for the automatic action. The text next to it carries the same facts. */
export function ProgressDots({ item }: { item: ReminderListItem }) {
  const dots = Array.from({ length: item.remindersTotal }, (_, index) => {
    const number = index + 1;
    if (number <= item.remindersSent) return item.delivery.status === "failed" && number === item.remindersSent ? "bg-danger" : "bg-teal";
    return number === item.remindersSent + 1 && item.nextReminderAt ? "border-2 border-sun bg-white" : "bg-line";
  });

  return (
    <span aria-hidden="true" className="flex items-center gap-1">
      {dots.map((classes, index) => (
        <span key={index} className={`size-2.5 rounded-full ${classes}`} />
      ))}
      {item.autoAction ? <span className="ml-1 size-2.5 rounded-sm bg-line" /> : null}
    </span>
  );
}
