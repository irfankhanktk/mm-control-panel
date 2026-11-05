"use server";

import { redirect } from "next/navigation";
import { LOGIN_PATH } from "@/lib/auth/constants";
import type { LoginFormState } from "@/lib/auth/login-state";
import { isControlPanelRole } from "@/lib/auth/roles";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";
import { createSession, deleteSession, getAccessToken } from "@/lib/auth/session";
import { login, logout, type LoginFailure } from "@/lib/mm-api/auth";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FAILURE_MESSAGES: Record<LoginFailure, string> = {
  "invalid-credentials": "The email or password is incorrect.",
  "not-allowed": "This account can't sign in yet. Contact an administrator.",
  locked: "Too many failed attempts. This account is temporarily locked.",
  "two-factor-required":
    "This account uses two-factor sign-in, which the new control panel doesn't support yet.",
  unavailable: "We can't reach the MyMasjid server right now. Try again in a moment.",
  error: "Something went wrong while signing in. Try again.",
};

export async function loginAction(_previous: LoginFormState | undefined, formData: FormData): Promise<LoginFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const rememberMe = formData.get("rememberMe") === "on";
  const fields = { email, rememberMe };

  const errors: NonNullable<LoginFormState["errors"]> = {};
  if (!email) errors.email = "Enter your email address.";
  else if (!EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address.";
  if (!password) errors.password = "Enter your password.";
  if (errors.email || errors.password) return { fields, errors };

  const result = await login({ email, password, rememberMe });
  if (!result.ok) {
    return { fields, message: result.message ?? FAILURE_MESSAGES[result.failure] };
  }

  const { data } = result;
  if (!isControlPanelRole(data.userRole)) {
    return { fields, message: "Your account doesn't have access to the control panel." };
  }

  await createSession(
    {
      userName: data.userName || email,
      fullName: data.fullName || [data.firstName, data.lastName].filter(Boolean).join(" ") || data.userName || email,
      role: data.userRole,
      masjidId: data.masjidId ?? null,
      masjidName: data.masjidName ?? "",
      organizationId: data.organizationId ?? null,
      organizationName: data.organizationName ?? "",
    },
    data.accessToken,
    rememberMe,
  );

  redirect(safeRedirectPath(formData.get("next")));
}

export async function logoutAction(): Promise<void> {
  const accessToken = await getAccessToken();
  if (accessToken) await logout(accessToken);

  await deleteSession();
  redirect(LOGIN_PATH);
}
