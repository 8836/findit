"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, ensureAuthPersistence, getFirebaseAuthErrorMessage } from "@/lib/firebase";
import { notifyError, notifyLoading, notifySuccess } from "@/lib/notify";
import { AuthCard } from "@/app/components/AuthCard";
import { Button } from "@/app/components/ui/Button";
import { TextField } from "@/app/components/ui/Field";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (password !== confirmPassword) {
      notifyError("Passwords do not match.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const toastId = notifyLoading("Creating your account...");
    setLoading(true);

    try {
      await ensureAuthPersistence();
      await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      notifySuccess("Account created successfully!", toastId);
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Signup failed:", error);
      notifyError(getFirebaseAuthErrorMessage(error), toastId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Create your account"
      subtitle="Start reporting and finding items in minutes."
      afterCard={
        <p className="mt-5 text-center text-sm text-white/70">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-cyan-300 hover:text-cyan-100">
            Login
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSignup} className="space-y-5">
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

        <TextField
          id="password"
          label="Password"
          type="password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
        />

        <TextField
          id="confirm-password"
          label="Confirm password"
          type="password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
        />

        <Button type="submit" variant="accent" fullWidth size="lg" loading={loading}>
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </AuthCard>
  );
}
