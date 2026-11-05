import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import type { SessionUser } from "@/lib/auth/session-token";
import { hrefFor, parseFilters, type RawSearchParams } from "@/lib/reminders/filters";
import { ReminderFilters } from "./reminder-filters";
import { ReminderResults, ReminderResultsSkeleton } from "./reminder-results";
import { ReminderSummaryTiles, ReminderSummaryTilesSkeleton } from "./reminder-summary-tiles";

/** Reminders page: summary tiles, filters and the masajid that are in an automatic reminder flow. Driven by the URL query string. */
export function RemindersPage({ user, searchParams }: { user: SessionUser; searchParams: RawSearchParams }) {
  const filters = parseFilters(searchParams);

  return (
    <>
      <AppHeader user={user} current="reminders" />
      <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-8">
        <h1 className="text-3xl font-light text-brand">Reminders</h1>
        <p className="mt-1 mb-5 max-w-[76ch] text-sm text-muted">
          Masajid that are in an automatic reminder flow. Masajid the reminder jobs have not acted on are not listed.
        </p>

        <ReminderFilters filters={filters}>
          <Suspense fallback={<ReminderSummaryTilesSkeleton />}>
            <ReminderSummaryTiles filters={filters} />
          </Suspense>
        </ReminderFilters>

        <div className="rounded-b border-t border-line bg-white">
          {/* Re-keyed per filter set so the skeleton shows while a new result set loads. */}
          <Suspense key={hrefFor(filters)} fallback={<ReminderResultsSkeleton />}>
            <ReminderResults filters={filters} />
          </Suspense>
        </div>
      </main>
    </>
  );
}
