import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PRESETS,
  activeFilterCount,
  applyPreset,
  clearPreset,
  describeActive,
  hasPanelFilters,
  hrefFor,
  isPresetActive,
  parseFilters,
  toApiQuery,
  withChanges,
} from "../src/lib/masjids/filters.ts";
import { formatAddress, formatDate, resultCountText, rowFlags } from "../src/lib/masjids/row-flags.ts";
import type { MasjidListItem } from "../src/lib/mm-api/masjid-types.ts";

const preset = (key: string) => PRESETS.find((p) => p.key === key)!;

describe("parseFilters", () => {
  it("returns only the first page for an empty query", () => {
    assert.deepEqual(JSON.parse(JSON.stringify(parseFilters({}))), { pageNumber: 1 });
  });

  it("reads every filter", () => {
    const f = parseFilters({
      searchText: "  bolton ",
      isPublished: "true",
      editors: "noneActivated",
      editorInactiveDays: "180",
      readyToPublish: "true",
      hasSalahTimes: "false",
      hasDevices: "true",
      countryId: "4",
      cityId: "9",
      createdFrom: "2026-01-31",
      createdTo: "2026-02-28",
      deleted: "true",
      sort: "-deletedAt",
      pageNumber: "3",
    });
    assert.equal(f.searchText, "bolton");
    assert.equal(f.isPublished, true);
    assert.equal(f.editors, "noneActivated");
    assert.equal(f.editorInactiveDays, 180);
    assert.equal(f.hasSalahTimes, false);
    assert.equal(f.hasDevices, true);
    assert.equal(f.countryId, 4);
    assert.equal(f.cityId, 9);
    assert.equal(f.createdFrom, "2026-01-31");
    assert.equal(f.deleted, true);
    assert.equal(f.sort, "-deletedAt");
    assert.equal(f.pageNumber, 3);
  });

  it("drops malformed values instead of failing", () => {
    const f = parseFilters({
      isPublished: "maybe",
      editors: "everyone",
      editorInactiveDays: "0",
      countryId: "-3",
      createdFrom: "2026-02-30",
      createdTo: "yesterday",
      sort: "city",
      pageNumber: "abc",
    });
    assert.equal(f.isPublished, undefined);
    assert.equal(f.editors, undefined);
    assert.equal(f.editorInactiveDays, undefined);
    assert.equal(f.countryId, undefined);
    assert.equal(f.createdFrom, undefined);
    assert.equal(f.createdTo, undefined);
    assert.equal(f.sort, undefined);
    assert.equal(f.pageNumber, 1);
  });

  it("caps inactive days at the API limit", () => {
    assert.equal(parseFilters({ editorInactiveDays: "3651" }).editorInactiveDays, undefined);
    assert.equal(parseFilters({ editorInactiveDays: "3650" }).editorInactiveDays, 3650);
  });

  it("ignores a deletedAt sort outside the deleted view and a city without a country", () => {
    assert.equal(parseFilters({ sort: "deletedAt" }).sort, undefined);
    assert.equal(parseFilters({ cityId: "5" }).cityId, undefined);
  });

  it("takes the first value when a parameter is repeated", () => {
    assert.equal(parseFilters({ isPublished: ["true", "false"] }).isPublished, true);
  });
});

describe("withChanges / hrefFor / toApiQuery", () => {
  it("goes back to page 1 when a filter changes, but not on a page move", () => {
    const base = parseFilters({ pageNumber: "4" });
    assert.equal(withChanges(base, { isPublished: true }).pageNumber, 1);
    assert.equal(withChanges(base, { pageNumber: 5 }).pageNumber, 5);
  });

  it("clears the city when the country changes", () => {
    const base = parseFilters({ countryId: "1", cityId: "7" });
    assert.equal(withChanges(base, { countryId: 2 }).cityId, undefined);
    assert.equal(withChanges(base, { countryId: undefined }).cityId, undefined);
    assert.equal(withChanges(base, { cityId: 8 }).cityId, 8);
  });

  it("drops a deletedAt sort when leaving the deleted view", () => {
    const base = parseFilters({ deleted: "true", sort: "-deletedAt" });
    assert.equal(withChanges(base, { deleted: undefined }).sort, undefined);
  });

  it("builds short URLs without defaults", () => {
    assert.equal(hrefFor(parseFilters({})), "/");
    assert.equal(
      hrefFor(parseFilters({ isPublished: "true", editors: "none", pageNumber: "2" })),
      "/?isPublished=true&editors=none&pageNumber=2",
    );
  });

  it("round-trips through the URL", () => {
    const f = parseFilters({ searchText: "a b&c", countryId: "3", cityId: "4", createdFrom: "2026-03-01", hasDevices: "false" });
    const url = new URL(hrefFor(f), "http://x");
    assert.deepEqual(parseFilters(Object.fromEntries(url.searchParams)), f);
  });

  it("sends the API parameter names, page number and page size", () => {
    const q = toApiQuery(parseFilters({ isPublished: "true", editorInactiveDays: "180", searchText: "x" }));
    assert.deepEqual(q, { searchText: "x", isPublished: "true", editorInactiveDays: "180", pageNumber: 1, pageSize: 50 });
  });
});

