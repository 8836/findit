"use client";
import { useEffect, useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db, auth } from "../../lib/firebase"; // ✅ import auth
import { onAuthStateChanged, User } from "firebase/auth";

export default function ReportPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [user, setUser] = useState<User | null>(null);

  // ✅ Track logged-in user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      alert("You must be logged in to report an item.");
      return;
    }

    await addDoc(collection(db, "items"), {
      name,
      description,
      contact,
      uid: user.uid,        // ✅ link item to user
      createdAt: new Date(),
    });

    setName("");
    setDescription("");
    setContact("");
    alert("Item reported successfully!");
  };

  if (!user) {
    return <p className="p-6">Please log in to report an item.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <h1 className="text-2xl font-bold mb-4">Report Lost Item</h1>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Item name"
        className="border p-2 mb-2 w-full"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        className="border p-2 mb-2 w-full"
      />
      <input
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        placeholder="Contact info"
        className="border p-2 mb-2 w-full"
      />
      <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">
        Submit
      </button>
    </form>
  );
}
