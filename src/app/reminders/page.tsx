import { Suspense } from "react";
import { RemindersPage } from "@/components/reminders/reminders-page";
import { ROLES } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import type { RawSearchParams } from "@/lib/reminders/filters";

export default function RemindersRoute(props: PageProps<"/reminders">) {
  // The session and query string are request-time data, so everything below streams in behind Suspense.
  return (
    <Suspense fallback={<RemindersSkeleton />}>
      <Reminders searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Reminders({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const user = await requireSession([ROLES.Admin]);
  return <RemindersPage user={user} searchParams={await searchParams} />;
}

function RemindersSkeleton() {
  return (
    <>
      <div className="h-16 bg-brand" />
      <div aria-hidden="true" className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-8">
        <div className="h-9 w-40 rounded bg-line/60" />
        <div className="mt-5 h-14 rounded bg-white" />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          <div className="h-24 rounded bg-sky/40 sm:h-[116px]" />
          <div className="h-24 rounded bg-teal/40 sm:h-[116px]" />
          <div className="h-24 rounded bg-sun/40 sm:h-[116px]" />
          <div className="h-24 rounded bg-danger/30 sm:h-[116px]" />
        </div>
        <div className="mt-6 h-64 rounded bg-white" />
      </div>
    </>
  );
}
