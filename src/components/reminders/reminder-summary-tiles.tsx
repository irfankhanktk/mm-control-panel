import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { applyPreset, hrefFor, isPresetActive, PRESETS, type ReminderFilters } from "@/lib/reminders/filters";
import { getReminderSummary } from "@/lib/mm-api/reminders";
import type { ReminderSummary } from "@/lib/mm-api/reminder-types";

interface TileSpec {
  label: string;
  value: (summary: ReminderSummary) => number;
  /** Key of the preset the tile applies; null clears the filters. */
  preset: string | null;
  color: string;
  text: string;
  caret: string;
}

const TILES: readonly TileSpec[] = [
  { label: "In reminder flow", value: (s) => s.inFlow, preset: null, color: "bg-sky", text: "text-white", caret: "border-t-sky" },
  { label: "Reminders due this week", value: (s) => s.dueThisWeek, preset: "due-week", color: "bg-teal", text: "text-white", caret: "border-t-teal" },
  { label: "Auto-action within 7 days", value: (s) => s.autoActionWithin7Days, preset: "action-soon", color: "bg-sun", text: "text-ink", caret: "border-t-sun" },
  { label: "Delivery failed", value: (s) => s.deliveryFailed, preset: "failed", color: "bg-danger", text: "text-white", caret: "border-t-danger" },
];

/** Live counts. Each tile also applies the matching quick filter. */
export async function ReminderSummaryTiles({ filters }: { filters: ReminderFilters }) {
  let summary: ReminderSummary | null = null;
  try {
    summary = await getReminderSummary();
  } catch (error) {
    unstable_rethrow(error);
  }

  return (
    <nav aria-label="Reminder status" className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
      {TILES.map((tile) => {
        const preset = tile.preset ? PRESETS.find((p) => p.key === tile.preset) : undefined;
        const selected = preset ? isPresetActive(filters, preset) : false;
        const href = preset ? hrefFor(applyPreset(filters, preset)) : hrefFor({ pageNumber: 1 });

        return (
          <Link
            key={tile.label}
            href={href}
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

export function ReminderSummaryTilesSkeleton() {
  return (
    <div aria-hidden="true" className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
      {TILES.map((tile) => (
        <div key={tile.label} className={`h-24 rounded opacity-40 sm:h-[116px] ${tile.color}`} />
      ))}
    </div>
  );
}
