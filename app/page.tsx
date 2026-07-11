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
        router.push("/dashboard");
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

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-6 py-12">
      <Image
        src="/findit-logo-transparent.png"
        alt="FindIt Logo"
        width={920}
        height={520}
        priority
        className="h-auto w-full max-w-3xl"
      />
      <h1 className="mt-10 text-center text-5xl font-bold text-blue-950 md:text-6xl">Welcome to FindIt</h1>
      <div className="mt-8 flex gap-5">
        <Link
          href="/login"
          className="rounded-full bg-green-700 px-8 py-4 text-lg font-semibold text-white shadow-sm hover:bg-green-600"
        >
          Login
        </Link>
        <Link
          href="/signup"
          className="rounded-full bg-blue-900 px-8 py-4 text-lg font-semibold text-white shadow-sm hover:bg-blue-800"
        >
          Sign Up
        </Link>
      </div>
    </main>
  );
}
