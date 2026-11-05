/**
 * Filters of the admin masjid list. The URL is the source of truth: the page reads them from the
 * query string, the filter bar writes them back, and the same names are sent to
 * GET /api/v2/masjids. No imports, so server and client code can both use it.
 */

export const PAGE_SIZE = 50;
export const MAX_EDITOR_INACTIVE_DAYS = 3650;

export type EditorsFilter = "none" | "noneActivated";

export type SortValue =
  | "name"
  | "-name"
  | "createdAt"
  | "-createdAt"
  | "publishedAt"
  | "-publishedAt"
  | "deletedAt"
  | "-deletedAt";

const SORT_VALUES: readonly SortValue[] = [
  "name",
  "-name",
  "createdAt",
  "-createdAt",
  "publishedAt",
  "-publishedAt",
  "deletedAt",
  "-deletedAt",
];

export interface MasjidFilters {
  searchText?: string;
  isPublished?: boolean;
  editors?: EditorsFilter;
  editorInactiveDays?: number;
  readyToPublish?: boolean;
  hasSalahTimes?: boolean;
  hasDevices?: boolean;
  countryId?: number;
  cityId?: number;
  /** yyyy-MM-dd, UTC */
  createdFrom?: string;
  createdTo?: string;
  deleted?: boolean;
  sort?: SortValue;
  pageNumber: number;
}

export type RawSearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const parseBool = (value: string | undefined): boolean | undefined =>
  value === "true" ? true : value === "false" ? false : undefined;

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
export function parseFilters(params: RawSearchParams): MasjidFilters {
  const searchText = first(params.searchText)?.trim().slice(0, 200);
  const editors = first(params.editors);
  const sort = first(params.sort);

  const filters: MasjidFilters = {
    searchText: searchText || undefined,
    isPublished: parseBool(first(params.isPublished)),
    editors: editors === "none" || editors === "noneActivated" ? editors : undefined,
    editorInactiveDays: parsePositiveInt(first(params.editorInactiveDays), MAX_EDITOR_INACTIVE_DAYS),
    readyToPublish: first(params.readyToPublish) === "true" ? true : undefined,
    hasSalahTimes: parseBool(first(params.hasSalahTimes)),
    hasDevices: parseBool(first(params.hasDevices)),
    countryId: parsePositiveInt(first(params.countryId)),
    cityId: parsePositiveInt(first(params.cityId)),
    createdFrom: parseDate(first(params.createdFrom)),
    createdTo: parseDate(first(params.createdTo)),
    deleted: first(params.deleted) === "true" ? true : undefined,
    sort: SORT_VALUES.includes(sort as SortValue) ? (sort as SortValue) : undefined,
    pageNumber: parsePositiveInt(first(params.pageNumber), 100_000) ?? 1,
  };

  // The API rejects deletedAt sorting outside the deleted view, and a city only makes sense with its country.
  if (!filters.deleted && filters.sort?.endsWith("deletedAt")) filters.sort = undefined;
  if (filters.cityId && !filters.countryId) filters.cityId = undefined;
  return filters;
}

/** Applies a change and returns to the first page, unless the change is itself a page move. */
export function withChanges(filters: MasjidFilters, patch: Partial<MasjidFilters>): MasjidFilters {
  const next: MasjidFilters = { ...filters, ...patch };
  if (!("pageNumber" in patch)) next.pageNumber = 1;
  if (!("cityId" in patch) && "countryId" in patch && patch.countryId !== filters.countryId) next.cityId = undefined;
  if (next.cityId && !next.countryId) next.cityId = undefined;
  // Leaving the deleted view while sorted by deletion date would be an invalid request.
  if (!next.deleted && next.sort?.endsWith("deletedAt")) next.sort = undefined;
  return next;
}

/** Query-string form for page URLs; defaults (page 1, no sort) are left out to keep URLs short. */
export function toSearchParams(filters: MasjidFilters): URLSearchParams {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | boolean | undefined) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  };

  set("searchText", filters.searchText);
  set("isPublished", filters.isPublished);
  set("editors", filters.editors);
  set("editorInactiveDays", filters.editorInactiveDays);
  set("readyToPublish", filters.readyToPublish);
  set("hasSalahTimes", filters.hasSalahTimes);
  set("hasDevices", filters.hasDevices);
  set("countryId", filters.countryId);
  set("cityId", filters.cityId);
  set("createdFrom", filters.createdFrom);
  set("createdTo", filters.createdTo);
  set("deleted", filters.deleted);
  set("sort", filters.sort);
  if (filters.pageNumber > 1) set("pageNumber", filters.pageNumber);
  return params;
}

export function hrefFor(filters: MasjidFilters): string {
  const query = toSearchParams(filters).toString();
  return query ? `/?${query}` : "/";
}

/** Parameters for GET /api/v2/masjids. */
export function toApiQuery(filters: MasjidFilters): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  for (const [key, value] of toSearchParams(filters)) query[key] = value;
  query.pageNumber = filters.pageNumber;
  query.pageSize = PAGE_SIZE;
  return query;
}

