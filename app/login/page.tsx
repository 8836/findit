"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, ensureAuthPersistence, getFirebaseAuthErrorMessage } from "@/lib/firebase";
import { notifyError, notifyLoading, notifySuccess } from "@/lib/notify";
import { AuthCard } from "@/app/components/AuthCard";
import { Button } from "@/app/components/ui/Button";
import { TextField } from "@/app/components/ui/Field";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const normalizedEmail = email.trim().toLowerCase();
    const toastId = notifyLoading("Logging in...");
    setLoading(true);

    try {
      await ensureAuthPersistence();
      await signInWithEmailAndPassword(auth, normalizedEmail, password);
      notifySuccess("Welcome back!", toastId);
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Login failed:", error);
      notifyError(getFirebaseAuthErrorMessage(error), toastId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to manage your reports and claims."
      afterCard={
        <p className="mt-5 text-center text-sm text-white/70">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-amber-300 hover:text-amber-200">
            Sign up
          </Link>
        </p>
      }
    >
      <form onSubmit={handleLogin} className="space-y-5">
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

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200"
            >
              Password
            </label>
            <Link
              href="/reset-password"
              className="text-xs font-semibold text-cyan-300 hover:text-cyan-100"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        <Button type="submit" variant="accent" fullWidth size="lg" loading={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </AuthCard>
  );
}
