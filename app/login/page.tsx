"use client";
import { useState } from "react";
import Image from "next/image";
import { auth, ensureAuthPersistence, getFirebaseAuthErrorMessage } from "../../lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import {
  notifySuccess,
  notifyError,
  notifyLoading,
} from "../../lib/notify";

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
      notifySuccess("Logged in successfully!", toastId);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-purple-900 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <form
          onSubmit={handleLogin}
          className="bg-white/10 backdrop-blur-md rounded-4xl shadow-2xl shadow-black/40 p-10 space-y-7 border border-white/20"
        >
          <div className="text-center mb-10">
            <Image
              src="/findit-logo-transparent.png"
              alt="FindIt"
              width={520}
              height={300}
              priority
              className="mx-auto h-auto w-full max-w-sm"
            />
            <p className="mt-4 text-xl font-semibold text-sky-100">Welcome back</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-white mb-3 uppercase tracking-[0.1em]">
              Email address
            </label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-white/30 bg-white/5 px-5 py-3 text-white placeholder-white/70 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 transition"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-white mb-3 uppercase tracking-[0.1em]">
              Password
            </label>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-white/30 bg-white/5 px-5 py-3 text-white placeholder-white/70 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 transition"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-yellow-400 hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60 px-6 py-4 text-base font-bold text-blue-950 shadow-lg shadow-yellow-400/30 transition"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white/5 text-white/60">or</span>
            </div>
          </div>

          <p className="text-sm text-white/70 text-center">
            Don&apos;t have an account?{" "}
            <a href="/signup" className="font-bold text-yellow-300 hover:text-yellow-100">
              Sign up
            </a>
          </p>
          <p className="text-sm text-white/70 text-center">
            <a href="/reset-password" className="font-bold text-cyan-300 hover:text-cyan-100">
              Forgot password?
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
