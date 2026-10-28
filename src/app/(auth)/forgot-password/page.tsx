import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/password-reset-forms";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/layout";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <Container className="flex justify-center py-12 sm:py-20">
      <Card className="w-full max-w-md">
        <h1 className="text-4xl font-extrabold uppercase">Forgot password</h1>
        <p className="mt-1 text-sm text-muted">Enter the email you signed up with and we&apos;ll send you a link to choose a new password.</p>
        <div className="mt-6">
          <ForgotPasswordForm />
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-ore hover:underline">
            Back to log in
          </Link>
        </p>
      </Card>
    </Container>
  );
}
