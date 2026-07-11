"use client";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { collection, query, orderBy, limit, startAfter, getDocs, DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { notifyError } from "../../lib/notify";

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
  const [hasMore, setHasMore] = useState(true);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);

  const fetchItems = useCallback(async (nextPage = false) => {
    if (loadingRef.current || (nextPage && !hasMoreRef.current)) {
      return;
    }

    loadingRef.current = true;
    setLoading(true);

    try {
      const pageSize = 6;
      const q = nextPage && lastDocRef.current
        ? query(
            collection(db, "items"),
            orderBy("createdAt", "desc"),
            startAfter(lastDocRef.current),
            limit(pageSize)
          )
        : query(collection(db, "items"), orderBy("createdAt", "desc"), limit(pageSize));

      const snapshot = await getDocs(q);

      const newItems = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Item[];

      setItems((prev) => {
        const mergedItems = [...prev, ...newItems];
        return Array.from(
          mergedItems.reduce<Map<string, Item>>((map, item) => {
            if (!map.has(item.id)) {
              map.set(item.id, item);
            }
            return map;
          }, new Map()).values()
        );
      });
      const nextDoc = snapshot.docs[snapshot.docs.length - 1] || null;
      const moreResultsAvailable = snapshot.docs.length === pageSize;
      setLastDoc(nextDoc);
      setHasMore(moreResultsAvailable);
      hasMoreRef.current = moreResultsAvailable;
      lastDocRef.current = nextDoc;
    } catch (error) {
      console.error(error);
      notifyError("Could not load registry items.");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

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
                unoptimized
              />
            </div>
          )}
            <h2 className="text-xl font-semibold">{item.name}</h2>
            <p className="text-gray-700">{item.description}</p>
            <p className="text-sm text-gray-500">Contact: {item.contact}</p>
          </div>
        ))}
      </div>

      {lastDoc && hasMore && (
        <button
          onClick={() => fetchItems(true)}
          disabled={loading}
          className="mt-6 px-4 py-2 bg-blue-600 text-white rounded"
        >
          {loading ? "Loading..." : "Load More"}
        </button>
      )}

      {loading && <p className="text-gray-500 mt-4">Loading...</p>}
    </div>
  );
}
