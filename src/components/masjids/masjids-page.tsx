import { Suspense } from "react";
import { unstable_rethrow } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import type { SessionUser } from "@/lib/auth/session-token";
import { hrefFor, parseFilters, type RawSearchParams } from "@/lib/masjids/filters";
import { listMasjidCities, listMasjidCountries } from "@/lib/mm-api/masjids";
import type { Lookup } from "@/lib/mm-api/masjid-types";
import { MasjidFilters } from "./masjid-filters";
import { MasjidResults, MasjidResultsSkeleton } from "./masjid-results";
import { SummaryTiles, SummaryTilesSkeleton } from "./summary-tiles";

/** Admin home: summary tiles, filters and the masjid list. Everything is driven by the URL query string. */
export async function MasjidsPage({ user, searchParams }: { user: SessionUser; searchParams: RawSearchParams }) {
  const filters = parseFilters(searchParams);

  // The location dropdowns are a convenience: if they fail the list still works without them.
  let countries: Lookup[] = [];
  let cities: Lookup[] = [];
  try {
    [countries, cities] = await Promise.all([
      listMasjidCountries(),
      filters.countryId ? listMasjidCities(filters.countryId) : Promise.resolve([]),
    ]);
  } catch (error) {
    unstable_rethrow(error);
  }

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-8">
        <h1 className="mb-5 text-3xl font-light text-brand">Masajid</h1>

        <MasjidFilters filters={filters} countries={countries} cities={cities}>
          <Suspense fallback={<SummaryTilesSkeleton />}>
            <SummaryTiles filters={filters} />
          </Suspense>
        </MasjidFilters>

        <div className="rounded-b border-t border-line bg-white">
          {/* Re-keyed per filter set so the skeleton shows while a new result set loads. */}
          <Suspense key={hrefFor(filters)} fallback={<MasjidResultsSkeleton />}>
            <MasjidResults filters={filters} />
          </Suspense>
        </div>
      </main>
    </>
  );
}
