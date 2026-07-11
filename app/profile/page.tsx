"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { notifyError, notifyLoading, notifySuccess } from "../../lib/notify";

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
  }, [router]);

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
      <main className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-purple-900 p-6 flex flex-col items-center justify-center">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-md rounded-4xl shadow-2xl shadow-black/40 p-8 text-center space-y-6 border border-white/20">
          <h1 className="text-3xl font-bold text-white">Profile</h1>
          <p className="text-sky-100 font-medium">
            You must be logged in to view your profile and item summary.
          </p>
          <Link
            href="/login"
            className="inline-block w-full rounded-full bg-yellow-400 hover:bg-yellow-300 px-6 py-3 font-bold text-blue-950 transition"
          >
            Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-purple-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <section className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
          <div className="rounded-4xl bg-white/10 backdrop-blur-md shadow-2xl shadow-black/40 p-8 border border-white/20">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-sky-200 font-medium">
                  User Profile
                </p>
                <h1 className="text-3xl font-bold text-white mt-2">
                  {user.displayName || user.email || "FindIt User"}
                </h1>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-sky-200 font-medium">
                    Email
                  </p>
                  <p className="mt-2 text-white">{user.email ?? "Not available"}</p>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-sky-200 font-medium">
                    User ID
                  </p>
                  <p className="mt-2 text-white/80 break-all text-sm">{user.uid}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-4">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center rounded-full bg-blue-600 hover:bg-blue-500 px-5 py-2 text-sm font-semibold text-white transition"
                >
                  Manage Items
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center rounded-full bg-yellow-400 hover:bg-yellow-300 px-5 py-2 text-sm font-semibold text-blue-950 transition"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-4xl bg-white/10 backdrop-blur-md shadow-2xl shadow-black/40 p-8 border border-white/20">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.24em] text-sky-200 font-medium">
                Your activity
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-sky-200 font-medium">
                    Total Reports
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-yellow-300">{totalReports}</p>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-sky-200 font-medium">
                    Open Reports
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-blue-300">{openReports}</p>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-sky-200 font-medium">
                    Claimed Reports
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-emerald-300">{claimedReports}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-sky-200 font-medium">
                    Most recent report
                  </p>
                  <p className="mt-2 text-white/80 text-sm">
                    {mostRecentReport
                      ? `${mostRecentReport.name} • ${formatDate(mostRecentReport.createdAt)}`
                      : "No reports yet."}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-sky-200 font-medium">
                    Latest claim
                  </p>
                  <p className="mt-2 text-white/80 text-sm">
                    {mostRecentClaimed
                      ? `${mostRecentClaimed.name} • ${formatDate(mostRecentClaimed.claimedAt)}`
                      : "No claimed items yet."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-4xl bg-white/10 backdrop-blur-md shadow-2xl shadow-black/40 p-8 border border-white/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-sky-200 font-medium">
                Your reported items
              </p>
              <h2 className="text-2xl font-semibold text-white mt-2">
                {totalReports} item{totalReports === 1 ? "" : "s"}
              </h2>
            </div>
            <Link
              href="/report"
              className="inline-flex items-center rounded-full bg-yellow-400 hover:bg-yellow-300 px-5 py-2 text-sm font-semibold text-blue-950 transition"
            >
              Report a new item
            </Link>
          </div>

          {loading ? (
            <p className="text-sky-100 font-medium">Loading items...</p>
          ) : items.length === 0 ? (
            <p className="text-sky-100">
              You haven&apos;t reported any items yet. Start by reporting one now.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-3xl border border-white/20 bg-white/5 backdrop-blur-sm p-5 hover:bg-white/10 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {item.name}
                      </h3>
                      <p className="text-sm text-white/70 mt-1">
                        {item.description}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${
                        item.claimed
                          ? "bg-emerald-500/20 text-emerald-200"
                          : "bg-yellow-500/20 text-yellow-200"
                      }`}
                    >
                      {item.claimed ? "Claimed" : "Open"}
                    </span>
                  </div>
                  <div className="mt-4 text-sm text-white/70 space-y-2">
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
