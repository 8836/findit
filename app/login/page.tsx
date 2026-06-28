"use client";
import { useState } from "react";
import { auth, getFirebaseAuthErrorMessage } from "../../lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import {
  notifySuccess,
  notifyError,
  notifyLoading,
} from "../../lib/notify"; // ✅ use centralized notify

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ Show loading toast
    const toastId = notifyLoading("Logging in...");

    try {
      await signInWithEmailAndPassword(auth, email, password);

      // ✅ Update toast to success
      notifySuccess("Logged in successfully!", toastId);

      router.push("/dashboard"); // ✅ redirect after login
    } catch (error) {
      // ✅ Update toast to error
      notifyError(getFirebaseAuthErrorMessage(error), toastId);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-lg shadow-md w-full max-w-md space-y-6 hover:shadow-lg transition"
      >
        <h1 className="text-3xl font-bold text-blue-800">Login</h1>

        <div>
          <label className="block font-semibold text-blue-800 mb-1">Email</label>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-600"
            required
          />
        </div>

        <div>
          <label className="block font-semibold text-blue-800 mb-1">Password</label>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-600"
            required
          />
        </div>

        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-full"
        >
          Login
        </button>

        {/* 🔹 Extra navigation links */}
        <p className="text-sm text-gray-600 text-center">
          Forgot your password?{" "}
          <a
            href="/reset-password"
            className="text-blue-600 font-semibold hover:underline"
          >
            Reset it
          </a>
        </p>
        <p className="text-sm text-gray-600 text-center">
          Don’t have an account?{" "}
          <a
            href="/signup"
            className="text-blue-600 font-semibold hover:underline"
          >
            Sign up
          </a>
        </p>
      </form>
    </div>
  );
}
