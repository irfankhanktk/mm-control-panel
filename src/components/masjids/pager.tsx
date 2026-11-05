import Link from "next/link";
import { hrefFor, withChanges, type MasjidFilters } from "@/lib/masjids/filters";
import type { Pager as PagerData } from "@/lib/mm-api/masjid-types";

const linkClass =
  "rounded border border-line px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
const disabledClass = "rounded border border-line px-3 py-1.5 text-sm text-muted/60";

export function Pager({ filters, pager, shown }: { filters: MasjidFilters; pager: PagerData; shown: number }) {
  const first = shown === 0 ? 0 : (pager.currentPageIndex - 1) * pager.pageSize + 1;
  const last = first === 0 ? 0 : first + shown - 1;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-5 text-sm text-muted">
      <p aria-live="polite">
        Showing {first.toLocaleString("en-GB")}–{last.toLocaleString("en-GB")} of{" "}
        {pager.totalRecordCount.toLocaleString("en-GB")}
      </p>

      {pager.pageCount > 1 ? (
        <nav aria-label="Pages" className="flex items-center gap-2">
          {pager.hasPreviousPage ? (
            <Link href={hrefFor(withChanges(filters, { pageNumber: pager.currentPageIndex - 1 }))} className={linkClass}>
              Previous
            </Link>
          ) : (
            <span className={disabledClass}>Previous</span>
          )}
          <span className="px-1 tabular-nums">
            Page {pager.currentPageIndex} of {pager.pageCount}
          </span>
          {pager.hasNextPage ? (
            <Link href={hrefFor(withChanges(filters, { pageNumber: pager.currentPageIndex + 1 }))} className={linkClass}>
              Next
            </Link>
          ) : (
            <span className={disabledClass}>Next</span>
          )}
        </nav>
      ) : null}
    </div>
  );
}