export interface Preset {
  key: string;
  label: string;
  set: Partial<MasjidFilters>;
}

/** One-click views. Each sets exactly these filters (the search text is kept). */
export const PRESETS: readonly Preset[] = [
  { key: "ready", label: "Ready to publish", set: { readyToPublish: true } },
  { key: "no-editors", label: "No editors", set: { editors: "none" } },
  { key: "no-activated", label: "No activated editor", set: { editors: "noneActivated" } },
  { key: "published-no-editors", label: "Published, no editors", set: { isPublished: true, editors: "none" } },
  { key: "inactive-6m", label: "Published, editors inactive 6 months", set: { isPublished: true, editorInactiveDays: 180 } },
  { key: "no-salah", label: "No salah times", set: { hasSalahTimes: false } },
  { key: "no-devices", label: "No devices linked", set: { hasDevices: false } },
  { key: "deleted", label: "Deleted (restorable)", set: { deleted: true } },
];

const FILTER_KEYS = [
  "isPublished",
  "editors",
  "editorInactiveDays",
  "readyToPublish",
  "hasSalahTimes",
  "hasDevices",
  "countryId",
  "cityId",
  "createdFrom",
  "createdTo",
  "deleted",
] as const satisfies readonly (keyof MasjidFilters)[];

type FilterKey = (typeof FILTER_KEYS)[number];

/** The filters other than search text, sort and page. */
function activeFilterKeys(filters: MasjidFilters): FilterKey[] {
  return FILTER_KEYS.filter((key) => filters[key] !== undefined);
}

export function isPresetActive(filters: MasjidFilters, preset: Preset): boolean {
  const active = activeFilterKeys(filters);
  const wanted = Object.keys(preset.set) as FilterKey[];
  return active.length === wanted.length && wanted.every((key) => filters[key] === preset.set[key]);
}

/** Filters with every non-search filter cleared, then the preset applied. */
export function applyPreset(filters: MasjidFilters, preset: Preset): MasjidFilters {
  const cleared: MasjidFilters = { searchText: filters.searchText, sort: filters.sort, pageNumber: 1 };
  return withChanges(cleared, preset.set);
}

export function clearPreset(filters: MasjidFilters): MasjidFilters {
  return withChanges({ searchText: filters.searchText, sort: filters.sort, pageNumber: 1 }, {});
}

export function activeFilterCount(filters: MasjidFilters): number {
  return activeFilterKeys(filters).length + (filters.searchText ? 1 : 0);
}

/** Filters that live in the collapsible panel, so it can start open when one of them is set. */
export function hasPanelFilters(filters: MasjidFilters): boolean {
  return activeFilterKeys(filters).some((key) => !["isPublished", "deleted", "readyToPublish"].includes(key));
}

export interface ActiveTag {
  key: FilterKey | "searchText";
  label: string;
  /** What to change to remove this filter. */
  clear: Partial<MasjidFilters>;
}

const formatDay = (value: string) => value.split("-").reverse().join("/");

export function describeActive(
  filters: MasjidFilters,
  names: { country?: string; city?: string } = {},
): ActiveTag[] {
  const tags: ActiveTag[] = [];
  if (filters.searchText) tags.push({ key: "searchText", label: `Search: ${filters.searchText}`, clear: { searchText: undefined } });
  if (filters.deleted) tags.push({ key: "deleted", label: "Deleted", clear: { deleted: undefined } });
  if (filters.isPublished !== undefined)
    tags.push({ key: "isPublished", label: filters.isPublished ? "Published" : "Unpublished", clear: { isPublished: undefined } });
  if (filters.editors)
    tags.push({ key: "editors", label: filters.editors === "none" ? "No editors" : "No activated editor", clear: { editors: undefined } });
  if (filters.editorInactiveDays)
    tags.push({ key: "editorInactiveDays", label: `Editors inactive ${filters.editorInactiveDays}+ days`, clear: { editorInactiveDays: undefined } });
  if (filters.readyToPublish) tags.push({ key: "readyToPublish", label: "Ready to publish", clear: { readyToPublish: undefined } });
  if (filters.hasSalahTimes !== undefined)
    tags.push({ key: "hasSalahTimes", label: filters.hasSalahTimes ? "Has salah times" : "No salah times", clear: { hasSalahTimes: undefined } });
  if (filters.hasDevices !== undefined)
    tags.push({ key: "hasDevices", label: filters.hasDevices ? "Has devices" : "No devices linked", clear: { hasDevices: undefined } });
  if (filters.countryId)
    tags.push({ key: "countryId", label: names.country ?? "Country", clear: { countryId: undefined, cityId: undefined } });
  if (filters.cityId) tags.push({ key: "cityId", label: names.city ?? "City", clear: { cityId: undefined } });
  if (filters.createdFrom) tags.push({ key: "createdFrom", label: `From ${formatDay(filters.createdFrom)}`, clear: { createdFrom: undefined } });
  if (filters.createdTo) tags.push({ key: "createdTo", label: `To ${formatDay(filters.createdTo)}`, clear: { createdTo: undefined } });
  return tags;
}
