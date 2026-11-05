import Link from "next/link";
import { hrefFor, withChanges, type MasjidFilters, type SortValue } from "@/lib/masjids/filters";
import { formatAddress, formatDate, rowFlags, type FlagTone } from "@/lib/masjids/row-flags";
import type { MasjidListItem } from "@/lib/mm-api/masjid-types";
import { RestoreButton } from "./restore-button";

const FLAG_CLASSES: Record<FlagTone, string> = {
  bad: "bg-danger-soft text-danger",
  warn: "bg-amber-100 text-amber-900",
  ok: "bg-teal/15 text-emerald-900",
  info: "bg-brand-soft text-brand-dark",
};

function SortHeader({
  label,
  field,
  filters,
}: {
  label: string;
  field: "publishedAt" | "createdAt";
  filters: MasjidFilters;
}) {
  const current = filters.sort ?? "-createdAt";
  const active = current === field || current === `-${field}`;
  const next: SortValue = current === `-${field}` ? field : (`-${field}` as SortValue);

  return (
    <Link
      href={hrefFor(withChanges(filters, { sort: next }))}
      className="inline-flex items-center gap-1 rounded hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      {label}
      <span aria-hidden="true" className={active ? "text-brand" : "text-muted"}>
        {active ? (current.startsWith("-") ? "↓" : "↑") : "⇅"}
      </span>
      <span className="sr-only">
        {active ? (current.startsWith("-") ? ", sorted newest first" : ", sorted oldest first") : ", not sorted"}
      </span>
    </Link>
  );
}

export function MasjidTable({ items, filters, now }: { items: MasjidListItem[]; filters: MasjidFilters; now: number }) {
  const deletedView = filters.deleted === true;

  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
        <caption className="sr-only">Masajid matching the current filters</caption>
        <thead>
          <tr className="border-b border-line text-[13px] tracking-wide uppercase">
            <th scope="col" className="px-2.5 py-3.5 font-medium">Masjid</th>
            <th scope="col" className="px-2.5 py-3.5 font-medium">Address</th>
            <th scope="col" className="px-2.5 py-3.5 font-medium">City</th>
            <th scope="col" className="px-2.5 py-3.5 font-medium">Country</th>
            <th scope="col" className="px-2.5 py-3.5 font-medium">Editors</th>
            <th scope="col" className="px-2.5 py-3.5 font-medium">Flags</th>
            <th scope="col" className="px-2.5 py-3.5 font-medium">
              <SortHeader label="Published" field="publishedAt" filters={filters} />
            </th>
            <th scope="col" className="px-2.5 py-3.5 font-medium">
              <SortHeader label="Created" field="createdAt" filters={filters} />
            </th>
            {deletedView ? <th scope="col" className="px-2.5 py-3.5 font-medium">Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const { total, activated } = item.editors;
            return (
              <tr key={item.id} className="border-b border-line align-middle even:bg-canvas/60">
                <td dir="auto" className="px-2.5 py-3.5 font-normal">{item.name}</td>
                <td dir="auto" className="max-w-56 px-2.5 py-3.5 font-light">{formatAddress(item) || "-"}</td>
                <td dir="auto" className="px-2.5 py-3.5 font-light">{item.city.name}</td>
                <td className="px-2.5 py-3.5 font-light">{item.country.name}</td>
                <td className="px-2.5 py-3.5 font-light whitespace-nowrap tabular-nums">
                  {total === 0 ? (
                    <span className="text-muted">0</span>
                  ) : (
                    <>
                      {total} <span className="text-muted">({activated} active)</span>
                    </>
                  )}
                </td>
                <td className="px-2.5 py-3.5">
                  <ul className="flex flex-wrap gap-1">
                    {rowFlags(item, now).map((flag) => (
                      <li key={flag.label} className={`rounded px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${FLAG_CLASSES[flag.tone]}`}>
                        {flag.label}
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="px-2.5 py-3.5 font-light tabular-nums">{formatDate(item.publishedAt)}</td>
                <td className="px-2.5 py-3.5 font-light tabular-nums">{formatDate(item.createdAt)}</td>
                {deletedView ? (
                  <td className="px-2.5 py-3.5">
                    <RestoreButton id={item.id} name={item.name} />
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
