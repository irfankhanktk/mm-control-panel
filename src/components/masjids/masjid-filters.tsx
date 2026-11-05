"use client";

import { useOptimistic, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  MAX_EDITOR_INACTIVE_DAYS,
  PRESETS,
  activeFilterCount,
  applyPreset,
  clearPreset,
  describeActive,
  hasPanelFilters,
  hrefFor,
  isPresetActive,
  withChanges,
  type MasjidFilters,
} from "@/lib/masjids/filters";
import type { Lookup } from "@/lib/mm-api/masjid-types";

const SEARCH_DEBOUNCE_MS = 400;
const INACTIVE_CHOICES = [30, 90, 180] as const;

const controlClass =
  "w-full min-w-0 rounded-md border border-line bg-white px-2.5 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";
const labelClass = "mb-1.5 block text-[11px] font-medium tracking-wide text-muted uppercase";

interface Props {
  filters: MasjidFilters;
  countries: Lookup[];
  /** Cities of the selected country (empty when no country is selected). */
  cities: Lookup[];
  /** Rendered between the search box and the filter card (the summary tiles). */
  children?: ReactNode;
}

export function MasjidFilters({ filters, countries, cities, children }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Controls follow what the user just chose right away; the URL (and the results) catch up after.
  const [view, setView] = useOptimistic(filters, (_current, next: MasjidFilters) => next);
  const [search, setSearch] = useState(filters.searchText ?? "");
  const [panelOpen, setPanelOpen] = useState(hasPanelFilters(filters));
  const [customDays, setCustomDays] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function navigate(next: MasjidFilters) {
    startTransition(() => {
      setView(next);
      router.replace(hrefFor(next), { scroll: false });
    });
  }

  const change = (patch: Partial<MasjidFilters>) => navigate(withChanges(view, patch));

  function onSearch(value: string) {
    setSearch(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => change({ searchText: value.trim() || undefined }), SEARCH_DEBOUNCE_MS);
  }

  function reset() {
    clearTimeout(searchTimer.current);
    setSearch("");
    setCustomDays("");
    navigate({ pageNumber: 1 });
  }

  function applyCustomDays() {
    const days = Number(customDays);
    if (Number.isInteger(days) && days >= 1 && days <= MAX_EDITOR_INACTIVE_DAYS) {
      // "Inactive editors" only makes sense for masajid that are live, so it implies published.
      change({ editorInactiveDays: days, isPublished: true });
    }
  }

  const tags = describeActive(view, {
    country: countries.find((country) => country.id === view.countryId)?.name,
    city: cities.find((city) => city.id === view.cityId)?.name,
  });
  const activeCount = activeFilterCount(view);
  const customDaysActive = view.editorInactiveDays !== undefined && !INACTIVE_CHOICES.some((d) => d === view.editorInactiveDays);

  return (
    <section aria-label="Filters" aria-busy={pending} className="space-y-0">
      <div className="flex flex-wrap gap-3">
        <div className="min-w-0 flex-1 basis-72">
          <label htmlFor="searchText" className="sr-only">
            Search masajid by name, address, postal code, city, country, email or phone
          </label>
          <input
            id="searchText"
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search masajid"
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
          {activeCount > 0 ? (
            <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] text-white tabular-nums">{activeCount}</span>
          ) : null}
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
              <label htmlFor="f-editors" className={labelClass}>Editors</label>
              <select
                id="f-editors"
                className={controlClass}
                value={view.editors ?? ""}
                onChange={(event) => change({ editors: (event.target.value || undefined) as MasjidFilters["editors"] })}
              >
                <option value="">Any</option>
                <option value="none">No editors</option>
                <option value="noneActivated">No activated editor</option>
              </select>
            </div>

            <div>
              <label htmlFor="f-salah" className={labelClass}>Salah times</label>
              <select
                id="f-salah"
                className={controlClass}
                value={view.hasSalahTimes === undefined ? "" : String(view.hasSalahTimes)}
                onChange={(event) => change({ hasSalahTimes: event.target.value === "" ? undefined : event.target.value === "true" })}
              >
                <option value="">Any</option>
                <option value="true">Has salah times</option>
                <option value="false">No salah times</option>
              </select>
            </div>

            <div>
              <label htmlFor="f-devices" className={labelClass}>Devices</label>
              <select
                id="f-devices"
                className={controlClass}
                value={view.hasDevices === undefined ? "" : String(view.hasDevices)}
                onChange={(event) => change({ hasDevices: event.target.value === "" ? undefined : event.target.value === "true" })}
              >
                <option value="">Any</option>
                <option value="true">Has devices</option>
                <option value="false">No devices linked</option>
              </select>
            </div>

            <div>
              <label htmlFor="f-country" className={labelClass}>Country</label>
              <select
                id="f-country"
                className={controlClass}
                value={view.countryId ?? ""}
                onChange={(event) => change({ countryId: event.target.value ? Number(event.target.value) : undefined })}
              >
                <option value="">All countries</option>
                {countries.map((country) => (
                  <option key={country.id} value={country.id}>{country.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="f-city" className={labelClass}>City</label>
              <select
                id="f-city"
                className={controlClass}
                value={view.cityId ?? ""}
                disabled={!view.countryId}
                onChange={(event) => change({ cityId: event.target.value ? Number(event.target.value) : undefined })}
              >
                <option value="">{view.countryId ? "All cities" : "Choose a country first"}</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>{city.name}</option>
                ))}
              </select>
            </div>

            <fieldset className="min-w-0">
              <legend className={labelClass}>Registered between</legend>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  aria-label="Registered from"
                  className={controlClass}
                  value={view.createdFrom ?? ""}
                  max={view.createdTo}
                  onChange={(event) => change({ createdFrom: event.target.value || undefined })}
                />
                <span aria-hidden="true" className="text-muted">–</span>
                <input
                  type="date"
                  aria-label="Registered to"
                  className={controlClass}
                  value={view.createdTo ?? ""}
                  min={view.createdFrom}
                  onChange={(event) => change({ createdTo: event.target.value || undefined })}
                />
              </div>
            </fieldset>

            <fieldset className="sm:col-span-2 lg:col-span-3">
              <legend className={labelClass}>Editors inactive for (masajid with editors)</legend>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  aria-pressed={view.editorInactiveDays === undefined}
                  onClick={() => change({ editorInactiveDays: undefined })}
                  className={chipClass(view.editorInactiveDays === undefined)}
                >
                  Off
                </button>
                {INACTIVE_CHOICES.map((days) => (
                  <button
                    key={days}
                    type="button"
                    aria-pressed={view.editorInactiveDays === days}
                    onClick={() => change({ editorInactiveDays: days, isPublished: true })}
                    className={chipClass(view.editorInactiveDays === days)}
                  >
                    {days} days
                  </button>
                ))}
                <label htmlFor="f-days" className="sr-only">Custom number of days</label>
                <input
                  id="f-days"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={MAX_EDITOR_INACTIVE_DAYS}
                  placeholder="Custom"
                  value={customDaysActive && customDays === "" ? String(view.editorInactiveDays) : customDays}
                  onChange={(event) => setCustomDays(event.target.value)}
                  onBlur={applyCustomDays}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      applyCustomDays();
                    }
                  }}
                  className={`${controlClass} !w-24`}
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

function chipClass(active: boolean): string {
  return `rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
    active ? "border-brand bg-brand text-white" : "border-line bg-white hover:bg-brand-soft"
  }`;
}
