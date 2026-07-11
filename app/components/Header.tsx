"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../../lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    alert("Logged out successfully!");
    router.push("/login");
  };

  return (
    <header className="bg-gray-800 text-white p-5 flex items-center gap-7 text-base font-semibold">
      <Link href="/" className="flex items-center">
        <Image
          src="/findit-logo-transparent.png"
          alt="FindIt"
          width={112}
          height={64}
          className="h-16 w-auto"
        />
      </Link>
      <Link href="/">Home</Link>
      <Link href="/registry">Registry</Link>
      <Link href="/report">Report</Link>

      {user ? (
        <>
          <Link href="/dashboard">Dashboard</Link>
          <button
            onClick={handleLogout}
            className="bg-red-600 px-3 py-1 rounded"
          >
            Logout
          </button>
        </>
      ) : (
        <>
          <Link href="/login">Login</Link>
          <Link href="/signup">Sign Up</Link>
        </>
      )}
    </header>
  );
}
