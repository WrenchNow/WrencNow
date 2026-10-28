import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/password-reset-forms";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/feedback";
import { Container } from "@/components/ui/layout";
import { getViewer } from "@/lib/auth";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

// Reached from the emailed reset link: /auth/callback signs the user in, then sends them here.
export default async function ResetPasswordPage() {
  const viewer = await getViewer();
  return (
    <Container className="flex justify-center py-12 sm:py-20">
      <Card className="w-full max-w-md">
        <h1 className="text-4xl font-extrabold uppercase">New password</h1>
        {viewer ? (
          <>
            <p className="mt-1 text-sm text-muted">Choose a new password for {viewer.email ?? "your account"}.</p>
            <div className="mt-6">
              <ResetPasswordForm />
            </div>
          </>
        ) : (
          <div className="mt-6 flex flex-col gap-4">
            <Notice tone="warn" title="This link has expired">
              Reset links work once and expire after an hour. Request a new one and use the newest email.
            </Notice>
            <ButtonLink href="/forgot-password" size="lg">
              Send a new link
            </ButtonLink>
          </div>
        )}
      </Card>
    </Container>
  );
}
