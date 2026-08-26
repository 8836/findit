"use client";

import { useState } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth, getFirebaseAuthErrorMessage } from "@/lib/firebase";
import { notifyError, notifyLoading, notifySuccess } from "@/lib/notify";
import { AuthCard } from "@/app/components/AuthCard";
import { Button } from "@/app/components/ui/Button";
import { TextField } from "@/app/components/ui/Field";
import { MailCheck } from "lucide-react";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const toastId = notifyLoading("Sending reset link...");
    const normalizedEmail = email.trim().toLowerCase();

    try {
      await sendPasswordResetEmail(auth, normalizedEmail, {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false,
      });
      notifySuccess("Reset link sent to your email!", toastId);
      setSuccess(true);
      setEmail("");
    } catch (error) {
      notifyError(getFirebaseAuthErrorMessage(error), toastId);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-sky-800 px-4 py-12">
        <div className="glass w-full max-w-md rounded-[1.75rem] p-8 text-center text-white shadow-2xl shadow-blue-950/40">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-200">
            <MailCheck className="h-8 w-8" aria-hidden />
          </div>
          <h1 className="mt-6 text-3xl font-bold">Check your inbox</h1>
          <p className="mt-3 text-sm text-sky-100/80">
            We sent a password reset link to <span className="font-semibold text-white">{email}</span>.
            Follow the instructions to set a new password.
          </p>
          <div className="mt-8">
            <Link href="/login" className="text-sm font-semibold text-amber-300 hover:text-amber-200">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter your email and we'll send you a secure reset link."
      afterCard={
        <p className="mt-5 text-center text-sm text-white/70">
          Remembered it?{" "}
          <a href="/login" className="font-semibold text-cyan-300 hover:text-cyan-100">
            Back to login
          </a>
        </p>
      }
    >
      <form onSubmit={handleReset} className="space-y-5">
        <TextField
          id="email"
          label="Email address"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <Button type="submit" variant="accent" fullWidth size="lg" loading={loading}>
          {loading ? "Sending..." : "Send reset link"}
        </Button>
      </form>
    </AuthCard>
  );
}
