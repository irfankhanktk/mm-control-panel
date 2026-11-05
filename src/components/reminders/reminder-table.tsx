import Link from "next/link";
import { detailHref } from "@/lib/reminders/filters";
import { daysFromNow, formatDay, relativeDays, URGENT_DAYS } from "@/lib/reminders/format";
import type { ReminderListItem } from "@/lib/mm-api/reminder-types";
import { ProgressDots, ReminderBadge } from "./reminder-badge";

const headerClass = "px-2.5 py-3.5 font-medium";

function DateCell({ iso, now, note, hot }: { iso: string | null; now: number; note?: string; hot?: boolean }) {
  if (!iso) return <span className="text-muted">-</span>;
  const days = daysFromNow(iso, now);
  return (
    <span className="block">
      <span className="tabular-nums">{formatDay(iso)}</span>
      <span className={`block text-xs ${hot ? "font-medium text-danger" : "text-muted"}`}>
        {note ? `${note}, ` : ""}
        {relativeDays(days)}
      </span>
    </span>
  );
}

function AutoActionCell({ item, now }: { item: ReminderListItem; now: number }) {
  const { autoAction } = item;
  if (autoAction) {
    const days = daysFromNow(autoAction.at, now);
    const note = `${autoAction.type === "delete" ? "Delete" : "Unpublish"}${autoAction.isEarliest ? " (earliest)" : ""}`;
    return <DateCell iso={autoAction.at} now={now} note={note} hot={!autoAction.isEarliest && days <= URGENT_DAYS} />;
  }
  if (item.state === "readyToPublish") return <StateDate label="admin told" iso={item.stateAt} />;
  if (item.state === "autoDeleted" || item.state === "autoUnpublished") {
    return <StateDate label={item.state === "autoDeleted" ? "deleted" : "unpublished"} iso={item.stateAt} />;
  }
  return <span className="text-muted">-</span>;
}

function StateDate({ label, iso }: { label: string; iso: string | null }) {
  return (
    <span className="block">
      <span className="tabular-nums">{formatDay(iso)}</span>
      <span className="block text-xs text-muted">{label}</span>
    </span>
  );
}

export function ReminderTable({ items, now }: { items: ReminderListItem[]; now: number }) {
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
        <caption className="sr-only">Masajid in an automatic reminder flow</caption>
        <thead>
          <tr className="border-b border-line text-[13px] tracking-wide uppercase">
            <th scope="col" className={headerClass}>Masjid</th>
            <th scope="col" className={headerClass}>Flow</th>
            <th scope="col" className={headerClass}>Reminder</th>
            <th scope="col" className={headerClass}>Last sent</th>
            <th scope="col" className={headerClass}>Next reminder</th>
            <th scope="col" className={headerClass}>Auto-action</th>
            <th scope="col" className={headerClass}>Editors</th>
            <th scope="col" className={headerClass}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.masjidId} className="border-b border-line align-top even:bg-canvas/60">
              <td dir="auto" className="px-2.5 py-3.5 font-normal">
                {item.masjidName}
                <span className="block text-xs font-light text-muted">{item.city}</span>
              </td>
              <td className="px-2.5 py-3.5 text-xs font-medium">{item.flow === "unpublished" ? "Unpublished" : "Published"}</td>
              <td className="px-2.5 py-3.5">
                <div className="flex flex-col items-start gap-1.5">
                  <ReminderBadge item={item} now={now} />
                  <ProgressDots item={item} />
                  {item.delivery.status === "failed" ? (
                    <span className="text-xs font-medium text-danger">Latest reminder reached no editor</span>
                  ) : item.delivery.status === "partial" ? (
                    <span className="text-xs text-muted">
                      {item.delivery.failed} of {item.delivery.succeeded + item.delivery.failed} emails not delivered
                    </span>
                  ) : null}
                </div>
              </td>
              <td className="px-2.5 py-3.5 font-light">
                <DateCell iso={item.lastSentAt} now={now} />
              </td>
              <td className="px-2.5 py-3.5 font-light">
                <DateCell iso={item.nextReminderAt} now={now} hot={item.nextReminderAt !== null && daysFromNow(item.nextReminderAt, now) < 0} />
              </td>
              <td className="px-2.5 py-3.5 font-light">
                <AutoActionCell item={item} now={now} />
              </td>
              <td className="px-2.5 py-3.5 font-light whitespace-nowrap tabular-nums">
                {item.editors.total === 0 ? (
                  <span className="text-muted">0</span>
                ) : (
                  <>
                    {item.editors.total} <span className="text-muted">({item.editors.activated} active)</span>
                  </>
                )}
              </td>
              <td className="px-2.5 py-3.5">
                <Link
                  href={detailHref(item.masjidId)}
                  aria-label={`Trace reminders for ${item.masjidName}`}
                  className="rounded border border-line px-3 py-1.5 text-xs font-medium whitespace-nowrap text-brand hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  Trace
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
