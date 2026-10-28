"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { homeFor, safeNext } from "@/lib/auth";
import { googleAuthEnabled, siteUrl, supabaseConfigured } from "@/lib/env";
import { RESET_COOKIE } from "@/lib/password-reset";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string; fields?: Record<string, string> };

const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
  next: z.string().optional(),
});

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  if (!supabaseConfigured()) return { error: "Sign-in isn't connected yet. Please try again soon." };
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]!.message, fields: { email: String(formData.get("email") ?? "") } };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error || !data.user) return { error: "That email and password don't match.", fields: { email: parsed.data.email } };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  redirect(safeNext(parsed.data.next, homeFor(profile?.role)));
}

const newPassword = z.string().min(8, "Use at least 8 characters").max(72, "Use 72 characters or fewer");

const signupSchema = z
  .object({
    full_name: z.string().trim().min(2, "Enter your name").max(120),
    email: z.email("Enter a valid email"),
    password: newPassword,
    confirm_password: z.string(),
    role: z.enum(["customer", "mechanic"]),
    terms: z.literal("on", { error: "Please accept the Terms and Privacy Policy" }),
    next: z.string().optional(),
  })
  .refine((v) => v.password === v.confirm_password, { message: "Passwords don't match", path: ["confirm_password"] });

export async function signup(_: AuthState, formData: FormData): Promise<AuthState> {
  if (!supabaseConfigured()) return { error: "Sign-up isn't connected yet. Please try again soon." };
  const raw = Object.fromEntries(formData);
  const parsed = signupSchema.safeParse(raw);
  const fields = { full_name: String(raw.full_name ?? ""), email: String(raw.email ?? ""), role: String(raw.role ?? "customer") };
  if (!parsed.success) return { error: parsed.error.issues[0]!.message, fields };

  const { full_name, email, password, role, next } = parsed.data;
  const supabase = await createClient();
  const after = safeNext(next, homeFor(role));
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name, role },
      emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(after)}`,
    },
  });
  if (error) {
    const msg = /registered|exists/i.test(error.message) ? "An account with that email already exists. Try logging in." : error.message;
    return { error: msg, fields };
  }
  // With email confirmation on, there's no session yet.
  if (!data.session) return { message: `Check ${email} for a confirmation link to finish creating your account.` };
  redirect(after);
}

export async function signInWithGoogle(formData: FormData) {
  if (!supabaseConfigured() || !googleAuthEnabled()) redirect("/login?error=google");
  const next = safeNext(String(formData.get("next") ?? ""), "/");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/login?error=google");
  redirect(data.url);
}

const forgotSchema = z.object({ email: z.email("Enter a valid email") });

/** Emails a password reset link. Always answers the same way so it can't reveal which emails have accounts. */
export async function requestPasswordReset(_: AuthState, formData: FormData): Promise<AuthState> {
  if (!supabaseConfigured()) return { error: "Password reset isn't connected yet. Please try again soon." };
  const parsed = forgotSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]!.message, fields: { email: String(formData.get("email") ?? "") } };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
  });
  if (error && /rate|too many/i.test(error.message)) return { error: "Too many reset requests. Please wait a few minutes and try again." };
  return { message: `If there's an account for ${parsed.data.email}, a reset link is on its way. It expires in an hour.` };
}

const resetSchema = z
  .object({ password: newPassword, confirm_password: z.string() })
  .refine((v) => v.password === v.confirm_password, { message: "Passwords don't match", path: ["confirm_password"] });

/** Sets a new password. Needs the short-lived session the reset link creates (via /auth/callback). */
export async function resetPassword(_: AuthState, formData: FormData): Promise<AuthState> {
  if (!supabaseConfigured()) return { error: "Password reset isn't connected yet." };
  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };

  // Only right after opening a reset link — not from any signed-in session.
  const jar = await cookies();
  if (jar.get(RESET_COOKIE)?.value !== "1") return { error: "This reset link has expired. Request a new one." };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "This reset link has expired. Request a new one." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    const msg = /different from the old/i.test(error.message) ? "Choose a password you haven't used here before." : "We couldn't update your password. Please try again.";
    return { error: msg };
  }
  jar.delete(RESET_COOKIE);
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
  redirect(`${homeFor(profile?.role)}?password=updated`);
}

export async function chooseRole(formData: FormData) {
  const role = z.enum(["customer", "mechanic"]).parse(formData.get("role"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("choose_role", { r: role });
  if (error && !/already chosen/.test(error.message)) redirect("/onboarding/role?error=1");
  const next = safeNext(String(formData.get("next") ?? ""), homeFor(role));
  redirect(next === "/" ? homeFor(role) : next);
}
