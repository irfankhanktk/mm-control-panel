import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ReminderDetailPage } from "@/components/reminders/reminder-detail-page";
import { ROLES } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";

export default function ReminderDetailRoute(props: PageProps<"/reminders/[masjidId]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <ReminderDetail params={props.params} />
    </Suspense>
  );
}

async function ReminderDetail({ params }: { params: Promise<{ masjidId: string }> }) {
  const user = await requireSession([ROLES.Admin]);

  const { masjidId } = await params;
  if (!/^\d{1,15}$/.test(masjidId) || Number(masjidId) < 1) notFound();

  return <ReminderDetailPage user={user} masjidId={Number(masjidId)} />;
}

function DetailSkeleton() {
  return (
    <>
      <div className="h-16 bg-brand" />
      <div aria-hidden="true" className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-8">
        <div className="h-5 w-40 rounded bg-line/60" />
        <div className="mt-4 h-9 w-72 rounded bg-line/60" />
        <div className="my-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-20 rounded bg-white" />
          ))}
        </div>
        <div className="h-64 rounded bg-white" />
      </div>
    </>
  );
}
