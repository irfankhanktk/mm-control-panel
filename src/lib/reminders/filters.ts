/**
 * Filters of the reminders list. The URL is the source of truth: the page reads them from the
 * query string, the filter bar writes them back, and the same names are sent to
 * GET /api/v2/masjid-reminders. No imports, so server and client code can both use it.
 */

export const PAGE_SIZE = 50;
export const MAX_WITHIN_DAYS = 90;
export const REMINDERS_PATH = "/reminders";

export type FlowFilter = "unpublished" | "published";
export type StateFilter = "reminding" | "allSent" | "readyToPublish" | "autoDeleted" | "autoUnpublished" | "ended";

export type SortValue = "nextEventAt" | "-nextEventAt" | "lastSentAt" | "-lastSentAt" | "masjidName" | "-masjidName";

const SORT_VALUES: readonly SortValue[] = ["nextEventAt", "-nextEventAt", "lastSentAt", "-lastSentAt", "masjidName", "-masjidName"];
const FLOW_VALUES: readonly FlowFilter[] = ["unpublished", "published"];
const STATE_VALUES: readonly StateFilter[] = ["reminding", "allSent", "readyToPublish", "autoDeleted", "autoUnpublished", "ended"];

export interface ReminderFilters {
  searchText?: string;
  flow?: FlowFilter;
  state?: StateFilter;
  nextReminderWithinDays?: number;
  autoActionWithinDays?: number;
  /** yyyy-MM-dd, UTC */
  lastSentFrom?: string;
  lastSentTo?: string;
  deliveryFailed?: boolean;
  sort?: SortValue;
  pageNumber: number;
}

export type RawSearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined): string | undefined => (Array.isArray(value) ? value[0] : value);

const parsePositiveInt = (value: string | undefined, max = Number.MAX_SAFE_INTEGER): number | undefined => {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const number = Number(value);
  return number >= 1 && number <= max ? number : undefined;
};

const parseDate = (value: string | undefined): string | undefined => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? undefined : value;
};

/** Reads filters from a query string. Anything unknown or malformed is dropped, so a hand-edited URL never breaks the page. */
export function parseFilters(params: RawSearchParams): ReminderFilters {
  const searchText = first(params.searchText)?.trim().slice(0, 200);
  const flow = first(params.flow);
  const state = first(params.state);
  const sort = first(params.sort);

  return {
    searchText: searchText || undefined,
    flow: FLOW_VALUES.includes(flow as FlowFilter) ? (flow as FlowFilter) : undefined,
    state: STATE_VALUES.includes(state as StateFilter) ? (state as StateFilter) : undefined,
    nextReminderWithinDays: parsePositiveInt(first(params.nextReminderWithinDays), MAX_WITHIN_DAYS),
    autoActionWithinDays: parsePositiveInt(first(params.autoActionWithinDays), MAX_WITHIN_DAYS),
    lastSentFrom: parseDate(first(params.lastSentFrom)),
    lastSentTo: parseDate(first(params.lastSentTo)),
    deliveryFailed: first(params.deliveryFailed) === "true" ? true : undefined,
    sort: SORT_VALUES.includes(sort as SortValue) ? (sort as SortValue) : undefined,
    pageNumber: parsePositiveInt(first(params.pageNumber), 100_000) ?? 1,
  };
}

/** Applies a change and returns to the first page, unless the change is itself a page move. */
export function withChanges(filters: ReminderFilters, patch: Partial<ReminderFilters>): ReminderFilters {
  const next: ReminderFilters = { ...filters, ...patch };
  if (!("pageNumber" in patch)) next.pageNumber = 1;
  return next;
}

/** Query-string form for page URLs; defaults (page 1, no sort) are left out to keep URLs short. */
export function toSearchParams(filters: ReminderFilters): URLSearchParams {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | boolean | undefined) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  };

  set("searchText", filters.searchText);
  set("flow", filters.flow);
  set("state", filters.state);
  set("nextReminderWithinDays", filters.nextReminderWithinDays);
  set("autoActionWithinDays", filters.autoActionWithinDays);
  set("lastSentFrom", filters.lastSentFrom);
  set("lastSentTo", filters.lastSentTo);
  set("deliveryFailed", filters.deliveryFailed);
  set("sort", filters.sort);
  if (filters.pageNumber > 1) set("pageNumber", filters.pageNumber);
  return params;
}

export function hrefFor(filters: ReminderFilters): string {
  const query = toSearchParams(filters).toString();
  return query ? `${REMINDERS_PATH}?${query}` : REMINDERS_PATH;
}

export function detailHref(masjidId: number): string {
  return `${REMINDERS_PATH}/${masjidId}`;
}

