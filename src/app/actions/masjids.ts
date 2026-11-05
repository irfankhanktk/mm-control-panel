"use server";

import { revalidatePath } from "next/cache";
import { ROLES } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import { restoreMasjid } from "@/lib/mm-api/masjids";

export interface RestoreState {
  ok: boolean;
  message?: string;
}

// The previous state is part of the useActionState signature even though this action ignores it.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function restoreMasjidAction(id: number, _previous: RestoreState | undefined): Promise<RestoreState> {
  // Server actions are public endpoints: check the role here, not only in the UI.
  await requireSession([ROLES.Admin]);

  if (!Number.isSafeInteger(id) || id < 1) return { ok: false, message: "That masjid id is not valid." };

  const result = await restoreMasjid(id);
  if (!result.ok) return { ok: false, message: result.message };

  revalidatePath("/");
  return { ok: true };
}
