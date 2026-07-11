"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { auth } from "../../lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const linkClasses = (path: string) =>
    `px-3 py-2 rounded transition-colors text-white ${
      pathname === path ? "bg-blue-700 font-semibold" : "hover:bg-blue-600/90"
    }`;

  return (
    <nav className="flex flex-col gap-4 bg-gradient-to-r from-blue-950 via-blue-800 to-sky-700 px-6 py-5 text-white shadow-2xl shadow-blue-900/20 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
          <Image
            src="/findit-logo-transparent.png"
            alt="FindIt"
            width={128}
            height={72}
            priority
            className="h-20 w-auto"
          />
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-base font-semibold">
        <Link href="/" className={linkClasses("/")}>
          Home
        </Link>
        <Link href="/dashboard" className={linkClasses("/dashboard")}>
          Dashboard
        </Link>
        <Link href="/profile" className={linkClasses("/profile")}>
          Profile
        </Link>
        <Link href="/report" className={linkClasses("/report")}>
          Report
        </Link>
        <Link href="/support" className={linkClasses("/support")}>
          Support
        </Link>

        {!user ? (
          <>
            <Link href="/login" className={linkClasses("/login")}>
              Login
            </Link>
            <Link href="/signup" className={linkClasses("/signup")}>
              Signup
            </Link>
          </>
        ) : (
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-full bg-yellow-400 text-blue-950 font-semibold shadow-lg shadow-yellow-500/20 hover:bg-yellow-300"
          >
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}
