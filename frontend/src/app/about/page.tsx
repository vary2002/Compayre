// src/app/about/page.tsx
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <Navbar />
      <main className="container-max flex-1 py-12">
        <h1 className="text-2xl font-semibold text-slate-50 sm:text-3xl">
          About Compayre
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
          Compayre is built for investors, proxy advisors and boards who need a
          clear, data-backed view of executive remuneration. Instead of
          manually stitching together numbers from annual reports, we give you a
          structured, comparable view in a few clicks.
        </p>

        <p className="mt-4 max-w-2xl text-sm text-slate-300 sm:text-base">
          The product roadmap includes company deep dives, director-level
          histories, peer comparisons and portfolio-wide dashboards, delivered
          in small, shippable iterations so you see value from day one.
        </p>
      </main>
      <Footer />
    </div>
  );
}
