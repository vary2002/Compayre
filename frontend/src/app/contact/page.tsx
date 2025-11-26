// src/app/contact/page.tsx
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <Navbar />
      <main className="container-max flex-1 py-12">
        <h1 className="text-2xl font-semibold text-slate-50 sm:text-3xl">
          Contact
        </h1>
        <p className="mt-3 max-w-xl text-sm text-slate-300 sm:text-base">
          Interested in using Compayre for your stewardship team, fund or
          advisory practice? Share a few details and we’ll get back with a short
          demo slot.
        </p>

        <form className="mt-8 max-w-xl space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300">
              Name
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none focus:border-brand-500"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300">
              Email
            </label>
            <input
              type="email"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none focus:border-brand-500"
              placeholder="you@firm.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300">
              Organisation
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none focus:border-brand-500"
              placeholder="Institution / fund / advisory"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300">
              Message
            </label>
            <textarea
              rows={4}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none focus:border-brand-500"
              placeholder="Tell us how you’d like to use Compayre."
            />
          </div>
          <button
            type="submit"
            className="rounded-full bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
          >
            Send message
          </button>
        </form>
      </main>
      <Footer />
    </div>
  );
}
