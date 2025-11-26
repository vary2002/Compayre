// src/app/page.tsx
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-slate-800">
          <div className="container-max flex flex-col items-center gap-10 py-14 md:flex-row md:items-start md:justify-between md:py-20">
            {/* Left column */}
            <div className="max-w-xl space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Built for investors, boards & stewardship teams
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl md:text-5xl">
                See if{" "}
                <span className="text-brand-400">
                  executive pay
                </span>{" "}
                is aligned with performance — in seconds.
              </h1>

              <p className="text-sm leading-relaxed text-slate-300 sm:text-base">
                Compayre brings together financials, peer groups and
                transparency metrics into one clean view. Spot outliers,
                challenge proposals, and back your decisions with data rather
                than gut feel.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/signup"
                  className="rounded-full bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-soft hover:bg-brand-600"
                >
                  Get started – it’s free to explore
                </Link>
                <Link
                  href="/contact"
                  className="rounded-full border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm text-slate-100 hover:bg-slate-800"
                >
                  Book a walkthrough
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <span>Instant peer comparisons</span>
                <span className="h-1 w-1 rounded-full bg-slate-600" />
                <span>Board-ready visuals</span>
                <span className="h-1 w-1 rounded-full bg-slate-600" />
                <span>Works on any device</span>
              </div>
            </div>

            {/* Right column – mock analytics card */}
            <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-soft">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Peer snapshot
                  </p>
                  <p className="text-sm font-medium text-slate-50">
                    Nifty 500 – CEO pay vs PAT
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-medium text-emerald-300">
                  Live demo
                </span>
              </div>

              {/* Fake chart bars */}
              <div className="mt-3 grid grid-cols-6 items-end gap-1.5 rounded-xl bg-slate-950/80 p-3">
                {[35, 60, 80, 45, 70, 55].map((h, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-full bg-brand-500/80"
                      style={{ height: `${h}px` }}
                    />
                    <span className="text-[10px] text-slate-500">
                      {i === 2 ? "You" : `P${i + 1}`}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-2 space-y-1 text-xs text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Companies above peer median</span>
                  <span className="font-medium text-emerald-300">14</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Flagged for high pay vs returns</span>
                  <span className="font-medium text-amber-300">6</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Average transparency score</span>
                  <span className="font-medium text-sky-300">7.8 / 10</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-b border-slate-800 bg-slate-950">
          <div className="container-max py-12 sm:py-16">
            <div className="mb-8 max-w-2xl">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
                Everything you need to question pay packages confidently.
              </h2>
              <p className="mt-3 text-sm text-slate-300 sm:text-base">
                Compayre sits between the annual report and the board meeting,
                turning dense remuneration disclosures into clean, comparable
                analytics.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="mb-3 h-8 w-8 rounded-xl bg-brand-500/20" />
                <h3 className="text-sm font-semibold text-slate-50">
                  Peer-aligned pay snapshots
                </h3>
                <p className="mt-2 text-xs text-slate-300 sm:text-sm">
                  Compare CEO and board compensation against sector and size
                  peers instantly, with clear outlier flags and ratios.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="mb-3 h-8 w-8 rounded-xl bg-emerald-500/15" />
                <h3 className="text-sm font-semibold text-slate-50">
                  Linked to company performance
                </h3>
                <p className="mt-2 text-xs text-slate-300 sm:text-sm">
                  See how pay has moved relative to PAT, ROE and market
                  capitalization over time to assess true alignment.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="mb-3 h-8 w-8 rounded-xl bg-amber-500/15" />
                <h3 className="text-sm font-semibold text-slate-50">
                  Transparency & structure insights
                </h3>
                <p className="mt-2 text-xs text-slate-300 sm:text-sm">
                  Track disclosure quality, pay mix and vesting structures so
                  you can engage issuers on both level and design.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="bg-slate-950">
          <div className="container-max py-12 sm:py-16">
            <div className="mb-8 max-w-2xl">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
                From PDF to board-ready insight in three steps.
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  step: "1",
                  title: "Choose a company",
                  text: "Start from a listed company or your own portfolio. We pull in the latest financials and pay data.",
                },
                {
                  step: "2",
                  title: "Review the pay vs performance view",
                  text: "See trends for total pay, PAT and market value, along with peer benchmarks and red flags.",
                },
                {
                  step: "3",
                  title: "Export & share",
                  text: "Download visuals or share a live link with your team, stewardship committee or clients.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="relative rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
                >
                  <div className="mb-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-500/20 text-xs font-semibold text-brand-300">
                    {item.step}
                  </div>
                  <h3 className="text-sm font-semibold text-slate-50">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs text-slate-300 sm:text-sm">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1 text-xs text-slate-300 sm:text-sm">
                <p>No integration needed – start with public data.</p>
                <p>Upgrade later for custom universes & private portfolios.</p>
              </div>
              <Link
                href="/signup"
                className="rounded-full bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-soft hover:bg-brand-600"
              >
                Start exploring Compayre
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
