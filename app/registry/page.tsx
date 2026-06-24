"use client";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { collection, query, orderBy, limit, startAfter, getDocs, DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";

interface Item {
  id: string;
  name: string;
  description: string;
  contact: string;
  imageUrl?: string;
  createdAt?: Date | { seconds: number; nanoseconds: number };
}

export default function RegistryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchItems = useCallback(async (nextPage = false) => {
    setLoading(true);

    const q = nextPage && lastDoc
      ? query(
          collection(db, "items"),
          orderBy("createdAt", "desc"),
          startAfter(lastDoc),
          limit(6)
        )
      : query(collection(db, "items"), orderBy("createdAt", "desc"), limit(6));

    const snapshot = await getDocs(q);

    const newItems = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Item[];

    setItems((prev) => [...prev, ...newItems]);
    setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
    setLoading(false);
  }, [lastDoc]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems();
    }, 0);

    return () => clearTimeout(timer);
  }, [fetchItems]);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">Lost & Found Registry</h1>

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <div key={item.id} className="bg-white p-4 rounded shadow">
            {item.imageUrl && (
            <div className="relative w-full h-48 rounded mb-2 overflow-hidden">
              <Image
                src={item.imageUrl}
                alt={item.name}
                fill
                className="object-cover"
              />
            </div>
          )}
            <h2 className="text-xl font-semibold">{item.name}</h2>
            <p className="text-gray-700">{item.description}</p>
            <p className="text-sm text-gray-500">Contact: {item.contact}</p>
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {lastDoc && (
        <button
          onClick={() => fetchItems(true)}
          className="mt-6 px-4 py-2 bg-blue-600 text-white rounded"
        >
          Load More
        </button>
      )}

      {loading && <p className="text-gray-500 mt-4">Loading...</p>}
    </div>
  );
}
