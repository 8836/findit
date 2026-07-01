"use client";
import { useState } from "react";
import { auth, getFirebaseAuthErrorMessage } from "../../lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { notifySuccess, notifyError, notifyLoading } from "../../lib/notify";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const toastId = notifyLoading("Sending reset link...");

    try {
      await sendPasswordResetEmail(auth, email);
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
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-purple-900 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-md rounded-4xl shadow-2xl shadow-black/40 p-8 text-center space-y-6 border border-white/20">
            <div className="text-5xl">✓</div>
            <h1 className="text-3xl font-bold text-white">Email Sent!</h1>
            <p className="text-sky-100 font-medium">
              Check your inbox for a password reset link. Follow the instructions to set a new password.
            </p>
            <a
              href="/login"
              className="inline-block w-full rounded-full bg-yellow-400 hover:bg-yellow-300 px-6 py-3 text-sm font-bold text-blue-950 shadow-lg shadow-yellow-400/30 transition"
            >
              Back to Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-purple-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <form
          onSubmit={handleReset}
          className="bg-white/10 backdrop-blur-md rounded-4xl shadow-2xl shadow-black/40 p-8 space-y-6 border border-white/20"
        >
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white tracking-tight">FindIt</h1>
            <p className="mt-2 text-sky-100 font-medium">Reset your password</p>
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

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 px-6 py-3 text-sm font-bold text-blue-950 shadow-lg shadow-yellow-400/30 transition"
          >
            {loading ? "Sending..." : "Send Reset Link"}
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
            <a href="/login" className="font-bold text-cyan-300 hover:text-cyan-100">
              Back to Login
            </a>
          </p>
          <p className="text-sm text-white/70 text-center">
            Don't have an account?{" "}
            <a href="/signup" className="font-bold text-yellow-300 hover:text-yellow-100">
              Sign up
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
