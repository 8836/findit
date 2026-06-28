"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  notifySuccess,
  notifyError,
  notifyLoading,
} from "../../lib/notify"; // ✅ use centralized notify

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      notifyError("You must be logged in to report an item.");
      return;
    }

    // ✅ Show loading toast
    const toastId = notifyLoading("Submitting item...");

    try {
      let imageUrl = "";
      if (file) {
        const storage = getStorage();
        const storageRef = ref(storage, `items/${user.uid}/${file.name}`);
        await uploadBytes(storageRef, file);
        imageUrl = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, "items"), {
        uid: user.uid,
        name,
        description,
        contact,
        imageUrl,
        createdAt: serverTimestamp(),
        claimed: false, // ✅ new field added
      });

      // ✅ Update toast to success
      notifySuccess("Item reported successfully!", toastId);

      // Reset form
      setName("");
      setDescription("");
      setContact("");
      setFile(null);
      setPreview(null);
    } catch (err) {
      console.error(err);
      // ✅ Update toast to error
      notifyError("Error reporting item. Please try again.", toastId);
    }
  };

  if (!user) {
    return (
      <p className="p-6 text-red-600 font-semibold">
        Please log in to report an item.
      </p>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-3xl font-bold text-blue-800 mb-6">Report a Lost Item</h1>
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg shadow-md max-w-lg space-y-4 hover:shadow-lg transition"
      >
        <div>
          <label htmlFor="item-name" className="block font-semibold text-blue-800 mb-1">
            Item Name
          </label>
          <input
            id="item-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Item name"
            title="Item name"
            className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-600"
            required
          />
        </div>

        <div>
          <label htmlFor="item-description" className="block font-semibold text-blue-800 mb-1">
            Description
          </label>
          <textarea
            id="item-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            title="Description"
            className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-600"
            rows={3}
            required
          />
        </div>

        <div>
          <label htmlFor="item-contact" className="block font-semibold text-blue-800 mb-1">
            Contact Info
          </label>
          <input
            id="item-contact"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Contact info"
            title="Contact info"
            className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-600"
            required
          />
        </div>

        <div>
          <label htmlFor="item-image" className="block font-semibold text-blue-800 mb-1">
            Upload Image (optional)
          </label>
          <input
            id="item-image"
            type="file"
            accept="image/*"
            title="Upload an image of the item"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setFile(file);
              if (file) {
                setPreview(URL.createObjectURL(file));
              } else {
                setPreview(null);
              }
            }}
            className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-600"
          />
          {preview && (
            <Image
              src={preview}
              alt="Preview"
              width={640}
              height={320}
              className="mt-2 w-full h-48 object-cover rounded border border-gray-200"
              unoptimized
            />
          )}
        </div>

        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-full"
        >
          Submit
        </button>
      </form>
    </div>
  );
}
