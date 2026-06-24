"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
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
} from "../../lib/notify"; // ✅ use centralized notify

interface Item {
  id: string;
  name: string;
  description: string;
  contact: string;
  imageUrl?: string;
  createdAt?: Timestamp;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

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
      }
    });

    return () => unsubscribeAuth();
  }, []);

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

  if (!user) {
    return <p className="p-6 text-red-600 font-semibold">Please log in to view your dashboard.</p>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-3xl font-bold text-blue-800 mb-6">My Reported Items</h1>

      {loading ? (
        <p className="text-gray-500">Loading your items...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">
          You haven’t reported any items yet.{" "}
          <a href="/report" className="text-green-600 font-semibold hover:underline">
            Report one now
          </a>.
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition"
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
              <h2 className="text-xl font-semibold text-blue-800">{item.name}</h2>
              <p className="text-gray-700 mt-2">{item.description}</p>
              <p className="text-sm text-gray-500 mt-1">Contact: {item.contact}</p>
              {item.createdAt && (
                <p className="text-xs text-gray-400 mt-1">
                  Reported on {item.createdAt.toDate().toLocaleDateString()}
                </p>
              )}

              {editingItemId === item.id ? (
                <div className="mt-4 space-y-2">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-600"
                    placeholder="Enter new item name"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(item.id)}
                      className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="bg-gray-300 text-gray-800 px-3 py-1 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => startEdit(item.id, item.name)}
                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