/** Parameters for GET /api/v2/masjid-reminders. */
export function toApiQuery(filters: ReminderFilters): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  for (const [key, value] of toSearchParams(filters)) query[key] = value;
  query.pageNumber = filters.pageNumber;
  query.pageSize = PAGE_SIZE;
  return query;
}

export interface Preset {
  key: string;
  label: string;
  set: Partial<ReminderFilters>;
}

/** One-click views. Each sets exactly these filters (the search text and sort are kept). */
export const PRESETS: readonly Preset[] = [
  { key: "due-week", label: "Due this week", set: { nextReminderWithinDays: 7 } },
  { key: "action-soon", label: "Auto-action within 7 days", set: { autoActionWithinDays: 7 } },
  { key: "all-sent", label: "All reminders sent", set: { state: "allSent" } },
  { key: "ready", label: "Ready to publish", set: { state: "readyToPublish" } },
  { key: "ended", label: "Auto-deleted or unpublished", set: { state: "ended" } },
  { key: "failed", label: "Delivery failed", set: { deliveryFailed: true } },
];

const FILTER_KEYS = [
  "flow",
  "state",
  "nextReminderWithinDays",
  "autoActionWithinDays",
  "lastSentFrom",
  "lastSentTo",
  "deliveryFailed",
] as const satisfies readonly (keyof ReminderFilters)[];

type FilterKey = (typeof FILTER_KEYS)[number];

/** The filters other than search text, sort and page. */
function activeFilterKeys(filters: ReminderFilters): FilterKey[] {
  return FILTER_KEYS.filter((key) => filters[key] !== undefined);
}

export function isPresetActive(filters: ReminderFilters, preset: Preset): boolean {
  const active = activeFilterKeys(filters);
  const wanted = Object.keys(preset.set) as FilterKey[];
  return active.length === wanted.length && wanted.every((key) => filters[key] === preset.set[key]);
}

/** Filters with every non-search filter cleared, then the preset applied. */
export function applyPreset(filters: ReminderFilters, preset: Preset): ReminderFilters {
  const cleared: ReminderFilters = { searchText: filters.searchText, sort: filters.sort, pageNumber: 1 };
  return withChanges(cleared, preset.set);
}

export function clearPreset(filters: ReminderFilters): ReminderFilters {
  return withChanges({ searchText: filters.searchText, sort: filters.sort, pageNumber: 1 }, {});
}

export function activeFilterCount(filters: ReminderFilters): number {
  return activeFilterKeys(filters).length + (filters.searchText ? 1 : 0);
}

/** Filters that live in the collapsible panel, so it can start open when one of them is set. */
export function hasPanelFilters(filters: ReminderFilters): boolean {
  return activeFilterKeys(filters).some((key) => ["flow", "lastSentFrom", "lastSentTo"].includes(key)) || filters.sort !== undefined;
}

export interface ActiveTag {
  key: FilterKey | "searchText";
  label: string;
  /** What to change to remove this filter. */
  clear: Partial<ReminderFilters>;
}

const formatDay = (value: string) => value.split("-").reverse().join("/");

const STATE_LABELS: Record<StateFilter, string> = {
  reminding: "Reminding",
  allSent: "All reminders sent",
  readyToPublish: "Ready to publish",
  autoDeleted: "Auto-deleted",
  autoUnpublished: "Auto-unpublished",
  ended: "Auto-deleted or unpublished",
};

export function describeActive(filters: ReminderFilters): ActiveTag[] {
  const tags: ActiveTag[] = [];
  if (filters.searchText) tags.push({ key: "searchText", label: `Search: ${filters.searchText}`, clear: { searchText: undefined } });
  if (filters.flow) tags.push({ key: "flow", label: filters.flow === "unpublished" ? "Unpublished masajid" : "Published masajid", clear: { flow: undefined } });
  if (filters.state) tags.push({ key: "state", label: STATE_LABELS[filters.state], clear: { state: undefined } });
  if (filters.nextReminderWithinDays)
    tags.push({ key: "nextReminderWithinDays", label: `Reminder due within ${filters.nextReminderWithinDays} days`, clear: { nextReminderWithinDays: undefined } });
  if (filters.autoActionWithinDays)
    tags.push({ key: "autoActionWithinDays", label: `Auto-action within ${filters.autoActionWithinDays} days`, clear: { autoActionWithinDays: undefined } });
  if (filters.deliveryFailed) tags.push({ key: "deliveryFailed", label: "Delivery failed", clear: { deliveryFailed: undefined } });
  if (filters.lastSentFrom) tags.push({ key: "lastSentFrom", label: `Last sent from ${formatDay(filters.lastSentFrom)}`, clear: { lastSentFrom: undefined } });
  if (filters.lastSentTo) tags.push({ key: "lastSentTo", label: `Last sent to ${formatDay(filters.lastSentTo)}`, clear: { lastSentTo: undefined } });
  return tags;
}
