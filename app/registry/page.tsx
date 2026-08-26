"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { PackageSearch, Search, MapPin } from "lucide-react";
import { db } from "@/lib/firebase";
import { formatDate, normalizeItem, type Item } from "@/lib/items";
import { notifyError } from "@/lib/notify";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { Spinner } from "@/app/components/ui/Spinner";

const PAGE_SIZE = 9;

export default function RegistryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);

  const fetchItems = useCallback(async (nextPage = false) => {
    if (loadingRef.current || (nextPage && !hasMoreRef.current)) return;

    loadingRef.current = true;
    setLoading(true);

    try {
      const base = collection(db, "items");
      const q =
        nextPage && lastDocRef.current
          ? query(base, orderBy("createdAt", "desc"), startAfter(lastDocRef.current), limit(PAGE_SIZE))
          : query(base, orderBy("createdAt", "desc"), limit(PAGE_SIZE));

      const snapshot = await getDocs(q);
      const page = snapshot.docs.map((snap) => normalizeItem(snap.id, snap.data()));

      setItems((prev) => {
        const map = new Map(prev.map((item) => [item.id, item]));
        page.forEach((item) => map.set(item.id, item));
        return Array.from(map.values());
      });

      const next = snapshot.docs[snapshot.docs.length - 1] ?? null;
      const more = snapshot.docs.length === PAGE_SIZE;

      lastDocRef.current = next;
      hasMoreRef.current = more;
      setHasMore(more);
    } catch (error) {
      console.error(error);
      notifyError("Could not load the registry.");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => fetchItems(), 0);
    return () => window.clearTimeout(timer);
  }, [fetchItems]);

  const filtered = items.filter((item) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return (
      item.name.toLowerCase().includes(term) ||
      item.description.toLowerCase().includes(term) ||
      item.contact.toLowerCase().includes(term)
    );
  });

  return (
    <div className="page-shell py-10">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-blue-700">Community registry</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
          Lost &amp; Found Registry
        </h1>
        <p className="mt-3 text-slate-600">
          Browse everything the community has reported. Search by item, description, or contact.
        </p>
      </div>

      <div className="card mx-auto mt-8 flex max-w-2xl items-center gap-2 p-3">
        <Search className="ml-2 h-5 w-5 shrink-0 text-slate-500" aria-hidden />
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search the registry..."
          aria-label="Search the registry"
          className="border-0 bg-transparent focus:ring-0"
        />
      </div>

      <div className="mt-8">
        {loading && items.length === 0 ? (
          <div className="flex justify-center py-20">
            <Spinner label="Loading registry..." />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title={searchTerm ? "No items match your search" : "No items reported yet"}
            description={
              searchTerm
                ? "Try a different search term."
                : "Be the first to report an item and help the community."
            }
          />
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((item) => (
                <article
                  key={item.id}
                  className="card group overflow-hidden transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="relative aspect-[16/10] w-full bg-slate-100">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-300">
                        <PackageSearch className="h-12 w-12" aria-hidden />
                      </div>
                    )}
                    <div className="absolute left-4 top-4 space-y-2">
                      <Badge tone={item.claimed ? "success" : "warning"}>
                        {item.claimed ? "Resolved" : "Open"}
                      </Badge>
                      {item.type && (
                        <div>
                          <Badge tone={item.type === "lost" ? "sky" : "danger"}>
                            {item.type === "lost" ? "Lost" : "Found"}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-5">
                    <h2 className="text-lg font-bold text-slate-900">{item.name}</h2>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">{item.description}</p>

                    <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                      <MapPin className="h-4 w-4 text-slate-500" aria-hidden />
                      <span className="truncate">{item.contact}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">Reported {formatDate(item.createdAt)}</p>
                  </div>
                </article>
              ))}
            </div>

            {hasMore && (
              <div className="mt-10 flex justify-center">
                <Button variant="secondary" onClick={() => fetchItems(true)} loading={loading}>
                  {loading ? "Loading more..." : "Load more"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
