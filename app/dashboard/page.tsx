"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";

interface Item {
  id: string;
  name: string;
  description: string;
  contact: string;
  imageUrl?: string;
  createdAt?: Date | { seconds: number; nanoseconds: number };
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const q = query(
          collection(db, "items"),
          where("uid", "==", currentUser.uid) // 🔹 filter by user ID
        );

        const unsubscribeItems = onSnapshot(q, (snapshot) => {
          setItems(
            snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as Item[]
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

  if (!user) {
    return <p className="p-6">Please log in to view your dashboard.</p>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">My Reported Items</h1>

      {loading ? (
        <p className="text-gray-500">Loading your items...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">You haven’t reported any items yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <div key={item.id} className="bg-white p-4 rounded shadow">
              {item.imageUrl && (
                <div className="relative w-full h-48 rounded mb-2 overflow-hidden">
                  <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                </div>
              )}
              <h2 className="text-xl font-semibold">{item.name}</h2>
              <p className="text-gray-700">{item.description}</p>
              <p className="text-sm text-gray-500">Contact: {item.contact}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
