import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { MasjidsPage } from "@/components/masjids/masjids-page";
import { ROLES, ROLE_LABELS } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import type { SessionUser } from "@/lib/auth/session-token";
import type { RawSearchParams } from "@/lib/masjids/filters";

export default function HomePage(props: PageProps<"/">) {
  // The session and query string are request-time data, so everything below streams in behind Suspense.
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <Home searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Home({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const user = await requireSession();

  // Admins land on the masjid summary and filters. The other roles get their own home later.
  if (user.role === ROLES.Admin) return <MasjidsPage user={user} searchParams={await searchParams} />;
  return <Welcome user={user} />;
}

function Welcome({ user }: { user: SessionUser }) {
  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-light text-brand">Welcome, {user.fullName}</h1>
        <p className="mt-2 text-muted">You are signed in to the MyMasjid control panel as {ROLE_LABELS[user.role].toLowerCase()}.</p>
        <dl className="mt-8 grid gap-4 rounded-lg bg-white p-6 sm:grid-cols-2">
          <Detail label="Role" value={ROLE_LABELS[user.role]} />
          <Detail label="Email" value={user.userName} />
          {user.masjidName ? <Detail label="Masjid" value={user.masjidName} /> : null}
          {user.organizationName ? <Detail label="Organization" value={user.organizationName} /> : null}
        </dl>
      </main>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium tracking-wide text-muted uppercase">{label}</dt>
      <dd className="mt-1 truncate">{value}</dd>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <>
      <div className="h-16 bg-brand" />
      <div aria-hidden="true" className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-8">
        <div className="h-9 w-40 rounded bg-line/60" />
        <div className="mt-5 h-14 rounded bg-white" />
        <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-5">
          <div className="h-24 rounded bg-sky/40 sm:h-[116px]" />
          <div className="h-24 rounded bg-teal/40 sm:h-[116px]" />
          <div className="h-24 rounded bg-sun/40 sm:h-[116px]" />
        </div>
        <div className="mt-6 h-64 rounded bg-white" />
      </div>
    </>
  );
}
