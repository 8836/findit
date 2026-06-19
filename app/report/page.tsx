"use client";
import { useState } from "react";

export default function ReportPage() {
  const [item, setItem] = useState("");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ item, description, contact });
    alert("Report submitted!");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded shadow-md w-full max-w-md"
      >
        <h1 className="text-2xl font-bold mb-4">Report Lost Item</h1>

        <input
          type="text"
          placeholder="Item Name"
          value={item}
          onChange={(e) => setItem(e.target.value)}
          className="w-full p-2 mb-3 border rounded"
        />

        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-2 mb-3 border rounded"
        />

        <input
          type="text"
          placeholder="Contact Info"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          className="w-full p-2 mb-3 border rounded"
        />

        <button
          type="submit"
          className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700"
        >
          Submit
        </button>
      </form>
    </div>
  );
}
