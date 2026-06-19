"use client";

export default function RegistryPage() {
  const items = [
    {
      id: 1,
      name: "Wallet",
      description: "Black leather wallet",
      contact: "john@example.com",
    },
    {
      id: 2,
      name: "Phone",
      description: "Samsung Galaxy S21",
      contact: "mary@example.com",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">Lost &amp; Found Registry</h1>

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <div key={item.id} className="bg-white p-4 rounded shadow">
            <h2 className="text-xl font-semibold">{item.name}</h2>
            <p className="text-gray-700">{item.description}</p>
            <p className="text-sm text-gray-500">Contact: {item.contact}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