describe("presets", () => {
  it("applying a preset replaces other filters but keeps the search", () => {
    const f = applyPreset(parseFilters({ searchText: "x", hasDevices: "false", countryId: "2" }), preset("no-editors"));
    assert.equal(f.searchText, "x");
    assert.equal(f.editors, "none");
    assert.equal(f.hasDevices, undefined);
    assert.equal(f.countryId, undefined);
  });

  it("is active only when exactly its filters are set", () => {
    const p = preset("published-no-editors");
    assert.equal(isPresetActive(parseFilters({ isPublished: "true", editors: "none" }), p), true);
    assert.equal(isPresetActive(parseFilters({ editors: "none" }), p), false);
    assert.equal(isPresetActive(parseFilters({ isPublished: "true", editors: "none", hasDevices: "false" }), p), false);
    assert.equal(isPresetActive(parseFilters({ isPublished: "true", editors: "none", searchText: "q", sort: "name" }), p), true);
  });

  it("clearing removes the filters but keeps search and sort", () => {
    const f = clearPreset(parseFilters({ searchText: "x", sort: "name", editors: "none" }));
    assert.equal(f.editors, undefined);
    assert.equal(f.searchText, "x");
    assert.equal(f.sort, "name");
  });

  it("matches the 'published, editors inactive 6 months' request from the brief", () => {
    const f = applyPreset(parseFilters({}), preset("inactive-6m"));
    assert.equal(f.isPublished, true);
    assert.equal(f.editorInactiveDays, 180);
    assert.equal(f.pageNumber, 1);
  });
});

describe("describeActive / counts", () => {
  it("lists each applied filter with what removes it", () => {
    const f = parseFilters({ isPublished: "false", countryId: "3", cityId: "4", createdFrom: "2026-01-02" });
    const tags = describeActive(f, { country: "Sweden", city: "Malmö" });
    assert.deepEqual(tags.map((t) => t.label), ["Unpublished", "Sweden", "Malmö", "From 02/01/2026"]);
    assert.deepEqual(tags.find((t) => t.key === "countryId")!.clear, { countryId: undefined, cityId: undefined });
  });

  it("counts search text as a filter", () => {
    assert.equal(activeFilterCount(parseFilters({ searchText: "x", hasDevices: "false" })), 2);
  });

  it("opens the panel only for filters that live in it", () => {
    assert.equal(hasPanelFilters(parseFilters({ isPublished: "true", deleted: "true" })), false);
    assert.equal(hasPanelFilters(parseFilters({ hasDevices: "true" })), true);
  });
});

const item = (over: Partial<MasjidListItem> = {}): MasjidListItem => ({
  id: 1,
  name: "Masjid",
  city: { id: 1, name: "Bolton" },
  country: { id: 1, name: "UK" },
  house: null,
  street: null,
  postalCode: null,
  primaryLanguage: null,
  secondaryLanguage: null,
  isPublished: true,
  publishedAt: null,
  createdAt: null,
  deletedAt: null,
  editors: { total: 1, activated: 1, lastLoginAt: "2026-10-20T10:00:00Z" },
  salahTimeCount: 5,
  deviceCount: 2,
  isReadyToPublish: false,
  ...over,
});
const NOW = Date.parse("2026-10-27T00:00:00Z");
const labels = (i: MasjidListItem) => rowFlags(i, NOW).map((f) => f.label);

describe("rowFlags", () => {
  it("has no flags for a healthy masjid", () => assert.deepEqual(labels(item()), []));

  it("flags missing editors and activation", () => {
    assert.deepEqual(labels(item({ editors: { total: 0, activated: 0, lastLoginAt: null } })), ["No editors"]);
    assert.deepEqual(labels(item({ isPublished: false, editors: { total: 2, activated: 0, lastLoginAt: null } })), ["Not activated"]);
  });

  it("flags inactive editors of published masajid only", () => {
    const stale = { total: 1, activated: 1, lastLoginAt: "2026-03-01T00:00:00Z" };
    assert.deepEqual(labels(item({ editors: stale })), ["Inactive 240d"]);
    assert.deepEqual(labels(item({ isPublished: false, editors: stale })), []);
    assert.deepEqual(labels(item({ editors: { total: 1, activated: 1, lastLoginAt: null } })), ["Never logged in"]);
  });

  it("flags missing salah times and devices and readiness", () => {
    assert.deepEqual(labels(item({ isPublished: false, salahTimeCount: 0, deviceCount: 0 })), ["No salah times", "No devices"]);
    assert.deepEqual(labels(item({ isPublished: false, isReadyToPublish: true })), ["Ready to publish"]);
  });

  it("shows only the deletion for deleted masajid", () => {
    assert.deepEqual(labels(item({ deletedAt: "2026-10-14T08:00:00Z" })), ["Deleted 14/10/2026", "Restorable"]);
  });
});

describe("formatting", () => {
  it("formats dates as dd/mm/yyyy in UTC and tolerates missing values", () => {
    assert.equal(formatDate("2026-10-22T23:30:00Z"), "22/10/2026");
    assert.equal(formatDate(null), "-");
    assert.equal(formatDate("garbage"), "-");
  });

  it("joins the address parts that exist", () => {
    assert.equal(formatAddress({ house: "12", street: "Leeds Road", postalCode: "BD3 9LH" }), "12, Leeds Road, BD3 9LH");
    assert.equal(formatAddress({ house: " ", street: null, postalCode: "272001" }), "272001");
    assert.equal(formatAddress({ house: null, street: null, postalCode: null }), "");
  });

  it("words the result count with the right singular and plural", () => {
    assert.equal(resultCountText(8, false), "8 masajid found");
    assert.equal(resultCountText(1, false), "1 masjid found");
    assert.equal(resultCountText(0, false), "0 masajid found");
    assert.equal(resultCountText(1234, false), "1,234 masajid found");
    assert.equal(resultCountText(10, true), "10 deleted masajid found");
  });
});
