"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import { Clock3, LifeBuoy, Mail } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { notifyDismiss, notifyError, notifyLoading, notifySuccess } from "@/lib/notify";
import { Button } from "@/app/components/ui/Button";
import { SelectField, TextAreaField, TextField } from "@/app/components/ui/Field";

const initialForm = {
  name: "",
  email: "",
  subject: "",
  message: "",
  priority: "medium",
};

export default function SupportPage() {
  const [formData, setFormData] = useState(initialForm);
  const [user, setUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setFormData((prev) => ({
          ...prev,
          name: prev.name || currentUser.displayName || "",
          email: prev.email || currentUser.email || "",
        }));
      }
    });
    return () => unsubscribe();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()) {
      notifyError("Please complete every field.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      notifyError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    const toastId = notifyLoading("Sending your support ticket...");

    try {
      await addDoc(collection(db, "support_tickets"), {
        name: formData.name.trim(),
        email: formData.email.trim(),
        subject: formData.subject.trim(),
        message: formData.message.trim(),
        priority: formData.priority,
        status: "open",
        source: "web",
        userId: user?.uid ?? null,
        createdAt: serverTimestamp(),
        replies: [],
      });

      notifyDismiss(toastId);
      notifySuccess("Support ticket submitted. We'll get back to you soon.");
      setFormData(initialForm);
    } catch (error) {
      console.error("Error submitting support ticket:", error);
      notifyDismiss(toastId);
      notifyError("Could not submit your ticket. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-shell py-10">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-blue-700">Support</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            How can we help?
          </h1>
          <p className="mt-3 text-slate-500">
            Questions, issues, or feedback — submit a ticket and our team will follow up.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="card flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-800">
              <Mail className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Email support</p>
              <a href="mailto:support@findit.app" className="text-sm text-blue-700 hover:underline">
                support@findit.app
              </a>
            </div>
          </div>
          <div className="card flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <Clock3 className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Response time</p>
              <p className="text-sm text-slate-500">Usually within 24–48 hours.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card mt-6 space-y-6 p-6 sm:p-8">
          <div className="grid gap-6 sm:grid-cols-2">
            <TextField
              id="name"
              label="Full name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Jane Doe"
              required
            />
            <TextField
              id="email"
              label="Email address"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@email.com"
              required
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-[2fr_1fr]">
            <TextField
              id="subject"
              label="Subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="What is this about?"
              required
            />
            <SelectField
              id="priority"
              label="Priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </SelectField>
          </div>

          <TextAreaField
            id="message"
            label="Message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder="Please describe your issue or question..."
            rows={6}
            required
          />

          <Button type="submit" variant="primary" fullWidth size="lg" loading={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit support ticket"}
          </Button>
        </form>

        <div className="mt-12">
          <h2 className="text-center text-2xl font-bold text-slate-900">Frequently asked questions</h2>
          <div className="mt-6 space-y-4">
            {[
              {
                q: "How do I report a lost item?",
                a: "Go to the Report page, choose “I lost this item,” fill in the details, and include a photo if possible. It appears on the registry immediately.",
              },
              {
                q: "How do I claim a found item?",
                a: "Open the item on the registry or dashboard, then use the claim action. We update the status and connect you with the reporter promptly.",
              },
              {
                q: "Can I use FindIt on WhatsApp or Telegram?",
                a: "Yes. Our bots support reporting, searching, claiming, and support tickets through WhatsApp and Telegram.",
              },
              {
                q: "How long does it take to get a response?",
                a: "Support tickets are typically reviewed within 24–48 hours during business days. Urgent issues may be prioritized.",
              },
            ].map(({ q, a }) => (
              <details key={q} className="card group cursor-pointer p-5 open:shadow-lg">
                <summary className="flex items-center justify-between font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                  {q}
                  <LifeBuoy className="h-4 w-4 text-slate-400 transition group-open:rotate-90" aria-hidden />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">{a}</p>
              </details>
            ))}
          </div>
        </div>

        <p className="mt-10 text-center text-sm">
          <Link href="/" className="font-semibold text-blue-800 hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
