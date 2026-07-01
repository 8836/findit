"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import {
  notifySuccess,
  notifyError,
  notifyLoading,
} from "../../lib/notify";

interface Item {
  id: string;
  name: string;
  description: string;
  contact: string;
  imageUrl?: string;
  createdAt?: Timestamp;
  claimed?: boolean;
  claimedAt?: Timestamp;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [claimingItemId, setClaimingItemId] = useState<string | null>(null);
  const [confirmClaimItem, setConfirmClaimItem] = useState<Item | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterByDate, setFilterByDate] = useState("all");
  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const q = query(collection(db, "items"), where("uid", "==", currentUser.uid));
        const unsubscribeItems = onSnapshot(q, (snapshot) => {
          setItems(
            snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Item[]
          );
          setLoading(false);
        });
        return () => unsubscribeItems();
      } else {
        setItems([]);
        setLoading(false);
        router.push("/login");
      }
    });

    return () => unsubscribeAuth();
  }, [router]);

  const handleDelete = async (id: string) => {
    const toastId = notifyLoading("Deleting item...");
    try {
      await deleteDoc(doc(db, "items", id));
      notifySuccess("Item deleted successfully!", toastId);
    } catch (err) {
      console.error(err);
      notifyError("Error deleting item.", toastId);
    }
  };

  const startEdit = (id: string, currentName: string) => {
    setEditingItemId(id);
    setEditingName(currentName);
  };

  const cancelEdit = () => {
    setEditingItemId(null);
    setEditingName("");
  };

  const saveEdit = async (id: string) => {
    const trimmedName = editingName.trim();
    if (!trimmedName) {
      notifyError("Item name cannot be empty.");
      return;
    }

    const toastId = notifyLoading("Updating item...");
    try {
      await updateDoc(doc(db, "items", id), { name: trimmedName });
      notifySuccess("Item updated successfully!", toastId);
      setEditingItemId(null);
      setEditingName("");
    } catch (err) {
      console.error(err);
      notifyError("Error updating item.", toastId);
    }
  };

  const requestClaim = (item: Item) => {
    setConfirmClaimItem(item);
  };

  const cancelClaim = () => {
    setConfirmClaimItem(null);
  };

  const handleClaim = async () => {
    if (!confirmClaimItem) return;
    setClaimingItemId(confirmClaimItem.id);
    const toastId = notifyLoading("Claiming item...");
    try {
      await updateDoc(doc(db, "items", confirmClaimItem.id), {
        claimed: true,
        claimedAt: Timestamp.now(),
      });
      notifySuccess("Item marked as claimed!", toastId);
      setConfirmClaimItem(null);
    } catch (err) {
      console.error(err);
      notifyError("Error claiming item.", toastId);
    } finally {
      setClaimingItemId(null);
    }
  };

  const filteredItems = items.filter((item) => {
    const normalizedTerm = searchTerm.trim().toLowerCase();
    const matchesSearch =
      normalizedTerm === "" ||
      item.name.toLowerCase().includes(normalizedTerm) ||
      item.description.toLowerCase().includes(normalizedTerm) ||
      item.contact.toLowerCase().includes(normalizedTerm);

    if (!matchesSearch) {
      return false;
    }

    if (filterByDate === "all") {
      return true;
    }

    if (!item.createdAt) {
      return false;
    }

    const itemDate = item.createdAt.toDate();
    const today = new Date();

    if (filterByDate === "today") {
      return itemDate.toDateString() === today.toDateString();
    }

    if (filterByDate === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 7);
      return itemDate >= weekAgo;
    }

    return true;
  });

  if (!user) {
    return <p className="p-6 text-(--color-secondary) font-semibold">Please log in to view your dashboard.</p>;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-8xl mx-auto space-y-6">
        <div className="rounded-4xl bg-blue-950/95 p-8 shadow-2xl shadow-blue-900/10 text-white">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-sky-200 font-medium">Dashboard</p>
              <h1 className="text-4xl font-bold tracking-tight">My Reported Items</h1>
              <p className="mt-2 max-w-2xl text-sky-100">
                Manage your reports, claim statuses, and actions from a clean dashboard with fast search and filters.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              <div className="rounded-3xl bg-white/10 border border-white/15 p-4">
                <p className="text-sm uppercase tracking-[0.24em] text-sky-200 font-medium">Total items</p>
                <p className="mt-3 text-3xl font-semibold">{items.length}</p>
              </div>
              <div className="rounded-3xl bg-white/10 border border-white/15 p-4">
                <p className="text-sm uppercase tracking-[0.24em] text-sky-200 font-medium">Claimed</p>
                <p className="mt-3 text-3xl font-semibold">{items.filter((item) => item.claimed).length}</p>
              </div>
              <div className="rounded-3xl bg-white/10 border border-white/15 p-4">
                <p className="text-sm uppercase tracking-[0.24em] text-sky-200 font-medium">Open</p>
                <p className="mt-3 text-3xl font-semibold">{items.filter((item) => !item.claimed).length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-4xl bg-white p-6 shadow-xl shadow-slate-300/40">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex-1 rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-slate-200 bg-white py-3 px-4 rounded-2xl shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="flex gap-3 flex-col sm:flex-row items-stretch sm:items-center">
              <label htmlFor="filterByDate" className="sr-only">
                Filter by date
              </label>
              <select
                id="filterByDate"
                value={filterByDate}
                onChange={(e) => setFilterByDate(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
              </select>
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                disabled={!searchTerm}
                className="rounded-2xl bg-blue-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/10 hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-slate-700">Loading your items...</p>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/70">
            <p className="text-slate-700">
              No items match your search/filter.
              <a href="/report" className="text-blue-900 font-semibold hover:underline">
                Report one now
              </a>.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-2">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/70 border border-slate-200 transition hover:-translate-y-1 hover:shadow-2xl"
              >
                {item.imageUrl && (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    width={640}
                    height={320}
                    className="w-full h-48 object-cover rounded-3xl mb-5"
                    unoptimized
                  />
                )}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold text-slate-900">{item.name}</h2>
                    <p className="mt-2 text-slate-600">{item.description}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      item.claimed
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-sky-100 text-sky-800"
                    }`}
                  >
                    {item.claimed ? "Claimed" : "Open"}
                  </span>
                </div>
                <div className="mt-5 space-y-2 text-sm text-slate-600">
                  <p>Contact: {item.contact}</p>
                  {item.createdAt && (
                    <p>Reported: {item.createdAt.toDate().toLocaleDateString()}</p>
                  )}
                  {item.claimedAt && (
                    <p>Claimed: {item.claimedAt.toDate().toLocaleDateString()}</p>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  {!item.claimed && (
                    <>
                      <button
                        onClick={() => startEdit(item.id, item.name)}
                        className="rounded-full bg-blue-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
                      >
                        Delete
                      </button>
                    </>
                  )}
                  {editingItemId === item.id ? (
                    <div className="mt-4 w-full space-y-3">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        placeholder="Update item name"
                      />
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => saveEdit(item.id)}
                          className="rounded-full bg-blue-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="rounded-full bg-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {!item.claimed && (
                        <>
                          <button
                            onClick={() => startEdit(item.id, item.name)}
                            className="rounded-full bg-blue-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
                          >
                            Delete
                          </button>
                        </>
                      )}
                      {!item.claimed ? (
                        <button
                          onClick={() => requestClaim(item)}
                          className="rounded-full bg-yellow-400 px-4 py-2 text-sm font-semibold text-blue-950 shadow-sm hover:bg-yellow-300"
                          disabled={claimingItemId === item.id}
                        >
                          {claimingItemId === item.id ? "Claiming..." : "Claim Item"}
                        </button>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmClaimItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-4xl bg-linear-to-br from-blue-900 via-slate-900 to-sky-700 p-8 text-white shadow-2xl shadow-slate-900/40">
            <h2 className="text-3xl font-bold">Claim Item?</h2>
            <p className="mt-4 text-slate-100/90">
              Are you sure you want to mark <span className="font-semibold">{confirmClaimItem.name}</span> as claimed?
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={cancelClaim}
                className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/20"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClaim}
                className="rounded-full bg-yellow-400 px-5 py-3 text-sm font-semibold text-blue-950 shadow-lg shadow-yellow-400/30 hover:bg-yellow-300"
              >
                Yes, Claim Item
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
