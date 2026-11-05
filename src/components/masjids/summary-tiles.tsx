import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { hrefFor, withChanges, type MasjidFilters } from "@/lib/masjids/filters";
import { getMasjidSummary } from "@/lib/mm-api/masjids";
import type { MasjidSummary } from "@/lib/mm-api/masjid-types";

interface TileSpec {
  label: string;
  value: (summary: MasjidSummary) => number;
  /** undefined = no publish filter */
  isPublished: boolean | undefined;
  color: string;
  text: string;
  caret: string;
}

const TILES: readonly TileSpec[] = [
  { label: "Total Masajid", value: (s) => s.total, isPublished: undefined, color: "bg-sky", text: "text-white", caret: "border-t-sky" },
  { label: "Published", value: (s) => s.published, isPublished: true, color: "bg-teal", text: "text-white", caret: "border-t-teal" },
  { label: "Unpublished", value: (s) => s.unpublished, isPublished: false, color: "bg-sun", text: "text-ink", caret: "border-t-sun" },
];

/** Live counts. Each tile also filters the list by publish state. */
export async function SummaryTiles({ filters }: { filters: MasjidFilters }) {
  let summary: MasjidSummary | null = null;
  try {
    summary = await getMasjidSummary();
  } catch (error) {
    unstable_rethrow(error);
  }

  return (
    <nav aria-label="Publish status" className="grid grid-cols-3 gap-3 sm:gap-5">
      {TILES.map((tile) => {
        const selected = !filters.deleted && filters.isPublished === tile.isPublished;
        return (
          <Link
            key={tile.label}
            href={hrefFor(withChanges(filters, { isPublished: tile.isPublished, deleted: undefined }))}
            aria-current={selected ? "true" : undefined}
            className={`relative rounded px-2 py-5 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:py-6 ${tile.color} ${tile.text}`}
          >
            <span className="block text-3xl leading-tight font-light tabular-nums sm:text-5xl">
              {summary ? tile.value(summary).toLocaleString("en-GB") : "–"}
            </span>
            <span className="mt-1 block text-xs sm:text-base">{tile.label}</span>
            {selected ? (
              <span
                aria-hidden="true"
                className={`absolute -bottom-2.5 left-1/2 size-0 -translate-x-1/2 border-x-[10px] border-t-[10px] border-x-transparent ${tile.caret}`}
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function SummaryTilesSkeleton() {
  return (
    <div aria-hidden="true" className="grid grid-cols-3 gap-3 sm:gap-5">
      {TILES.map((tile) => (
        <div key={tile.label} className={`h-24 rounded opacity-40 sm:h-[116px] ${tile.color}`} />
      ))}
    </div>
  );
}
