"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { notifySuccess, notifyError, notifyLoading } from "../../lib/notify";

export default function ReportPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

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
      notifyError("You must be logged in to report an item.");
      return;
    }

    const toastId = notifyLoading("Submitting item...");

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
          if (data.url) {
            imageUrl = data.url;
          }
        } catch (uploadErr) {
          console.error("Cloudinary upload failed:", uploadErr);
          notifyError("Image upload failed, but item was saved.", toastId);
        }
      }

      await addDoc(collection(db, "items"), {
        uid: user.uid,
        name,
        description,
        contact,
        imageUrl,
        createdAt: serverTimestamp(),
        claimed: false,
      });

      notifySuccess("Item reported successfully!", toastId);

      setName("");
      setDescription("");
      setContact("");
      setFile(null);
      setPreview(null);
    } catch (err) {
      console.error("Report submission failed:", err);
      notifyError("Error reporting item. Please try again.", toastId);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-purple-900 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-sky-100 font-medium text-lg">Please log in to report an item.</p>
          <a
            href="/login"
            className="mt-4 inline-block rounded-full bg-yellow-400 hover:bg-yellow-300 px-8 py-3 font-bold text-blue-950"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-purple-900 p-6">
      <div className="max-w-lg mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 tracking-tight">Report a Lost Item</h1>

        <form
          onSubmit={handleSubmit}
          className="bg-white/10 backdrop-blur-md rounded-4xl shadow-2xl shadow-black/40 p-8 space-y-6 border border-white/20"
        >
          <div>
            <label htmlFor="item-name" className="block text-sm font-semibold text-white mb-3 uppercase tracking-[0.1em]">
              Item Name
            </label>
            <input
              id="item-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What item are you reporting?"
              className="w-full rounded-2xl border border-white/30 bg-white/5 px-5 py-3 text-white placeholder-white/70 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 transition"
              required
            />
          </div>

          <div>
            <label htmlFor="item-description" className="block text-sm font-semibold text-white mb-3 uppercase tracking-[0.1em]">
              Description
            </label>
            <textarea
              id="item-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the item in detail..."
              className="w-full rounded-2xl border border-white/30 bg-white/5 px-5 py-3 text-white placeholder-white/70 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 transition"
              rows={4}
              required
            />
          </div>

          <div>
            <label htmlFor="item-contact" className="block text-sm font-semibold text-white mb-3 uppercase tracking-[0.1em]">
              Contact Info
            </label>
            <input
              id="item-contact"
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Phone or email"
              className="w-full rounded-2xl border border-white/30 bg-white/5 px-5 py-3 text-white placeholder-white/70 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 transition"
              required
            />
          </div>

          <div>
            <label htmlFor="item-image" className="block text-sm font-semibold text-white mb-3 uppercase tracking-[0.1em]">
              Upload Image (optional)
            </label>
            <input
              id="item-image"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setFile(file);
                if (file) {
                  setPreview(URL.createObjectURL(file));
                } else {
                  setPreview(null);
                }
              }}
              className="w-full rounded-2xl border border-white/20 bg-white/5 px-5 py-3 text-white file:text-blue-950 file:bg-yellow-400 file:border-0 file:rounded-full file:px-4 file:py-2 file:cursor-pointer file:font-semibold hover:file:bg-yellow-300 transition"
            />
            {preview && (
              <div className="mt-4 rounded-2xl overflow-hidden border border-white/20">
                <Image
                  src={preview}
                  alt="Preview"
                  width={640}
                  height={320}
                  className="w-full h-48 object-cover"
                  unoptimized
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-yellow-400 hover:bg-yellow-300 px-6 py-3 text-sm font-bold text-blue-950 shadow-lg shadow-yellow-400/30 transition"
          >
            Submit Report
          </button>
        </form>
      </div>
    </div>
  );
}
