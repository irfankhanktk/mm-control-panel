import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { hrefFor, type ReminderFilters } from "@/lib/reminders/filters";
import { MmApiUnreachableError } from "@/lib/mm-api/client";
import { listReminders, type ReminderListResult } from "@/lib/mm-api/reminders";
import { MmApiError } from "@/lib/mm-api/request";
import { ReminderPager } from "./reminder-pager";
import { ReminderTable } from "./reminder-table";

/** The table and pager. Streams in behind Suspense so the filter bar stays usable while it loads. */
export async function ReminderResults({ filters }: { filters: ReminderFilters }) {
  let result: ReminderListResult;
  try {
    result = await listReminders(filters);
  } catch (error) {
    unstable_rethrow(error);
    return <ResultsError error={error} filters={filters} />;
  }

  if (result.data.length === 0) {
    // A page past the end (for example after a filter removed rows) is better sent back than shown empty.
    return result.pager.totalRecordCount > 0 ? (
      <EmptyState
        title="This page has no reminders"
        hint="The list changed since you opened it."
        action={<Link className="text-brand underline" href={hrefFor({ ...filters, pageNumber: 1 })}>Go to the first page</Link>}
      />
    ) : (
      <EmptyState title="No masajid match these filters" hint="Remove a filter above, or reset all." />
    );
  }

  const total = result.pager.totalRecordCount;
  return (
    <>
      <p aria-live="polite" className="px-5 pt-4 pb-1 text-sm font-medium text-ink">
        {total.toLocaleString("en-GB")} {total === 1 ? "masjid" : "masajid"} found
      </p>
      <ReminderTable items={result.data} now={result.fetchedAt} />
      <ReminderPager filters={filters} pager={result.pager} shown={result.data.length} />
    </>
  );
}

function EmptyState({ title, hint, action }: { title: string; hint: string; action?: React.ReactNode }) {
  return (
    <div className="px-4 py-14 text-center text-muted">
      <p className="font-medium text-ink">{title}</p>
      <p className="mt-1 text-sm">{hint}</p>
      {action ? <p className="mt-3 text-sm">{action}</p> : null}
    </div>
  );
}

function ResultsError({ error, filters }: { error: unknown; filters: ReminderFilters }) {
  const message =
    error instanceof MmApiUnreachableError
      ? "We can't reach the MyMasjid server right now."
      : error instanceof MmApiError
        ? error.message
        : "Something went wrong while loading the reminders.";

  return (
    <div role="alert" className="m-5 rounded-lg border border-danger/20 bg-danger-soft px-4 py-4 text-sm text-danger">
      <p className="font-medium">The list could not be loaded.</p>
      <p className="mt-1">{message}</p>
      <Link href={hrefFor(filters)} className="mt-2 inline-block font-medium underline">
        Try again
      </Link>
    </div>
  );
}

export function ReminderResultsSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-px px-5 pt-4 pb-5">
      <div className="mb-3 h-5 w-32 animate-pulse rounded bg-line/70" />
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="h-[68px] animate-pulse border-b border-line bg-canvas/70" />
      ))}
    </div>
  );
}
