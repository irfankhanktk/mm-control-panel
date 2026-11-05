import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { ROLES, ROLE_LABELS } from "@/lib/auth/roles";
import type { SessionUser } from "@/lib/auth/session-token";

export type NavSection = "masajid" | "reminders";

const NAV: readonly { key: NavSection; label: string; href: string }[] = [
  { key: "masajid", label: "Masajid", href: "/" },
  { key: "reminders", label: "Reminders", href: "/reminders" },
];

export function AppHeader({ user, current = "masajid" }: { user: SessionUser; current?: NavSection }) {
  return (
    <header className="flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-1 bg-brand px-4 py-2 text-white sm:px-6">
      <div className="flex min-w-0 items-center gap-5">
        <span className="text-lg font-semibold">MyMasjid Control Panel</span>

        {/* Only admins have more than one page for now. */}
        {user.role === ROLES.Admin ? (
          <nav aria-label="Main" className="flex gap-1">
            {NAV.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                aria-current={item.key === current ? "page" : undefined}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                  item.key === current ? "bg-white/20" : "text-white/85"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>

      <div className="flex min-w-0 items-center gap-4">
        <div className="hidden min-w-0 text-right sm:block">
          <p className="truncate text-sm font-medium">{user.fullName}</p>
          <p className="truncate text-xs text-white/75">{ROLE_LABELS[user.role]}</p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-lg border border-white/40 px-3.5 py-2 text-sm font-medium transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
