"use client";
import { useEffect, useState } from "react";
import { auth } from "../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        router.push("/dashboard"); // ✅ auto‑redirect if logged in
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, [router]);

  if (user) {
    // While redirecting, you can show a loading state
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-xl">Redirecting to your dashboard...</p>
      </main>
    );
  }

  // ❌ Not logged in → show login/signup options
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-4xl font-bold mb-6">Welcome to FindIt</h1>
      <Image
        src="/vercel.svg"
        alt="FindIt Logo"
        width={200}
        height={40}
        className="h-auto"
      />
      <div className="space-x-4 mt-6">
        <Link
          href="/login"
          className="px-4 py-2 bg-green-600 text-white rounded"
        >
          Login
        </Link>
        <Link
          href="/signup"
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Sign Up
        </Link>
      </div>
    </main>
  );
}
