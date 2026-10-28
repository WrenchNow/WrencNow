"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signup, type AuthState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import { Checkbox, Field, Input, RequiredLegend } from "@/components/ui/form";

export function SignupForm({ next, defaultRole }: { next?: string; defaultRole: "customer" | "mechanic" }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signup, {});
  const [role, setRole] = useState<"customer" | "mechanic">((state.fields?.role as "customer" | "mechanic") ?? defaultRole);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const mismatch = confirm.length > 0 && password !== confirm;
  const passwordsOk = password.length >= 8 && password === confirm;

  if (state.message) return <Notice tone="ok" title="Almost there">{state.message}</Notice>;

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error && <Notice tone="danger">{state.error}</Notice>}
      <input type="hidden" name="next" value={next ?? ""} />
      <fieldset>
        <legend className="text-sm font-medium text-cream">I want to</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(
            [
              ["customer", "Get my car fixed"],
              ["mechanic", "Work as a mechanic"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="cursor-pointer">
              <input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} className="peer sr-only" />
              <span className="block rounded-[var(--radius-control)] border border-line-strong bg-raised px-3 py-3 text-center text-sm font-semibold text-ink transition peer-checked:border-ore peer-checked:bg-ore-dim peer-checked:text-cream peer-focus-visible:outline-2 peer-focus-visible:outline-ore-bright">
                {label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <RequiredLegend />
      <Field label="Your name" htmlFor="full_name" required>
        <Input id="full_name" name="full_name" autoComplete="name" required defaultValue={state.fields?.full_name} />
      </Field>
      <Field label="Email address" htmlFor="email" required>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.fields?.email} />
      </Field>
      <Field label="Password" htmlFor="password" hint="At least 8 characters" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <Field label="Confirm password" htmlFor="confirm_password" error={mismatch ? "Passwords don't match" : undefined} required>
        <Input
          id="confirm_password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={mismatch}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </Field>
      <Checkbox
        id="terms"
        name="terms"
        required
        label={
          <>
            I agree to the{" "}
            <Link href="/terms" className="text-ore hover:underline" target="_blank">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-ore hover:underline" target="_blank">
              Privacy Policy
            </Link>
            {role === "mechanic" && (
              <>
                , and the{" "}
                <Link href="/mechanic-agreement" className="text-ore hover:underline" target="_blank">
                  Mechanic Agreement
                </Link>
              </>
            )}
            .
          </>
        }
      />
      <Button type="submit" size="lg" disabled={pending || !passwordsOk}>
        {pending ? "Creating account…" : role === "mechanic" ? "Create account & start application" : "Create my account"}
      </Button>
    </form>
  );
}
