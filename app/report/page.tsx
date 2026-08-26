"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ImagePlus, Send, UserRound, X } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { notifyError, notifyLoading, notifySuccess } from "@/lib/notify";
import { Button } from "@/app/components/ui/Button";
import { TextAreaField, TextField } from "@/app/components/ui/Field";
import { cn } from "@/lib/utils";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export default function ReportPage() {
  const [type, setType] = useState<"lost" | "found">("lost");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const selectFile = (nextFile: File | null) => {
    if (!nextFile) {
      setFile(null);
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }

    if (!nextFile.type.startsWith("image/")) {
      notifyError("Please choose an image file.");
      return;
    }
    if (nextFile.size > MAX_FILE_BYTES) {
      notifyError("Image must be 5MB or smaller.");
      return;
    }

    setFile(nextFile);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(nextFile);
    });
  };

  const toBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      notifyError("Please log in to report an item.");
      return;
    }

    if (!name.trim() || !description.trim() || !contact.trim()) {
      notifyError("Please complete every field.");
      return;
    }

    setSubmitting(true);
    const toastId = notifyLoading("Submitting your report...");

    try {
      let imageUrl = "";

      if (file) {
        try {
          const base64 = await toBase64(file);
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file: base64 }),
          });
          const data = await res.json();
          if (data.url) imageUrl = data.url;
          else notifyError("Image upload failed, but your report will still be saved.", toastId);
        } catch (uploadError) {
          console.error("Cloudinary upload failed:", uploadError);
          notifyError("Image upload failed, but your report will still be saved.", toastId);
        }
      }

      await addDoc(collection(db, "items"), {
        uid: user.uid,
        name: name.trim(),
        description: description.trim(),
        contact: contact.trim(),
        type,
        imageUrl,
        createdAt: serverTimestamp(),
        claimed: false,
        source: "web",
      });

      notifySuccess("Item reported successfully!", toastId);

      setName("");
      setDescription("");
      setContact("");
      setFile(null);
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    } catch (error) {
      console.error("Report submission failed:", error);
      notifyError("Could not submit your report. Please try again.", toastId);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="card max-w-md p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-800">
            <UserRound className="h-7 w-7" aria-hidden />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-slate-900">Login required</h1>
          <p className="mt-2 text-sm text-slate-500">
            You need an account to report lost or found items.
          </p>
          <Link href="/login">
            <Button variant="primary" className="mt-6">
              Go to login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell py-10">
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-blue-700">Report</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
          {type === "lost" ? "Report a lost item" : "Register a found item"}
        </h1>
        <p className="mt-3 text-slate-500">
          Share the details below. Adding a clear photo dramatically improves the chance of a reunion.
        </p>

        <form onSubmit={handleSubmit} className="card mt-8 space-y-6 p-6 sm:p-8">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              What are you reporting?
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(["lost", "found"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setType(option)}
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-sm font-semibold transition",
                    type === option
                      ? "border-blue-900 bg-blue-900 text-white shadow-lg shadow-blue-950/20"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-300 hover:bg-blue-50"
                  )}
                >
                  {option === "lost" ? "I lost this item" : "I found this item"}
                </button>
              ))}
            </div>
          </div>

          <TextField
            id="name"
            label="Item name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Black leather wallet"
            required
          />

          <TextAreaField
            id="description"
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Color, brand, distinguishing marks, where and when..."
            rows={5}
            required
          />

          <TextField
            id="contact"
            label="Best contact"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Phone number or email"
            required
          />

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Photo <span className="font-normal text-slate-400">(optional)</span>
            </label>
            {preview ? (
              <div className="relative overflow-hidden rounded-3xl border border-slate-200">
                <Image
                  src={preview}
                  alt="Preview"
                  width={640}
                  height={360}
                  className="h-64 w-full object-cover"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={() => selectFile(null)}
                  className="absolute right-3 top-3 rounded-full bg-slate-900/70 p-2 text-white hover:bg-slate-900"
                  aria-label="Remove image"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center transition hover:border-blue-400 hover:bg-blue-50">
                <ImagePlus className="h-10 w-10 text-slate-400" aria-hidden />
                <p className="mt-3 text-sm font-semibold text-slate-600">Click to choose a photo</p>
                <p className="mt-1 text-xs text-slate-400">PNG or JPG, up to 5MB</p>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => selectFile(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
          </div>

          <Button type="submit" variant="primary" fullWidth size="lg" loading={submitting}>
            {submitting ? (
              "Submitting report..."
            ) : (
              <>
                <Send className="h-4 w-4" aria-hidden />
                Submit report
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
