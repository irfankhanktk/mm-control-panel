"use client";

import { useActionState } from "react";
import { restoreMasjidAction } from "@/app/actions/masjids";

export function RestoreButton({ id, name }: { id: number; name: string }) {
  const [state, formAction, pending] = useActionState(restoreMasjidAction.bind(null, id), undefined);

  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <button
        type="submit"
        disabled={pending}
        aria-label={`Restore ${name}`}
        className="rounded bg-teal px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-teal/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Restoring…" : "Restore"}
      </button>
      {state && !state.ok ? (
        <p role="alert" className="max-w-48 text-xs text-danger">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
