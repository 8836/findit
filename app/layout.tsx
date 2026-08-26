import type { Metadata } from "next";
import Navbar from "./components/Navbar";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: {
    default: "FindIt · Lost & Found Registry",
    template: "%s · FindIt",
  },
  description:
    "A modern lost & found registry. Report lost or found items, browse the registry, track claims, and connect with the community through the web, WhatsApp, or Telegram.",
  keywords: ["lost and found", "findit", "registry", "whatsapp bot", "telegram bot"],
  applicationName: "FindIt",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Navbar />

        <main className="flex-1">{children}</main>

        <footer className="border-t border-slate-200/80 bg-white/70 px-6 py-8">
          <div className="page-shell flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
            <div>
              <p className="text-sm font-semibold text-slate-800">FindIt</p>
              <p className="mt-1 text-xs text-slate-500">
                A community-powered lost &amp; found registry.
              </p>
            </div>
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} FindIt · Lost &amp; Found Registry
            </p>
          </div>
        </footer>

        <Toaster
          position="top-right"
          toastOptions={{
            success: {
              style: { background: "#16a34a", color: "#fff" },
            },
            error: {
              style: { background: "#dc2626", color: "#fff" },
            },
            loading: {
              style: { background: "#1e3a8a", color: "#fff" },
            },
          }}
        />
      </body>
    </html>
  );
}
