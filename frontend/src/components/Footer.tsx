// src/components/Footer.tsx
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950">
      <div className="container-max flex flex-col gap-3 py-6 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Compayre. All rights reserved.</p>
        <div className="flex flex-wrap gap-4">
          <Link href="/about" className="hover:text-slate-200">
            About
          </Link>
          <Link href="/contact" className="hover:text-slate-200">
            Contact
          </Link>
          <Link href="/privacy" className="hover:text-slate-200">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-slate-200">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}
