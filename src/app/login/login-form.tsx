"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction } from "@/app/actions/auth";

const inputClass =
  "block w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-[15px] text-ink placeholder:text-muted/70 " +
  "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 aria-[invalid=true]:border-danger " +
  "aria-[invalid=true]:focus:ring-danger/25 disabled:bg-canvas";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const next = useSearchParams().get("next") ?? "";

  return (
    <form action={formAction} noValidate className="space-y-5">
      <input type="hidden" name="next" value={next} />

      {state?.message ? (
        <div
          role="alert"
          className="rounded-lg border border-danger/20 bg-danger-soft px-3.5 py-3 text-sm text-danger"
        >
          {state.message}
        </div>
      ) : null}

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoFocus
          required
          disabled={pending}
          defaultValue={state?.fields?.email ?? ""}
          placeholder="name@example.com"
          aria-invalid={state?.errors?.email ? true : undefined}
          aria-describedby={state?.errors?.email ? "email-error" : undefined}
          className={inputClass}
        />
        {state?.errors?.email ? (
          <p id="email-error" className="mt-1.5 text-sm text-danger">
            {state.errors.email}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            disabled={pending}
            aria-invalid={state?.errors?.password ? true : undefined}
            aria-describedby={state?.errors?.password ? "password-error" : undefined}
            className={`${inputClass} pr-16`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 rounded-r-lg px-3.5 text-sm font-medium text-brand hover:text-brand-dark focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        {state?.errors?.password ? (
          <p id="password-error" className="mt-1.5 text-sm text-danger">
            {state.errors.password}
          </p>
        ) : null}
      </div>

      <label className="flex items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          name="rememberMe"
          defaultChecked={state?.fields?.rememberMe ?? false}
          disabled={pending}
          className="size-4 rounded border-line accent-brand"
        />
        Keep me signed in on this device
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand px-4 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:bg-brand/60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

/** Same footprint as the form, shown while the search params are read. */
export function LoginFormSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-5">
      <div className="h-[68px] rounded-lg bg-line/50" />
      <div className="h-[68px] rounded-lg bg-line/50" />
      <div className="h-5 w-56 rounded bg-line/50" />
      <div className="h-12 rounded-lg bg-brand/30" />
    </div>
  );
}
