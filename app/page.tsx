"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  FilePlus2,
  MapPin,
  PackageSearch,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { Button } from "@/app/components/ui/Button";

const features = [
  {
    icon: FilePlus2,
    title: "Report in seconds",
    description:
      "Add a lost or found item with a photo, description, and contact details in a clean, guided form.",
  },
  {
    icon: PackageSearch,
    title: "Smart registry",
    description:
      "Browse and search every reported item on a fast, filterable public registry.",
  },
  {
    icon: CheckCircle2,
    title: "Claim & resolve",
    description:
      "Mark items as resolved or claimed and keep your community informed in real time.",
  },
  {
    icon: Bot,
    title: "Works where you chat",
    description:
      "Report, search, and claim directly from WhatsApp or Telegram with the built-in bots.",
  },
];

const steps = [
  { step: "01", title: "Report", text: "Tell us what you lost or found and add a photo." },
  { step: "02", title: "Browse", text: "Search the registry to find matches in your area." },
  { step: "03", title: "Connect", text: "Claim items and get notified to close the loop." },
];

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    return () => unsubscribe();
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="page-shell py-16 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 flex items-center justify-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-800">
            <Sparkles className="h-4 w-4" aria-hidden />
            A modern lost &amp; found registry
          </div>
          <h1 className="text-balance text-4xl font-black tracking-tight text-slate-900 sm:text-6xl">
            Lost something?{" "}
            <span className="bg-gradient-to-r from-blue-900 to-sky-600 bg-clip-text text-transparent">
              FindIt, fast.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
            Report lost or found items, browse the community registry, and connect with the
            people who can help — from the web, WhatsApp, or Telegram.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            {user ? (
              <>
                <Link href="/dashboard">
                  <Button size="lg" variant="primary">
                    Open dashboard <ArrowRight className="h-4 w-4" aria-hidden />
                  </Button>
                </Link>
                <Link href="/report">
                  <Button size="lg" variant="accent">
                    Report an item
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/signup">
                  <Button size="lg" variant="primary">
                    Get started <ArrowRight className="h-4 w-4" aria-hidden />
                  </Button>
                </Link>
                <Link href="/registry">
                  <Button size="lg" variant="secondary">
                    Browse the registry
                  </Button>
                </Link>
              </>
            )}
          </div>

          <div className="mt-14 grid gap-3 rounded-3xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-600 sm:grid-cols-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" aria-hidden />
              Report &amp; claim only what is yours
            </div>
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-700" aria-hidden />
              WhatsApp + Telegram bots
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-amber-600" aria-hidden />
              Community-powered
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="page-shell py-12">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Everything you need to reunite items
          </h2>
          <p className="mt-3 text-slate-500">
            A clean, fast experience that works on every device and in your messaging apps.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="card p-6 transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-800">
                <Icon className="h-6 w-6" aria-hidden />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="page-shell py-12">
        <div className="rounded-[2rem] bg-gradient-to-br from-blue-950 via-blue-900 to-sky-800 p-8 text-white sm:p-12">
          <h2 className="mx-auto max-w-xl text-center text-3xl font-bold tracking-tight">
            How FindIt works
          </h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {steps.map(({ step, title, text }) => (
              <div key={step} className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <p className="text-sm font-bold text-amber-300">{step}</p>
                <h3 className="mt-2 text-xl font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-sky-100/80">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="page-shell pb-20 pt-12">
        <div className="card flex flex-col items-center justify-between gap-6 p-8 text-center sm:flex-row sm:p-10 sm:text-left">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {user ? "Track your reports from your dashboard" : "Ready to find what's yours?"}
            </h2>
            <p className="mt-2 text-slate-500">
              {user
                ? "Manage your reports, claim statuses, and support tickets in one place."
                : "Create a free account and start reporting lost or found items today."}
            </p>
          </div>
          {user ? (
            <Link href="/dashboard">
              <Button size="lg" variant="primary">
                Go to dashboard <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </Link>
          ) : (
            <Link href="/signup">
              <Button size="lg" variant="accent">
                Create free account <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
