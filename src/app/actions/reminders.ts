"use server";

import { revalidatePath } from "next/cache";
import { ROLES } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import { resendReminder } from "@/lib/mm-api/reminders";

export interface ResendState {
  ok: boolean;
  message: string;
}

// The previous state is part of the useActionState signature even though this action ignores it.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function resendReminderAction(masjidId: number, _previous: ResendState | undefined): Promise<ResendState> {
  // Server actions are public endpoints: check the role here, not only in the UI.
  await requireSession([ROLES.Admin]);

  if (!Number.isSafeInteger(masjidId) || masjidId < 1) return { ok: false, message: "That masjid id is not valid." };

  const result = await resendReminder(masjidId);
  if (!result.ok) return { ok: false, message: result.message };

  revalidatePath("/reminders");
  revalidatePath(`/reminders/${masjidId}`);

  const { reminderNumber, recipients } = result.response;
  const editors = recipients === 1 ? "1 editor" : `${recipients} editors`;
  return { ok: true, message: `Reminder ${reminderNumber} is being sent again to ${editors}. The result appears in the history in a minute or two.` };
}
