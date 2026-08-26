"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import {
  LayoutDashboard,
  LifeBuoy,
  LogIn,
  LogOut,
  Menu,
  PackageSearch,
  User as UserIcon,
  UserPlus,
  X,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { Logo } from "./ui/Logo";
import { toast } from "react-hot-toast";

const protectedLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profile", label: "Profile", icon: UserIcon },
];

const publicLinks = [
  { href: "/registry", label: "Registry", icon: PackageSearch },
  { href: "/report", label: "Report", icon: FilePlusIcon },
  { href: "/support", label: "Support", icon: LifeBuoy },
];

function FilePlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M12 18v-6" />
      <path d="M9 15h6" />
    </svg>
  );
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const closeMenu = () => setOpen(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await signOut(auth);
      toast.success("Signed out. See you soon!", { id: "signout" });
      router.replace("/login");
    } catch (error) {
      console.error("Sign out failed", error);
      toast.error("Could not sign out. Please try again.", { id: "signout" });
    } finally {
      setSigningOut(false);
    }
  };

  const linkClass = (href: string) =>
    cn(
      "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
      pathname === href
        ? "bg-blue-900 text-white shadow-lg shadow-blue-950/30"
        : "text-blue-950 hover:bg-blue-100"
    );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <nav className="page-shell flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Logo className="h-12 w-auto" />
          <div className="hidden items-center gap-1 lg:flex">
            {publicLinks.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={linkClass(href)}>
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </Link>
            ))}
            {user && (
              <>
                {protectedLinks.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href} className={linkClass(href)}>
                    <Icon className="h-4 w-4" aria-hidden />
                    {label}
                  </Link>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <button
              type="button"
              onClick={handleLogout}
              disabled={signingOut}
              className="inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-blue-900 transition hover:bg-blue-50"
              >
                <LogIn className="h-4 w-4" aria-hidden />
                Login
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-blue-900 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-950/20 transition hover:bg-blue-800"
              >
                <UserPlus className="h-4 w-4" aria-hidden />
                Sign up
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-full p-2 text-blue-950 hover:bg-slate-100 lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-slate-200 bg-white px-4 pb-4 pt-2 lg:hidden">
          <div className="grid gap-1">
            {[
              ...publicLinks,
              ...(user ? protectedLinks : []),
            ].map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={closeMenu}
                className={cn(
                  "inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold",
                  pathname === href ? "bg-blue-50 text-blue-900" : "text-slate-700 hover:bg-slate-100"
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {label}
              </Link>
            ))}

            <div className="my-2 border-t border-slate-100" />

            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                disabled={signingOut}
                className="inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
              >
                <LogOut className="h-5 w-5" aria-hidden />
                {signingOut ? "Signing out..." : "Sign out"}
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <LogIn className="h-5 w-5" aria-hidden />
                  Login
                </Link>
                <Link
                  href="/signup"
                  onClick={closeMenu}
                  className="inline-flex items-center gap-3 rounded-2xl bg-blue-900 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  <UserPlus className="h-5 w-5" aria-hidden />
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
