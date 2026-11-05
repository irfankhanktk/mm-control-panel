import Link from "next/link";
import { notFound, unstable_rethrow } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import type { SessionUser } from "@/lib/auth/session-token";
import type { ReminderDetail, ReminderEvent, ReminderSettings, ReminderStep } from "@/lib/mm-api/reminder-types";
import { getReminderDetail, getReminderSettings, listReminderEvents } from "@/lib/mm-api/reminders";
import { REMINDERS_PATH } from "@/lib/reminders/filters";
import { actionVerb, daysFromNow, eventTitle, formatDay, formatDayTime, recipientResults, relativeDays, resendBlockedText, stepTone } from "@/lib/reminders/format";
import { ReminderBadge } from "./reminder-badge";
import { ResendButton } from "./resend-button";

async function optional<T>(load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

export async function ReminderDetailPage({ user, masjidId }: { user: SessionUser; masjidId: number }) {
  const detail = await getReminderDetail(masjidId);
  if (!detail) notFound();

  // The history and the schedule text are extras: the page still works without them.
  const [events, settings] = await Promise.all([optional(() => listReminderEvents(masjidId)), optional(() => getReminderSettings())]);
  const now = detail.fetchedAt;
  const { reminder } = detail;

  return (
    <>
      <AppHeader user={user} current="reminders" />
      <main className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-8">
        <Link href={REMINDERS_PATH} className="text-sm font-medium text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
          ← Back to reminders
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 dir="auto" className="text-3xl font-light text-brand">{reminder.masjidName}</h1>
          <ReminderBadge item={reminder} now={now} />
        </div>
        <p className="mt-1 text-sm text-muted">
          {reminder.city} · {reminder.flow === "unpublished" ? "Unpublished masjid" : "Published masjid"}
          {detail.startedAt ? ` · ${reminder.flow === "unpublished" ? "created" : "inactive since"} ${formatDay(detail.startedAt)}` : ""}
        </p>

        <Facts detail={detail} now={now} />

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div>
            <section className="mb-5 rounded bg-white px-5 py-4" aria-labelledby="progress-title">
              <h2 id="progress-title" className={sectionTitle}>Progress</h2>
              <Stepper detail={detail} />
              {settings ? <HowItWorks flow={reminder.flow} settings={settings} /> : null}
            </section>

            <ResendSection detail={detail} />

            <section className="mb-5 rounded bg-white px-5 py-4" aria-labelledby="history-title">
              <h2 id="history-title" className={sectionTitle}>History</h2>
              <History events={events?.data ?? null} currentCycleId={detail.cycleId} />
            </section>
          </div>

          <section className="rounded bg-white px-5 py-4" aria-labelledby="editors-title">
            <h2 id="editors-title" className={sectionTitle}>Editors</h2>
            {detail.editors.length === 0 ? (
              <p className="text-sm text-muted">This masjid has no editor with an email address.</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {detail.editors.map((editor) => (
                  <li key={editor.email} className="flex flex-wrap items-baseline justify-between gap-x-3 py-2.5">
                    <span className="break-all">{editor.email}</span>
                    <span className="text-xs text-muted">
                      {editor.isActivated ? "Activated" : "Not activated"} · last login {editor.lastLoginAt ? formatDay(editor.lastLoginAt) : "never"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-muted">Reminders go to every editor with an email address.</p>
          </section>
        </div>
      </main>
    </>
  );
}

const sectionTitle = "mb-3 text-[13px] font-semibold tracking-wide text-muted uppercase";

function Facts({ detail, now }: { detail: ReminderDetail; now: number }) {
  const { reminder } = detail;
  const { autoAction } = reminder;

  return (
    <dl className="my-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Fact label="Reminders sent" value={`${reminder.remindersSent} of ${reminder.remindersTotal}`} />
      <Fact
        label="Last sent"
        value={formatDay(reminder.lastSentAt)}
        note={reminder.lastSentAt ? relativeDays(daysFromNow(reminder.lastSentAt, now)) : "none yet"}
      />
      <Fact
        label="Next reminder"
        value={formatDay(reminder.nextReminderAt)}
        note={reminder.nextReminderAt ? relativeDays(daysFromNow(reminder.nextReminderAt, now)) : "none pending"}
      />
      <Fact
        label="Auto-action"
        value={autoAction ? formatDay(autoAction.at) : "-"}
        note={
          autoAction
            ? `${actionVerb(autoAction.type)}${autoAction.isEarliest ? " (earliest)" : ""}${autoAction.isOnHold ? ", on hold until delivered" : ""}`
            : "none scheduled"
        }
      />
    </dl>
  );
}

function Fact({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded bg-white px-4 py-3">
      <dt className="text-[11px] font-medium tracking-wide text-muted uppercase">{label}</dt>
      <dd className="mt-0.5 text-lg tabular-nums">{value}</dd>
      {note ? <dd className="text-xs text-muted">{note}</dd> : null}
    </div>
  );
}

const STEP_DOT: Record<ReturnType<typeof stepTone>, string> = {
  done: "bg-teal text-white",
  fail: "bg-danger text-white",
  next: "border-[3px] border-sun bg-white text-amber-800",
  pending: "bg-line text-muted",
};

function Stepper({ detail }: { detail: ReminderDetail }) {
  const { reminder, steps } = detail;
  const { autoAction } = reminder;
  const ended = reminder.state === "autoDeleted" || reminder.state === "autoUnpublished";

  return (
    <ol className="flex items-start" aria-label="Reminder progress">
      {steps.map((step) => (
        <StepItem key={step.number} step={step} />
      ))}
      {autoAction ? (
        <li className="relative min-w-0 flex-1 text-center text-xs text-muted">
          <Connector active={reminder.state === "allSent"} />
          <span className="relative mx-auto mb-1.5 grid size-6 place-items-center rounded-md border-[3px] border-danger bg-white text-[11px] font-semibold text-danger">
            {autoAction.type === "delete" ? "×" : "↓"}
          </span>
          <span className="block font-medium text-ink">{autoAction.type === "delete" ? "Delete" : "Unpublish"}</span>
          <span className="block tabular-nums">
            {formatDay(autoAction.at)}
            {autoAction.isEarliest ? " ~" : ""}
          </span>
        </li>
      ) : null}
      {ended ? (
        <li className="relative min-w-0 flex-1 text-center text-xs text-muted">
          <Connector active />
          <span className="relative mx-auto mb-1.5 grid size-6 place-items-center rounded-md bg-ink text-[11px] font-semibold text-white">×</span>
          <span className="block font-medium text-ink">{reminder.state === "autoDeleted" ? "Deleted" : "Unpublished"}</span>
          <span className="block tabular-nums">{formatDay(reminder.stateAt)}</span>
        </li>
      ) : null}
    </ol>
  );
}

function Connector({ active, failed }: { active: boolean; failed?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute top-[11px] -left-1/2 h-[3px] w-full ${failed ? "bg-danger" : active ? "bg-teal" : "bg-line"}`}
    />
  );
}

function StepItem({ step }: { step: ReminderStep }) {
  const tone = stepTone(step);
  return (
    <li className="relative min-w-0 flex-1 text-center text-xs text-muted">
      {step.number > 1 ? <Connector active={tone !== "pending"} failed={tone === "fail"} /> : null}
      <span className={`relative mx-auto mb-1.5 grid size-6 place-items-center rounded-full text-[11px] font-semibold ${STEP_DOT[tone]}`}>
        {tone === "done" ? "✓" : tone === "fail" ? "!" : step.number}
      </span>
      <span className="block font-medium text-ink">Reminder {step.number}</span>
      <span className="block tabular-nums">{step.at ? formatDay(step.at) : ""}</span>
      <span className="sr-only">{tone === "done" ? "sent" : tone === "fail" ? "not delivered" : tone === "next" ? "next" : "later"}</span>
    </li>
  );
}

function HowItWorks({ flow, settings }: { flow: "unpublished" | "published"; settings: ReminderSettings }) {
  const list = (days: number[]) => (days.length ? days.join(", ") : "no");

  return (
    <div className="mt-4 space-y-1.5 rounded-md bg-canvas px-4 py-3 text-[13px]">
      {flow === "unpublished" ? (
        <>
          <p>
            Reminders go out {list(settings.unpublished.reminderDays)} days apart. The first is counted from the day the masjid was created, each later one from the previous reminder.
          </p>
          <p>
            If all reminders are sent and no editor logs in within {settings.unpublished.deleteAfterDays} days of the last one, the masjid is deleted automatically. An editor login after a reminder restarts the cycle.
          </p>
        </>
      ) : (
        <>
          <p>
            A published masjid counts as inactive when no editor has logged in for {settings.published.inactiveMonths} months. Reminders go out {list(settings.published.reminderDays)} days apart, counted from the start of inactivity and then from the previous reminder.
          </p>
          <p>After {settings.published.unpublishAfterDays} days of inactivity the masjid is unpublished automatically. An editor login restarts the cycle.</p>
          {settings.published.reachableReminders < settings.published.reminderDays.length ? (
            <p className="font-medium">
              Only {settings.published.reachableReminders} of the {settings.published.reminderDays.length} reminders can go out: the later ones would be due after the masjid is unpublished.
            </p>
          ) : null}
        </>
      )}
      <p>The automatic delete or unpublish never happens while the latest reminder has reached no editor.</p>
    </div>
  );
}

function ResendSection({ detail }: { detail: ReminderDetail }) {
  const { reminder } = detail;
  // Nothing to say unless the latest reminder failed.
  if (reminder.delivery.status !== "failed") return null;

  const blocked = resendBlockedText(reminder.resend, formatDayTime);

  return (
    <section className="mb-5 rounded border border-danger/25 bg-danger-soft/50 px-5 py-4" aria-labelledby="resend-title">
      <h2 id="resend-title" className="mb-1 text-[13px] font-semibold tracking-wide text-danger uppercase">Reminder not delivered</h2>
      <p className="mb-3 text-sm">
        Reminder {reminder.remindersSent} reached none of the editors, so the automatic {reminder.autoAction?.type === "unpublish" ? "unpublish" : "delete"} is on hold.
      </p>
      {blocked ? (
        <p className="text-sm text-muted">{blocked}</p>
      ) : (
        <ResendButton masjidId={reminder.masjidId} masjidName={reminder.masjidName} reminderNumber={reminder.remindersSent} recipients={detail.editors.length} />
      )}
    </section>
  );
}

interface Block {
  key: string;
  at: string;
  title: string;
  manual: boolean;
  events: ReminderEvent[];
}

/** Events of one cycle, oldest first; the email results of one reminder (and of one resend) share a block. */
function blocksOf(events: ReminderEvent[]): Block[] {
  const blocks: Block[] = [];
  for (const event of [...events].reverse()) {
    const manual = event.triggeredByUserId !== null;
    const key = event.eventType === "reminderSent" ? `${event.eventType}|${event.reminderNumber}|${manual}` : event.id;
    const existing = blocks.find((block) => block.key === key);
    if (existing) existing.events.push(event);
    else blocks.push({ key, at: event.at, title: eventTitle(event.eventType, event.reminderNumber), manual, events: [event] });
  }
  return blocks;
}

function History({ events, currentCycleId }: { events: ReminderEvent[] | null; currentCycleId: string | null }) {
  if (events === null) return <p className="text-sm text-muted">The history could not be loaded.</p>;
  if (events.length === 0) {
    return <p className="text-sm text-muted">No events are recorded yet. The history starts from the release that added delivery tracking, so earlier reminders do not appear here.</p>;
  }

  const cycles = new Map<string, ReminderEvent[]>();
  for (const event of events) cycles.set(event.cycleId, [...(cycles.get(event.cycleId) ?? []), event]);

  return (
    <div className="space-y-3">
      {[...cycles.entries()].map(([cycleId, cycleEvents]) => {
        const current = cycleId === currentCycleId;
        const reset = cycleEvents.find((event) => event.eventType === "cycleReset");
        const oldest = cycleEvents[cycleEvents.length - 1];
        return (
          <div key={cycleId} className={`rounded-md border border-line ${current ? "" : "opacity-80"}`}>
            <p className="flex flex-wrap justify-between gap-2 rounded-t-md bg-canvas px-3.5 py-2 text-xs font-medium">
              <span>{current ? "Current cycle" : "Earlier cycle"} · since {formatDay(oldest.at)}</span>
              {reset ? <span className="text-muted">Restarted {formatDay(reset.at)} (an editor logged in)</span> : null}
            </p>
            <ul className="divide-y divide-line">
              {blocksOf(cycleEvents).map((block) => (
                <li key={block.key} className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 px-3.5 py-2.5 text-[13px]">
                  <span className="text-xs text-muted tabular-nums">{formatDayTime(block.at)}</span>
                  <div>
                    <span className="font-medium">
                      {block.title}
                      {block.manual ? <span className="ml-2 text-xs font-normal text-muted">resent by an admin</span> : null}
                    </span>
                    {block.events[0].recipient ? (
                      <ul className="mt-1 space-y-0.5 text-xs">
                        {recipientResults(block.events).map((result) => (
                          <li key={result.recipient} className={result.delivered ? "text-emerald-800" : "text-danger"}>
                            {result.delivered ? "✓ " : "✗ "}
                            {result.recipient}
                            {result.delivered && result.failedAttempts > 0 ? (
                              <span className="text-muted">
                                {" "}
                                – delivered after {result.failedAttempts} failed {result.failedAttempts === 1 ? "attempt" : "attempts"}
                              </span>
                            ) : null}
                            {!result.delivered && result.reason ? ` – ${result.reason}` : ""}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
