'use client';

import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notifySuccess, notifyError, notifyLoading, notifyDismiss } from '@/lib/notify';
import Link from 'next/link';

export default function SupportPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    priority: 'medium',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()) {
      notifyError('Please fill in all fields');
      return;
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      notifyError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    const toastId = notifyLoading('Sending your support ticket...');

    try {
      const supportCollection = collection(db, 'support_tickets');
      await addDoc(supportCollection, {
        name: formData.name.trim(),
        email: formData.email.trim(),
        subject: formData.subject.trim(),
        message: formData.message.trim(),
        priority: formData.priority,
        status: 'open',
        createdAt: serverTimestamp(),
        replies: [],
      });

      notifyDismiss(toastId);
      notifySuccess('Support ticket submitted! We\'ll get back to you soon.');
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
        priority: 'medium',
      });
    } catch (error) {
      console.error('Error submitting support ticket:', error);
      notifyDismiss(toastId);
      notifyError('Failed to submit support ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-purple-900 p-6 pt-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Support Center</h1>
          <p className="text-sky-100 font-medium">
            Have a question or issue? We&apos;re here to help. Submit a support ticket and we&apos;ll get back to you as soon as possible.
          </p>
        </div>

        {/* Support Info Cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="rounded-4xl bg-white/10 backdrop-blur-md p-6 border border-white/20">
            <h3 className="text-lg font-bold text-white mb-2">Email Support</h3>
            <p className="text-white/70 text-sm">
              Email us directly at <a href="mailto:support@findit.local" className="text-yellow-300 hover:text-yellow-100 font-bold">support@findit.local</a>
            </p>
          </div>
          <div className="rounded-4xl bg-white/10 backdrop-blur-md p-6 border border-white/20">
            <h3 className="text-lg font-bold text-white mb-2">Response Time</h3>
            <p className="text-white/70 text-sm">
              We typically respond within 24-48 hours during business days.
            </p>
          </div>
        </div>

        {/* Support Form */}
        <div className="rounded-4xl bg-white/10 backdrop-blur-md p-8 border border-white/20">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-xs uppercase tracking-[0.24em] text-sky-200 font-medium mb-3">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                className="w-full rounded-2xl border border-white/30 bg-white/5 px-5 py-3 text-white placeholder-white/70 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 transition"
              />
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs uppercase tracking-[0.24em] text-sky-200 font-medium mb-3">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                className="w-full rounded-2xl border border-white/30 bg-white/5 px-5 py-3 text-white placeholder-white/70 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 transition"
              />
            </div>

            {/* Subject Field */}
            <div>
              <label htmlFor="subject" className="block text-xs uppercase tracking-[0.24em] text-sky-200 font-medium mb-3">
                Subject
              </label>
              <input
                id="subject"
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                placeholder="Brief description of your issue"
                className="w-full rounded-2xl border border-white/30 bg-white/5 px-5 py-3 text-white placeholder-white/70 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 transition"
              />
            </div>

            {/* Priority Field */}
            <div>
              <label htmlFor="priority" className="block text-xs uppercase tracking-[0.24em] text-sky-200 font-medium mb-3">
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full rounded-2xl border border-white/30 bg-white/5 px-5 py-3 text-white focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 transition"
              >
                <option value="low" className="bg-blue-950">Low - General inquiry</option>
                <option value="medium" className="bg-blue-950">Medium - Issue affecting me</option>
                <option value="high" className="bg-blue-950">High - Urgent issue</option>
              </select>
            </div>

            {/* Message Field */}
            <div>
              <label htmlFor="message" className="block text-xs uppercase tracking-[0.24em] text-sky-200 font-medium mb-3">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Please describe your issue or question in detail..."
                rows={6}
                className="w-full rounded-2xl border border-white/30 bg-white/5 px-5 py-3 text-white placeholder-white/70 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 transition resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-300/50 px-6 py-3 text-sm font-bold text-blue-950 shadow-lg shadow-yellow-400/30 transition disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Support Ticket'}
            </button>
          </form>
        </div>

        {/* FAQ Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <details className="rounded-4xl bg-white/10 backdrop-blur-md p-6 border border-white/20 cursor-pointer hover:bg-white/15 transition">
              <summary className="font-bold text-white flex items-center justify-between">
                <span>How do I report a lost item?</span>
                <span className="text-yellow-300">+</span>
              </summary>
              <p className="mt-3 text-white/70">
                Click on the &quot;Report&quot; button in the navigation menu and fill out the form with details about your lost item, including a photo if possible. We&apos;ll add it to our registry immediately.
              </p>
            </details>

            <details className="rounded-4xl bg-white/10 backdrop-blur-md p-6 border border-white/20 cursor-pointer hover:bg-white/15 transition">
              <summary className="font-bold text-white flex items-center justify-between">
                <span>How do I claim a found item?</span>
                <span className="text-yellow-300">+</span>
              </summary>
              <p className="mt-3 text-white/70">
                Go to the Dashboard, find the item you&apos;re looking for, and click the &quot;Claim Item&quot; button. The original reporter will be notified and can contact you directly.
              </p>
            </details>

            <details className="rounded-4xl bg-white/10 backdrop-blur-md p-6 border border-white/20 cursor-pointer hover:bg-white/15 transition">
              <summary className="font-bold text-white flex items-center justify-between">
                <span>Can I use FindIt on WhatsApp or Telegram?</span>
                <span className="text-yellow-300">+</span>
              </summary>
              <p className="mt-3 text-white/70">
                Yes! We offer WhatsApp and Telegram bots that mirror all the functionality of the web app. You can report items, search the registry, and claim items directly from your messaging app.
              </p>
            </details>

            <details className="rounded-4xl bg-white/10 backdrop-blur-md p-6 border border-white/20 cursor-pointer hover:bg-white/15 transition">
              <summary className="font-bold text-white flex items-center justify-between">
                <span>How long does it take to get a response?</span>
                <span className="text-yellow-300">+</span>
              </summary>
              <p className="mt-3 text-white/70">
                Support tickets are typically reviewed within 24-48 hours during business days. Urgent issues may be prioritized for faster response.
              </p>
            </details>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <Link href="/" className="text-cyan-300 hover:text-cyan-100 font-bold">
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
