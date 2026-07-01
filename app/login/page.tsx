"use client";
import { useState } from "react";
import { auth, getFirebaseAuthErrorMessage } from "../../lib/firebase";
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
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = notifyLoading("Logging in...");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      notifySuccess("Logged in successfully!", toastId);
      router.push("/dashboard");
    } catch (error) {
      notifyError(getFirebaseAuthErrorMessage(error), toastId);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-purple-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <form
          onSubmit={handleLogin}
          className="bg-white/10 backdrop-blur-md rounded-4xl shadow-2xl shadow-black/40 p-8 space-y-6 border border-white/20"
        >
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white tracking-tight">FindIt</h1>
            <p className="mt-2 text-sky-100 font-medium">Welcome back</p>
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
            className="w-full rounded-full bg-yellow-400 hover:bg-yellow-300 px-6 py-3 text-sm font-bold text-blue-950 shadow-lg shadow-yellow-400/30 transition"
          >
            Sign In
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
            Don't have an account?{" "}
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
