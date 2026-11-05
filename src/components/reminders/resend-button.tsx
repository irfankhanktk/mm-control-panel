"use client";

import { useActionState, useState } from "react";
import { resendReminderAction } from "@/app/actions/reminders";

interface Props {
  masjidId: number;
  masjidName: string;
  reminderNumber: number;
  recipients: number;
}

/** Resend with an in-page confirmation (the browser's confirm() dialog is not used). */
export function ResendButton({ masjidId, masjidName, reminderNumber, recipients }: Props) {
  const [state, formAction, pending] = useActionState(resendReminderAction.bind(null, masjidId), undefined);
  const [confirming, setConfirming] = useState(false);

  if (state?.ok) {
    return (
      <p role="status" className="rounded-md bg-teal/15 px-4 py-3 text-sm text-emerald-900">
        {state.message}
      </p>
    );
  }

  const editors = recipients === 1 ? "1 editor" : `${recipients} editors`;

  return (
    <div className="space-y-3">
      {confirming ? (
        <form action={formAction} className="rounded-md border border-line bg-canvas p-4">
          <p className="text-sm">
            Send reminder {reminderNumber} again to {editors} of <span className="font-medium">{masjidName}</span>? None of them received it the first time.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded bg-brand px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Sending…" : "Send again"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(false)}
              className="rounded border border-line bg-white px-3.5 py-2 text-sm font-medium text-ink hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded bg-brand px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Resend reminder {reminderNumber}
        </button>
      )}

      {state && !state.ok ? (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
