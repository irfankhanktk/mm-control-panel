import type { MasjidListItem } from "@/lib/mm-api/masjid-types";

export type FlagTone = "bad" | "warn" | "ok" | "info";

export interface RowFlag {
  tone: FlagTone;
  label: string;
}

const MS_PER_DAY = 86_400_000;
/** Below this a published masjid's editors are not worth flagging. */
const INACTIVE_FLAG_AFTER_DAYS = 30;

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getUTCFullYear()}`;
}

export function formatAddress(item: Pick<MasjidListItem, "house" | "street" | "postalCode">): string {
  return [item.house, item.street, item.postalCode].map((part) => part?.trim()).filter(Boolean).join(", ");
}

/** Why a row matched: the same conditions the filters and the reminder jobs use. */
export function rowFlags(item: MasjidListItem, now: number): RowFlag[] {
  if (item.deletedAt) {
    return [
      { tone: "bad", label: `Deleted ${formatDate(item.deletedAt)}` },
      { tone: "info", label: "Restorable" },
    ];
  }

  const flags: RowFlag[] = [];
  const { total, activated, lastLoginAt } = item.editors;

  if (total === 0) flags.push({ tone: "bad", label: "No editors" });
  else if (activated === 0) flags.push({ tone: "warn", label: "Not activated" });

  if (item.isPublished && total > 0) {
    if (!lastLoginAt) {
      flags.push({ tone: "warn", label: "Never logged in" });
    } else {
      const days = Math.floor((now - new Date(lastLoginAt).getTime()) / MS_PER_DAY);
      if (days >= INACTIVE_FLAG_AFTER_DAYS) flags.push({ tone: "warn", label: `Inactive ${days}d` });
    }
  }

  if (item.salahTimeCount === 0) flags.push({ tone: "warn", label: "No salah times" });
  if (item.deviceCount === 0) flags.push({ tone: "info", label: "No devices" });
  if (item.isReadyToPublish) flags.push({ tone: "ok", label: "Ready to publish" });
  return flags;
}

/** "8 masajid found": how many match the current filters, across all pages. */
export function resultCountText(total: number, deleted: boolean): string {
  const noun = total === 1 ? "masjid" : "masajid";
  return `${total.toLocaleString("en-GB")} ${deleted ? "deleted " : ""}${noun} found`;
}
