import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PRESETS,
  activeFilterCount,
  applyPreset,
  clearPreset,
  describeActive,
  detailHref,
  hasPanelFilters,
  hrefFor,
  isPresetActive,
  parseFilters,
  toApiQuery,
  withChanges,
} from "../src/lib/reminders/filters.ts";

const preset = (key: string) => PRESETS.find((p) => p.key === key)!;

describe("parseFilters", () => {
  it("returns only the first page for an empty query", () => {
    assert.deepEqual(JSON.parse(JSON.stringify(parseFilters({}))), { pageNumber: 1 });
  });

  it("reads every filter", () => {
    const f = parseFilters({
      searchText: "  noor ",
      flow: "published",
      state: "allSent",
      nextReminderWithinDays: "7",
      autoActionWithinDays: "30",
      lastSentFrom: "2026-10-01",
      lastSentTo: "2026-10-31",
      deliveryFailed: "true",
      sort: "-lastSentAt",
      pageNumber: "3",
    });

    assert.equal(f.searchText, "noor");
    assert.equal(f.flow, "published");
    assert.equal(f.state, "allSent");
    assert.equal(f.nextReminderWithinDays, 7);
    assert.equal(f.autoActionWithinDays, 30);
    assert.equal(f.lastSentFrom, "2026-10-01");
    assert.equal(f.lastSentTo, "2026-10-31");
    assert.equal(f.deliveryFailed, true);
    assert.equal(f.sort, "-lastSentAt");
    assert.equal(f.pageNumber, 3);
  });

  it("drops anything unknown or malformed", () => {
    const f = parseFilters({
      flow: "everything",
      state: "weird",
      nextReminderWithinDays: "0",
      autoActionWithinDays: "91",
      lastSentFrom: "2026-02-31",
      lastSentTo: "yesterday",
      deliveryFailed: "false",
      sort: "createdAt",
      pageNumber: "-4",
    });

    assert.deepEqual(JSON.parse(JSON.stringify(f)), { pageNumber: 1 });
  });

  it("takes the first value when a parameter repeats", () => {
    assert.equal(parseFilters({ flow: ["unpublished", "published"] }).flow, "unpublished");
  });

  it("caps the search text", () => {
    assert.equal(parseFilters({ searchText: "a".repeat(500) }).searchText?.length, 200);
  });
});

describe("withChanges", () => {
  it("goes back to the first page unless the change is a page move", () => {
    assert.equal(withChanges({ pageNumber: 4 }, { flow: "published" }).pageNumber, 1);
    assert.equal(withChanges({ pageNumber: 4 }, { pageNumber: 5 }).pageNumber, 5);
  });
});

describe("hrefFor and toApiQuery", () => {
  it("leaves defaults out of page URLs", () => {
    assert.equal(hrefFor({ pageNumber: 1 }), "/reminders");
    assert.equal(hrefFor({ pageNumber: 2, state: "ended", sort: "masjidName" }), "/reminders?state=ended&sort=masjidName&pageNumber=2");
  });

  it("sends the same names to the API with the page size", () => {
    assert.deepEqual(toApiQuery({ pageNumber: 2, flow: "published", deliveryFailed: true }), {
      flow: "published",
      deliveryFailed: "true",
      pageNumber: 2,
      pageSize: 50,
    });
  });

  it("builds the trace page URL", () => {
    assert.equal(detailHref(42), "/reminders/42");
  });
});

describe("presets", () => {
  it("marks a preset active only when exactly its filters are set", () => {
    assert.equal(isPresetActive({ pageNumber: 1, nextReminderWithinDays: 7 }, preset("due-week")), true);
    assert.equal(isPresetActive({ pageNumber: 1, nextReminderWithinDays: 7, flow: "published" }, preset("due-week")), false);
    assert.equal(isPresetActive({ pageNumber: 1 }, preset("due-week")), false);
  });

  it("replaces the other filters but keeps the search and the sort", () => {
    const next = applyPreset({ pageNumber: 3, searchText: "noor", sort: "masjidName", flow: "published", state: "allSent" }, preset("failed"));

    assert.deepEqual(JSON.parse(JSON.stringify(next)), { searchText: "noor", sort: "masjidName", deliveryFailed: true, pageNumber: 1 });
  });

  it("clears the filters of the active preset", () => {
    const cleared = clearPreset({ pageNumber: 2, searchText: "noor", state: "ended" });

    assert.deepEqual(JSON.parse(JSON.stringify(cleared)), { searchText: "noor", pageNumber: 1 });
  });
});

describe("active filter helpers", () => {
  it("counts the search text and every other filter", () => {
    assert.equal(activeFilterCount({ pageNumber: 1 }), 0);
    assert.equal(activeFilterCount({ pageNumber: 1, searchText: "noor", state: "ended", deliveryFailed: true }), 3);
  });

  it("opens the panel only for filters that live in it", () => {
    assert.equal(hasPanelFilters({ pageNumber: 1, state: "ended" }), false);
    assert.equal(hasPanelFilters({ pageNumber: 1, flow: "published" }), true);
    assert.equal(hasPanelFilters({ pageNumber: 1, lastSentFrom: "2026-10-01" }), true);
    assert.equal(hasPanelFilters({ pageNumber: 1, sort: "masjidName" }), true);
  });

  it("describes each filter with what clears it", () => {
    const tags = describeActive({ pageNumber: 1, searchText: "noor", flow: "unpublished", state: "readyToPublish", nextReminderWithinDays: 7, lastSentFrom: "2026-10-01" });

    assert.deepEqual(
      tags.map((tag) => tag.label),
      ["Search: noor", "Unpublished masajid", "Ready to publish", "Reminder due within 7 days", "Last sent from 01/10/2026"],
    );
    assert.deepEqual(tags[1].clear, { flow: undefined });
  });
});
