"use client";

import { useOptimistic, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  PRESETS,
  activeFilterCount,
  applyPreset,
  clearPreset,
  describeActive,
  hasPanelFilters,
  hrefFor,
  isPresetActive,
  withChanges,
  type FlowFilter,
  type ReminderFilters,
  type SortValue,
  type StateFilter,
} from "@/lib/reminders/filters";

const SEARCH_DEBOUNCE_MS = 400;

const controlClass =
  "w-full min-w-0 rounded-md border border-line bg-white px-2.5 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";
const labelClass = "mb-1.5 block text-[11px] font-medium tracking-wide text-muted uppercase";

interface Props {
  filters: ReminderFilters;
  /** Rendered between the search box and the filter card (the summary tiles). */
  children?: ReactNode;
}

export function ReminderFilters({ filters, children }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Controls follow what the user just chose right away; the URL (and the results) catch up after.
  const [view, setView] = useOptimistic(filters, (_current, next: ReminderFilters) => next);
  const [search, setSearch] = useState(filters.searchText ?? "");
  const [panelOpen, setPanelOpen] = useState(hasPanelFilters(filters));
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function navigate(next: ReminderFilters) {
    startTransition(() => {
      setView(next);
      router.replace(hrefFor(next), { scroll: false });
    });
  }

  const change = (patch: Partial<ReminderFilters>) => navigate(withChanges(view, patch));

  function onSearch(value: string) {
    setSearch(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => change({ searchText: value.trim() || undefined }), SEARCH_DEBOUNCE_MS);
  }

  function reset() {
    clearTimeout(searchTimer.current);
    setSearch("");
    navigate({ pageNumber: 1 });
  }

  const tags = describeActive(view);
  const activeCount = activeFilterCount(view);

  return (
    <section aria-label="Filters" aria-busy={pending} className="space-y-0">
      <div className="flex flex-wrap gap-3">
        <div className="min-w-0 flex-1 basis-72">
          <label htmlFor="searchText" className="sr-only">
            Search reminders by masjid name
          </label>
          <input
            id="searchText"
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search by masjid name"
            autoComplete="off"
            className="w-full rounded-md border border-line bg-white px-4 py-3 text-lg font-light text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>
        <button
          type="button"
          onClick={() => setPanelOpen((open) => !open)}
          aria-expanded={panelOpen}
          aria-controls="filter-panel"
          className="flex min-h-12 items-center gap-2 rounded-md border border-line bg-white px-5 text-sm font-medium text-brand hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Filters
          {activeCount > 0 ? <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] text-white tabular-nums">{activeCount}</span> : null}
        </button>
      </div>

      {children ? <div className="mt-6">{children}</div> : null}

      <div className="mt-6 rounded-t bg-white">
        <div className="flex flex-wrap items-center gap-2 px-5 pt-4 pb-1.5" role="group" aria-label="Quick filters">
          <span className="mr-1 text-[11px] font-medium tracking-wide text-muted uppercase">Quick filters</span>
          {PRESETS.map((preset) => {
            const active = isPresetActive(view, preset);
            return (
              <button
                key={preset.key}
                type="button"
                aria-pressed={active}
                onClick={() => navigate(active ? clearPreset(view) : applyPreset(view, preset))}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                  active ? "border-brand bg-brand text-white" : "border-line bg-white hover:bg-brand-soft"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div id="filter-panel" hidden={!panelOpen} className="mt-2 border-t border-line px-5 pt-4">
          <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="f-flow" className={labelClass}>Masjid type</label>
              <select
                id="f-flow"
                className={controlClass}
                value={view.flow ?? ""}
                onChange={(event) => change({ flow: (event.target.value || undefined) as FlowFilter | undefined })}
              >
                <option value="">Published and unpublished</option>
                <option value="unpublished">Unpublished masajid</option>
                <option value="published">Published masajid</option>
              </select>
            </div>

            <div>
              <label htmlFor="f-state" className={labelClass}>Reminder state</label>
              <select
                id="f-state"
                className={controlClass}
                value={view.state ?? ""}
                onChange={(event) => change({ state: (event.target.value || undefined) as StateFilter | undefined })}
              >
                <option value="">Any</option>
                <option value="reminding">Reminding</option>
                <option value="allSent">All reminders sent</option>
                <option value="readyToPublish">Ready to publish</option>
                <option value="ended">Auto-deleted or unpublished</option>
                <option value="autoDeleted">Auto-deleted only</option>
                <option value="autoUnpublished">Auto-unpublished only</option>
              </select>
            </div>

            <div>
              <label htmlFor="f-sort" className={labelClass}>Sort by</label>
              <select
                id="f-sort"
                className={controlClass}
                value={view.sort ?? ""}
                onChange={(event) => change({ sort: (event.target.value || undefined) as SortValue | undefined })}
              >
                <option value="">Soonest event first</option>
                <option value="-lastSentAt">Last reminder sent, newest first</option>
                <option value="lastSentAt">Last reminder sent, oldest first</option>
                <option value="masjidName">Masjid name, A to Z</option>
                <option value="-masjidName">Masjid name, Z to A</option>
              </select>
            </div>

            <div>
              <label htmlFor="f-due" className={labelClass}>Reminder due within</label>
              <select
                id="f-due"
                className={controlClass}
                value={view.nextReminderWithinDays ?? ""}
                onChange={(event) => change({ nextReminderWithinDays: event.target.value ? Number(event.target.value) : undefined })}
              >
                <option value="">Any time</option>
                {[3, 7, 14, 30].map((days) => (
                  <option key={days} value={days}>{days} days</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="f-action" className={labelClass}>Auto-action within</label>
              <select
                id="f-action"
                className={controlClass}
                value={view.autoActionWithinDays ?? ""}
                onChange={(event) => change({ autoActionWithinDays: event.target.value ? Number(event.target.value) : undefined })}
              >
                <option value="">Any time</option>
                {[7, 14, 30].map((days) => (
                  <option key={days} value={days}>{days} days</option>
                ))}
              </select>
            </div>

            <fieldset className="min-w-0">
              <legend className={labelClass}>Last reminder sent between</legend>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  aria-label="Last reminder sent from"
                  className={controlClass}
                  value={view.lastSentFrom ?? ""}
                  max={view.lastSentTo}
                  onChange={(event) => change({ lastSentFrom: event.target.value || undefined })}
                />
                <span aria-hidden="true" className="text-muted">–</span>
                <input
                  type="date"
                  aria-label="Last reminder sent to"
                  className={controlClass}
                  value={view.lastSentTo ?? ""}
                  min={view.lastSentFrom}
                  onChange={(event) => change({ lastSentTo: event.target.value || undefined })}
                />
              </div>
            </fieldset>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
          <ul className="flex flex-wrap items-center gap-1.5" aria-label="Applied filters">
            {tags.length === 0 ? (
              <li className="text-xs text-muted">No filters applied</li>
            ) : (
              tags.map((tag) => (
                <li key={tag.key} className="inline-flex items-center gap-0.5 rounded bg-brand-soft py-0.5 pr-0.5 pl-2.5 text-xs text-brand-dark">
                  {tag.label}
                  <button
                    type="button"
                    aria-label={`Remove filter: ${tag.label}`}
                    onClick={() => {
                      if (tag.key === "searchText") {
                        clearTimeout(searchTimer.current);
                        setSearch("");
                      }
                      change(tag.clear);
                    }}
                    className="rounded px-1.5 text-base leading-none hover:bg-brand/15 focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    ×
                  </button>
                </li>
              ))
            )}
          </ul>
          <button
            type="button"
            onClick={reset}
            disabled={activeCount === 0}
            className="rounded-md border border-line px-3.5 py-1.5 text-xs font-medium text-brand hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:text-muted/60 disabled:hover:bg-transparent"
          >
            Reset all
          </button>
        </div>
      </div>
    </section>
  );
}
