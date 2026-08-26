"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import {
  Check,
  CheckCircle2,
  CircleDashed,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { formatDate, isThisWeek, isToday, normalizeItem, type Item } from "@/lib/items";
import { notifyError, notifyLoading, notifySuccess } from "@/lib/notify";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { Spinner } from "@/app/components/ui/Spinner";
import { StatCard } from "@/app/components/ui/StatCard";

type DateFilter = "all" | "today" | "week";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [claimingItemId, setClaimingItemId] = useState<string | null>(null);
  const [confirmClaimItem, setConfirmClaimItem] = useState<Item | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterByDate, setFilterByDate] = useState<DateFilter>("all");
  const router = useRouter();

  useEffect(() => {
    let unsubscribeItems: Unsubscribe | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      unsubscribeItems?.();
      unsubscribeItems = undefined;

      if (!currentUser) {
        setItems([]);
        setLoading(false);
        router.replace("/login");
        return;
      }

      setLoading(true);
      const q = query(collection(db, "items"), where("uid", "==", currentUser.uid));
      unsubscribeItems = onSnapshot(
        q,
        (snapshot) => {
          setItems(snapshot.docs.map((snap) => normalizeItem(snap.id, snap.data())));
          setLoading(false);
        },
        (error) => {
          console.error(error);
          notifyError("Could not load your dashboard items.");
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeItems?.();
      unsubscribeAuth();
    };
  }, [router]);

  const handleDelete = async (id: string) => {
    const toastId = notifyLoading("Deleting item...");
    try {
      await deleteDoc(doc(db, "items", id));
      notifySuccess("Item deleted.", toastId);
    } catch (error) {
      console.error(error);
      notifyError("Could not delete item.", toastId);
    }
  };

  const startEdit = (item: Item) => {
    setEditingItemId(item.id);
    setEditingName(item.name);
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
      notifySuccess("Item updated.", toastId);
      cancelEdit();
    } catch (error) {
      console.error(error);
      notifyError("Could not update item.", toastId);
    }
  };

  const handleClaim = async () => {
    if (!confirmClaimItem) return;
    setClaimingItemId(confirmClaimItem.id);
    const toastId = notifyLoading("Marking item as claimed...");

    try {
      await updateDoc(doc(db, "items", confirmClaimItem.id), {
        claimed: true,
        claimedAt: Timestamp.now(),
      });
      notifySuccess("Item marked as claimed.", toastId);
      setConfirmClaimItem(null);
    } catch (error) {
      console.error(error);
      notifyError("Could not claim item.", toastId);
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

    if (!matchesSearch) return false;
    if (filterByDate === "all") return true;
    if (filterByDate === "today") return isToday(item.createdAt);
    return isThisWeek(item.createdAt);
  });

  const claimedCount = items.filter((item) => item.claimed).length;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner label="Loading your dashboard..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <CardLoginRequired />
      </div>
    );
  }

  return (
    <div className="page-shell py-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-blue-700">Dashboard</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            My Reported Items
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-600">
            Manage your reports, claim statuses, and keep the community informed.
          </p>
        </div>
        <Link href="/report">
          <Button variant="primary" size="lg">
            <Plus className="h-4 w-4" aria-hidden />
            Report an item
          </Button>
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total items" value={items.length} icon={Package} tone="blue" />
        <StatCard label="Claimed" value={claimedCount} icon={CheckCircle2} tone="green" />
        <StatCard label="Open" value={items.length - claimedCount} icon={CircleDashed} tone="amber" />
      </div>

      <div className="card mt-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" aria-hidden />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search your items..."
            className="pl-12"
          />
        </div>
        <select
          value={filterByDate}
          onChange={(e) => setFilterByDate(e.target.value as DateFilter)}
          aria-label="Filter by date"
          className="sm:w-48"
        >
          <option value="all">All dates</option>
          <option value="today">Today</option>
          <option value="week">This week</option>
        </select>
        <Button variant="secondary" onClick={() => setSearchTerm("")} disabled={!searchTerm}>
          Clear
        </Button>
      </div>

      {filteredItems.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={searchTerm || filterByDate !== "all" ? Search : Package}
            title={searchTerm || filterByDate !== "all" ? "No matching items" : "No reports yet"}
            description={
              searchTerm || filterByDate !== "all"
                ? "Try changing your search or filters."
                : "Report your first lost or found item to see it here."
            }
            action={
              <Link href="/report">
                <Button variant="primary">
                  <Plus className="h-4 w-4" aria-hidden />
                  Report an item
                </Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {filteredItems.map((item) => (
            <article
              key={item.id}
              className="card overflow-hidden transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="relative aspect-[16/10] w-full bg-slate-100">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-500">
                    <Package className="h-12 w-12" aria-hidden />
                  </div>
                )}
                <div className="absolute right-4 top-4">
                  <Badge tone={item.claimed ? "success" : "warning"}>
                    {item.claimed ? "Claimed" : "Open"}
                  </Badge>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{item.name}</h2>
                    <p className="mt-1 text-sm line-clamp-2 text-slate-600">{item.description}</p>
                  </div>
                </div>

                <dl className="mt-5 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-600">Contact</dt>
                    <dd className="mt-0.5 truncate">{item.contact}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-600">Reported</dt>
                    <dd className="mt-0.5">{formatDate(item.createdAt)}</dd>
                  </div>
                  {item.claimedAt && (
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-600">Claimed</dt>
                      <dd className="mt-0.5">{formatDate(item.claimedAt)}</dd>
                    </div>
                  )}
                </dl>

                <div className="mt-6 flex flex-wrap gap-3">
                  {editingItemId === item.id ? (
                    <div className="w-full space-y-3">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        placeholder="Update item name"
                        autoFocus
                      />
                      <div className="flex gap-3">
                        <Button variant="primary" size="sm" onClick={() => saveEdit(item.id)}>
                          <Check className="h-4 w-4" aria-hidden />
                          Save
                        </Button>
                        <Button variant="secondary" size="sm" onClick={cancelEdit}>
                          <X className="h-4 w-4" aria-hidden />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {!item.claimed && (
                        <>
                          <Button variant="secondary" size="sm" onClick={() => startEdit(item)}>
                            <Pencil className="h-4 w-4" aria-hidden />
                            Edit
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="h-4 w-4" aria-hidden />
                            Delete
                          </Button>
                          <Button
                            variant="accent"
                            size="sm"
                            onClick={() => setConfirmClaimItem(item)}
                            disabled={claimingItemId === item.id}
                          >
                            <CheckCircle2 className="h-4 w-4" aria-hidden />
                            {claimingItemId === item.id ? "Claiming..." : "Mark as claimed"}
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmClaimItem)}
        title="Mark as claimed?"
        message={
          <>
            You&apos;re marking <span className="font-semibold">{confirmClaimItem?.name}</span> as
            claimed. The item will move to your claimed reports.
          </>
        }
        confirmLabel="Yes, mark as claimed"
        loading={claimingItemId === confirmClaimItem?.id}
        onConfirm={handleClaim}
        onCancel={() => setConfirmClaimItem(null)}
      />
    </div>
  );
}

function CardLoginRequired() {
  return (
    <div className="card max-w-md p-8 text-center">
      <h2 className="text-2xl font-bold text-slate-900">Sign in required</h2>
      <p className="mt-2 text-sm text-slate-600">
        Log in to view your reported items and dashboard.
      </p>
      <Link href="/login">
        <Button variant="primary" className="mt-6">
          Go to login
        </Button>
      </Link>
    </div>
  );
}
