"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { collection, onSnapshot, query, where, type Unsubscribe } from "firebase/firestore";
import { CheckCircle2, CircleDashed, LayoutDashboard, LogOut, Package, Plus } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { formatDate, normalizeItem, toDate, type Item } from "@/lib/items";
import { notifyError, notifyLoading, notifySuccess } from "@/lib/notify";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { Spinner } from "@/app/components/ui/Spinner";
import { StatCard } from "@/app/components/ui/StatCard";
import { initials } from "@/lib/utils";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let unsubscribeItems: Unsubscribe | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(true);

      if (!currentUser) {
        setItems([]);
        setLoading(false);
        router.replace("/login");
        return;
      }

      const q = query(collection(db, "items"), where("uid", "==", currentUser.uid));
      unsubscribeItems = onSnapshot(
        q,
        (snapshot) => {
          setItems(snapshot.docs.map((snap) => normalizeItem(snap.id, snap.data())));
          setLoading(false);
        },
        (error) => {
          console.error(error);
          notifyError("Could not load your profile items.");
          setItems([]);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeItems?.();
      unsubscribeAuth();
    };
  }, [router]);

  const handleLogout = async () => {
    setSigningOut(true);
    const toastId = notifyLoading("Signing out...");
    try {
      await signOut(auth);
      notifySuccess("Signed out safely.", toastId);
      router.replace("/login");
    } catch (error) {
      console.error(error);
      notifyError("Could not sign out.", toastId);
    } finally {
      setSigningOut(false);
    }
  };

  const claimed = items.filter((item) => item.claimed).length;
  const mostRecentReport = [...items]
    .filter((item) => item.createdAt)
    .sort(
      (a, b) =>
        (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0)
    )[0];
  const mostRecentClaim = [...items]
    .filter((item) => item.claimedAt)
    .sort(
      (a, b) =>
        (toDate(b.claimedAt)?.getTime() ?? 0) - (toDate(a.claimedAt)?.getTime() ?? 0)
    )[0];

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner label="Loading your profile..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <div className="card max-w-md p-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Sign in required</h1>
          <p className="mt-2 text-sm text-slate-500">Log in to view your profile and activity.</p>
          <Link href="/login">
            <Button variant="primary" className="mt-6">
              Go to login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell py-10">
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-sky-700 px-6 py-8 text-white sm:px-8">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-xl font-black backdrop-blur">
                {initials(user.displayName || user.email)}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-200">Profile</p>
                <h1 className="mt-1 text-2xl font-bold">
                  {user.displayName || user.email || "FindIt User"}
                </h1>
                <p className="mt-1 text-sm text-sky-100/80">{user.email}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Link href="/dashboard">
                <Button variant="secondary" size="sm">
                  <LayoutDashboard className="h-4 w-4" aria-hidden />
                  Dashboard
                </Button>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={signingOut}
                className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/25 disabled:opacity-60"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                {signingOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <StatCard label="Total reports" value={items.length} icon={Package} tone="blue" />
            <StatCard label="Open" value={items.length - claimed} icon={CircleDashed} tone="amber" />
            <StatCard label="Claimed" value={claimed} icon={CheckCircle2} tone="green" />
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="card p-6">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Most recent report</p>
          <p className="mt-2 font-semibold text-slate-900">
            {mostRecentReport?.name ?? "No reports yet"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {formatDate(mostRecentReport?.createdAt)}
          </p>
        </div>
        <div className="card p-6">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Latest claim</p>
          <p className="mt-2 font-semibold text-slate-900">
            {mostRecentClaim?.name ?? "No claims yet"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {formatDate(mostRecentClaim?.claimedAt)}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Your reported items</h2>
            <p className="mt-1 text-sm text-slate-500">
              {items.length} item{items.length === 1 ? "" : "s"}
            </p>
          </div>
          <Link href="/report">
            <Button variant="accent">
              <Plus className="h-4 w-4" aria-hidden />
              Report an item
            </Button>
          </Link>
        </div>

        <div className="mt-6">
          {items.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No reports yet"
              description="Report your first item and it will show up here."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((item) => (
                <article key={item.id} className="card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">{item.name}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.description}</p>
                    </div>
                    <Badge tone={item.claimed ? "success" : "warning"}>
                      {item.claimed ? "Claimed" : "Open"}
                    </Badge>
                  </div>
                  <div className="mt-4 space-y-1 text-sm text-slate-500">
                    <p>Contact: {item.contact}</p>
                    <p>Reported: {formatDate(item.createdAt)}</p>
                    {item.claimedAt && <p>Claimed: {formatDate(item.claimedAt)}</p>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
