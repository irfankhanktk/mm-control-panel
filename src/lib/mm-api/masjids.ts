import "server-only";
import { toApiQuery, type MasjidFilters } from "@/lib/masjids/filters";
import type { Lookup, MasjidListResponse, MasjidSummary } from "./masjid-types";
import { authorized, readJson, readProblem } from "./request";

export { MmApiError } from "./request";

export interface MasjidListResult extends MasjidListResponse {
  /** When the page was fetched (ms since epoch); "inactive for N days" is measured against it. */
  fetchedAt: number;
}

/** GET /api/v2/masjids */
export async function listMasjids(filters: MasjidFilters): Promise<MasjidListResult> {
  const page = await readJson<MasjidListResponse>(await authorized("/api/v2/masjids", { searchParams: toApiQuery(filters) }));
  return { ...page, fetchedAt: Date.now() };
}

/** GET /api/v2/masjids/summary */
export async function getMasjidSummary(): Promise<MasjidSummary> {
  return readJson(await authorized("/api/v2/masjids/summary"));
}

/** GET /api/v2/masjids/countries: countries that have at least one live masjid. */
export async function listMasjidCountries(): Promise<Lookup[]> {
  return readJson(await authorized("/api/v2/masjids/countries"));
}

/** GET /api/v2/masjids/cities?countryId= */
export async function listMasjidCities(countryId: number): Promise<Lookup[]> {
  return readJson(await authorized("/api/v2/masjids/cities", { searchParams: { countryId } }));
}

/** POST /api/v2/masjids/{id}/restore (204 on success). */
export async function restoreMasjid(id: number): Promise<{ ok: true } | { ok: false; message: string }> {
  const response = await authorized(`/api/v2/masjids/${id}/restore`, { method: "POST" });
  if (response.ok) return { ok: true };

  const problem = await readProblem(response);
  return { ok: false, message: problem?.detail ?? "The masjid could not be restored." };
}
