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

  const handleClaim = async (id: string) => {
    setClaimingItemId(id);
    const toastId = notifyLoading("Claiming item...");
    try {
      await updateDoc(doc(db, "items", id), {
        claimed: true,
        claimedAt: Timestamp.now(),
      });
      notifySuccess("Item marked as claimed!", toastId);
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
    <div className="min-h-screen bg-(--color-background) p-6">
      <h1 className="text-3xl font-bold text-(--color-primary) mb-6">My Reported Items</h1>

      {/* Search & Filter Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex flex-1 gap-2">
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-(--color-primary)"
          />
          <button
            type="button"
            onClick={() => setSearchTerm("")}
            disabled={!searchTerm}
            className="self-stretch px-4 py-2 rounded border border-gray-300 bg-white text-sm font-medium text-(--color-primary) hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear
          </button>
        </div>
        <label htmlFor="filterByDate" className="sr-only">
          Filter by date
        </label>
        <select
          id="filterByDate"
          value={filterByDate}
          onChange={(e) => setFilterByDate(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-(--color-primary)"
        >
          <option value="all">All Dates</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
        </select>
      </div>

      {loading ? (
        <p className="text-(--color-foreground) opacity-70">Loading your items...</p>
      ) : filteredItems.length === 0 ? (
        <p className="text-(--color-foreground) opacity-70">
          No items match your search/filter.{" "}
          <a href="/report" className="text-(--color-secondary) font-semibold hover:underline">
            Report one now
          </a>.
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-(--color-background) p-6 rounded-lg shadow-md hover:shadow-lg transition border border-gray-200"
            >
              {item.imageUrl && (
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  width={640}
                  height={320}
                  className="w-full h-48 object-cover rounded mb-4"
                  unoptimized
                />
              )}
              <h2 className="text-xl font-semibold text-(--color-primary)">{item.name}</h2>
              <p className="text-(--color-foreground) mt-2">{item.description}</p>
              <p className="text-sm text-(--color-foreground) opacity-70 mt-1">Contact: {item.contact}</p>
              {item.createdAt && (
                <p className="text-xs text-(--color-foreground) opacity-50 mt-1">
                  Reported on {item.createdAt.toDate().toLocaleDateString()}
                </p>
              )}

              {editingItemId === item.id ? (
                <div className="mt-4 space-y-2">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-(--color-primary)"
                    placeholder="Enter new item name"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(item.id)}
                      className="bg-(--color-secondary) text-white px-3 py-1 rounded hover:opacity-90"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="bg-gray-300 text-(--color-foreground) px-3 py-1 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 mt-4">
                  {!item.claimed && (
                    <>
                      <button
                        onClick={() => startEdit(item.id, item.name)}
                        className="bg-(--color-primary) text-white px-3 py-1 rounded hover:opacity-90"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="bg-red-600 text-white px-3 py-1 rounded hover:opacity-90"
                      >
                        Delete
                      </button>
                    </>
                  )}
                  {!item.claimed ? (
                    <button
                      onClick={() => handleClaim(item.id)}
                      className="bg-(--color-accent) text-black px-3 py-1 rounded hover:opacity-90"
                      disabled={claimingItemId === item.id}
                    >
                      {claimingItemId === item.id ? "Claiming..." : "Claim Item"}
                    </button>
                  ) : (
                    <div>
                      <span className="inline-block bg-(--color-secondary)/10 text-(--color-secondary) 
                                       text-xs font-semibold px-2 py-1 rounded mt-2">
                        ✅ Claimed
                      </span>
                      {item.claimedAt && (
                        <p className="text-xs text-(--color-secondary) mt-1">
                          Claimed on {item.claimedAt.toDate().toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
