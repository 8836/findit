"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import {
  notifyError,
  notifyLoading,
  notifySuccess,
} from "../../lib/notify";

interface Item {
  id: string;
  name: string;
  description: string;
  contact: string;
  claimed?: boolean;
  claimedAt?: { toDate: () => Date };
  createdAt?: { toDate: () => Date };
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let unsubscribeItems: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(true);

      if (!currentUser) {
        setItems([]);
        setLoading(false);
        router.push("/login");
        return;
      }

      const itemsQuery = query(
        collection(db, "items"),
        where("uid", "==", currentUser.uid)
      );

      unsubscribeItems = onSnapshot(itemsQuery, (snapshot) => {
        setItems(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Item[]
        );
        setLoading(false);
      }, (error) => {
        console.error(error);
        notifyError("Unable to load profile items.");
        setItems([]);
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      unsubscribeItems?.();
    };
  }, []);

  const handleLogout = async () => {
    const toastId = notifyLoading("Signing out...");
    try {
      await signOut(auth);
      notifySuccess("Signed out successfully.", toastId);
    } catch (error) {
      console.error(error);
      notifyError("Unable to sign out.", toastId);
    }
  };

  const formatDate = (date?: { toDate: () => Date }) =>
    date ? date.toDate().toLocaleDateString() : "Unknown";

  const totalReports = items.length;
  const claimedReports = items.filter((item) => item.claimed).length;
  const openReports = totalReports - claimedReports;
  const mostRecentReport = [...items]
    .filter((item) => item.createdAt)
    .sort((a, b) => b.createdAt!.toDate().getTime() - a.createdAt!.toDate().getTime())[0];
  const mostRecentClaimed = [...items]
    .filter((item) => item.claimedAt)
    .sort((a, b) => b.claimedAt!.toDate().getTime() - a.claimedAt!.toDate().getTime())[0];

  if (!user) {
    return (
      <main className="min-h-screen bg-gray-50 p-6 flex flex-col items-center justify-center">
        <div className="max-w-md w-full rounded-xl bg-white p-8 shadow-md text-center">
          <h1 className="text-2xl font-bold mb-4">Profile</h1>
          <p className="text-gray-700 mb-4">
            You must be logged in to view your profile and item summary.
          </p>
          <Link
            href="/login"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <section className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
          <div className="rounded-3xl bg-white p-8 shadow-sm border border-gray-200">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">
                  User Profile
                </p>
                <h1 className="text-3xl font-bold text-slate-900 mt-2">
                  {user.displayName || user.email || "FindIt User"}
                </h1>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Email
                  </p>
                  <p className="mt-2 text-slate-900">{user.email ?? "Not available"}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    User ID
                  </p>
                  <p className="mt-2 text-slate-900 break-all">{user.uid}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-4">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Manage Items
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-sm border border-gray-200">
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">
                Your activity
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Total Reports
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{totalReports}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Open Reports
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{openReports}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Claimed Reports
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{claimedReports}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Most recent report
                  </p>
                  <p className="mt-2 text-slate-900">
                    {mostRecentReport
                      ? `${mostRecentReport.name} • ${formatDate(mostRecentReport.createdAt)}`
                      : "No reports yet."}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Latest claim
                  </p>
                  <p className="mt-2 text-slate-900">
                    {mostRecentClaimed
                      ? `${mostRecentClaimed.name} • ${formatDate(mostRecentClaimed.claimedAt)}`
                      : "No claimed items yet."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-8 shadow-sm border border-gray-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">
                Your reported items
              </p>
              <h2 className="text-2xl font-semibold text-slate-900 mt-2">
                {totalReports} item{totalReports === 1 ? "" : "s"}
              </h2>
            </div>
            <Link
              href="/report"
              className="inline-flex items-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Report a new item
            </Link>
          </div>

          {loading ? (
            <p className="mt-6 text-slate-600">Loading items...</p>
          ) : items.length === 0 ? (
            <p className="mt-6 text-slate-600">
              You haven’t reported any items yet. Start by reporting one now.
            </p>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {item.name}
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">
                        {item.description}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        item.claimed
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {item.claimed ? "Claimed" : "Open"}
                    </span>
                  </div>
                  <div className="mt-4 text-sm text-slate-600 space-y-2">
                    <p>Contact: {item.contact}</p>
                    <p>Reported: {formatDate(item.createdAt)}</p>
                    {item.claimedAt && <p>Claimed: {formatDate(item.claimedAt)}</p>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
