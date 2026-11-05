import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { hrefFor, type MasjidFilters } from "@/lib/masjids/filters";
import { resultCountText } from "@/lib/masjids/row-flags";
import { MmApiUnreachableError } from "@/lib/mm-api/client";
import { listMasjids, MmApiError, type MasjidListResult } from "@/lib/mm-api/masjids";
import { MasjidTable } from "./masjid-table";
import { Pager } from "./pager";

/** The table and pager. Streams in behind Suspense so the filter bar stays usable while it loads. */
export async function MasjidResults({ filters }: { filters: MasjidFilters }) {
  let result: MasjidListResult;
  try {
    result = await listMasjids(filters);
  } catch (error) {
    unstable_rethrow(error);
    return <ResultsError error={error} filters={filters} />;
  }

  if (result.data.length === 0) {
    // A page past the end (for example after a filter removed rows) is better sent back than shown empty.
    return result.pager.totalRecordCount > 0 ? (
      <EmptyState
        title="This page has no masajid"
        hint="The list changed since you opened it."
        action={<Link className="text-brand underline" href={hrefFor({ ...filters, pageNumber: 1 })}>Go to the first page</Link>}
      />
    ) : (
      <EmptyState
        title={filters.deleted ? "No deleted masajid" : "No masajid match these filters"}
        hint={filters.deleted ? "Nothing is waiting to be restored." : "Remove a filter above, or reset all."}
      />
    );
  }

  return (
    <>
      <ResultCount total={result.pager.totalRecordCount} deleted={filters.deleted === true} />
      <MasjidTable items={result.data} filters={filters} now={result.fetchedAt} />
      <Pager filters={filters} pager={result.pager} shown={result.data.length} />
    </>
  );
}

function ResultCount({ total, deleted }: { total: number; deleted: boolean }) {
  return (
    <p aria-live="polite" className="px-5 pt-4 pb-1 text-sm font-medium text-ink">
      {resultCountText(total, deleted)}
    </p>
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

function ResultsError({ error, filters }: { error: unknown; filters: MasjidFilters }) {
  const unreachable = error instanceof MmApiUnreachableError;
  const message = unreachable
    ? "We can't reach the MyMasjid server right now."
    : error instanceof MmApiError
      ? error.message
      : "Something went wrong while loading the masajid.";

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

export function MasjidResultsSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-px px-5 pt-4 pb-5">
      <div className="mb-3 h-5 w-32 animate-pulse rounded bg-line/70" />
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="h-[52px] animate-pulse border-b border-line bg-canvas/70" />
      ))}
    </div>
  );
}
