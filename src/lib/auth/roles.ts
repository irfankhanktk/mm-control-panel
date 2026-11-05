/**
 * Roles that may sign in to the control panel. The values match the `userRole` the MM API returns
 * (Teo.MyMasjid.Common.Constants.Roles). Other API roles (User, MessageEditor, SuperAdmin) are not
 * allowed to sign in here.
 */
export const ROLES = {
  Admin: "Admin",
  MasterEditor: "MasterEditor",
  Editor: "Editor",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const CONTROL_PANEL_ROLES: readonly Role[] = Object.values(ROLES);

export const ROLE_LABELS: Record<Role, string> = {
  Admin: "Admin",
  MasterEditor: "Master editor",
  Editor: "Editor",
};

export function isControlPanelRole(value: unknown): value is Role {
  return typeof value === "string" && (CONTROL_PANEL_ROLES as readonly string[]).includes(value);
}

interface RouteRule {
  /** Matches the path itself and everything below it. "/" matches every path. */
  prefix: string;
  roles: readonly Role[];
}

/**
 * Who may open which part of the panel. The most specific (longest) matching prefix wins; paths
 * without a more specific rule fall back to "/" (any control panel role).
 *
 * Add a rule here when a page is restricted, for example the masjid administration pages:
 *   { prefix: "/masjids", roles: [ROLES.Admin] }
 * The proxy and server components both read this table, and the MM API still enforces the role on
 * every call, so a rule here is a convenience and never the only protection.
 */
const ROUTE_RULES: readonly RouteRule[] = [
  { prefix: "/", roles: CONTROL_PANEL_ROLES },
  { prefix: "/reminders", roles: [ROLES.Admin] },
];

export function rolesForPath(pathname: string): readonly Role[] {
  let best: RouteRule | undefined;
  for (const rule of ROUTE_RULES) {
    const matches =
      rule.prefix === "/" || pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`);
    if (matches && (!best || rule.prefix.length > best.prefix.length)) best = rule;
  }
  return best?.roles ?? CONTROL_PANEL_ROLES;
}

export function canAccess(role: Role, pathname: string): boolean {
  return rolesForPath(pathname).includes(role);
}
