"use client";
import Link from "next/link";
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
    `px-3 py-2 rounded transition-colors ${
      pathname === path
        ? "bg-blue-900 text-white font-semibold"
        : "hover:bg-blue-700 hover:text-white"
    }`;

  return (
    <nav className="bg-blue-800 text-white px-6 py-3 flex justify-between items-center shadow-md">
      {/* Brand Logo */}
      <div className="font-bold text-lg tracking-wide">
        <Link href="/" className="hover:text-green-400 transition-colors">
          FindIt
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex gap-2">
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
            className="px-3 py-2 rounded bg-red-600 hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}
