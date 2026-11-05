import type { Metadata } from "next";
import { Suspense } from "react";
import { LogoMark } from "@/components/brand/logo-mark";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { LoginForm, LoginFormSkeleton } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[5fr_6fr]">
      <aside className="relative hidden overflow-hidden bg-rail text-white lg:flex lg:flex-col lg:justify-between lg:p-14">
        <div className="flex items-center gap-3">
          <LogoMark />
          <span className="text-lg font-semibold">MyMasjid</span>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-balance text-4xl font-light leading-tight">
            One place to look after every masjid.
          </h2>
          <p className="mt-5 text-pretty text-[15px] leading-relaxed text-white/70">
            Manage masajid, prayer times and messages for the communities you serve.
          </p>
        </div>

        <p className="relative z-10 text-sm text-white/60">
          For {ROLE_LABELS.Admin.toLowerCase()}s, {ROLE_LABELS.MasterEditor.toLowerCase()}s and{" "}
          {ROLE_LABELS.Editor.toLowerCase()}s.
        </p>

        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full bg-brand/25" />
        <div aria-hidden="true" className="pointer-events-none absolute right-24 -bottom-40 size-72 rounded-full bg-teal/20" />
        <div aria-hidden="true" className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full bg-sun/15" />
      </aside>

      <section className="flex items-center justify-center bg-white px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <LogoMark />
            <span className="text-lg font-semibold">MyMasjid</span>
          </div>

          <h1 className="text-3xl font-light text-brand">Sign in</h1>
          <p className="mt-2 mb-8 text-sm text-muted">Use the email and password for your MyMasjid account.</p>

          <Suspense fallback={<LoginFormSkeleton />}>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
