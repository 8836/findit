import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-4xl font-bold mb-6">Welcome to FindIt</h1>

      {/* Logo with aspect ratio preserved */}
      <Image
        src="/vercel.svg"
        alt="Vercel Logo"
        width={200}
        height={40}
        className="h-auto"
      />

      {/* Navigation buttons */}
      <div className="space-x-4 mt-6">
        <Link href="/report" className="px-4 py-2 bg-green-600 text-white rounded">
          Report Item
        </Link>
        <Link href="/registry" className="px-4 py-2 bg-blue-600 text-white rounded">
          View Registry
        </Link>
      </div>
    </main>
  );
}
