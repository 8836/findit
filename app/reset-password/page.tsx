"use client";
import { useState } from "react";
import { auth, getFirebaseAuthErrorMessage } from "../../lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true); // ✅ show confirmation screen
      setEmail("");
    } catch (error) {
      alert(getFirebaseAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center space-y-6">
          <h1 className="text-3xl font-bold text-green-600">Email Sent!</h1>
          <p className="text-gray-700">
            Please check your inbox for a password reset link. Follow the
            instructions to set a new password.
          </p>
          <a
            href="/login"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 inline-block"
          >
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <form
        onSubmit={handleReset}
        className="bg-white p-8 rounded-lg shadow-md w-full max-w-md space-y-6 hover:shadow-lg transition"
      >
        <h1 className="text-3xl font-bold text-blue-800">Reset Password</h1>

        <div>
          <label className="block font-semibold text-blue-800 mb-1">Email</label>
          <input
            type="email"
            placeholder="Enter your account email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-600"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-full disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>

        {/* 🔹 Extra navigation links */}
        <p className="text-sm text-gray-600 text-center">
          Remembered your password?{" "}
          <a href="/login" className="text-blue-600 font-semibold hover:underline">
            Login
          </a>
        </p>
        <p className="text-sm text-gray-600 text-center">
          Don’t have an account?{" "}
          <a href="/signup" className="text-blue-600 font-semibold hover:underline">
            Sign up
          </a>
        </p>
      </form>
    </div>
  );
}
