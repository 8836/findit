import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "./components/Navbar"; // ✅ use Navbar instead of Header
import "./globals.css";
import { Toaster } from "react-hot-toast"; // ✅ import toast provider

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FindIt",
  description: "Lost & Found Registry",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        {/* ✅ Global Navbar */}
        <Navbar />

        {/* ✅ Page Content */}
        <main className="flex-1">{children}</main>

        {/* ✅ Footer */}
        <footer className="bg-gray-100 text-center p-4 text-sm text-gray-600">
          © {new Date().getFullYear()} FindIt — Lost & Found Registry
        </footer>

        {/* ✅ Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            success: {
              style: {
                background: "#16a34a", // brand green
                color: "#fff",
              },
            },
            error: {
              style: {
                background: "#dc2626", // brand red
                color: "#fff",
              },
            },
            loading: {
              style: {
                background: "#1e3a8a", // brand blue
                color: "#fff",
              },
            },
          }}
        />
      </body>
    </html>
  );
}
