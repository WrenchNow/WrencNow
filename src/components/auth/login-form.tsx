"use client";

import { useActionState } from "react";
import { login, type AuthState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/form";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(login, {});
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error && <Notice tone="danger">{state.error}</Notice>}
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email address" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.fields?.email} />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Logging in…" : "Log in"}
      </Button>
    </form>
  );
}
