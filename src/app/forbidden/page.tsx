import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "No access" };

export default function ForbiddenPage() {
  return (
    <Suspense fallback={<div className="h-16 bg-brand" />}>
      <Forbidden />
    </Suspense>
  );
}

async function Forbidden() {
  const user = await requireSession();

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-3xl font-light text-brand">You don&apos;t have access to this page</h1>
        <p className="mt-3 text-muted">
          Your role doesn&apos;t include this part of the control panel. If you think it should, ask an administrator.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Back to home
        </Link>
      </main>
    </>
  );
}
