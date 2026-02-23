// src/components/Footer.tsx
import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-[#181818] text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:flex-row md:items-start md:justify-between">
        {/* Left: 3 columns */}
        <div className="grid flex-1 gap-8 sm:grid-cols-3">
          {/* COMPANY */}
          <div>
            <h3 className="mb-3 text-[11px] font-semibold tracking-[0.18em] text-white">
              COMPANY
            </h3>
            <ul className="space-y-1.5 text-[11px] tracking-wide text-[#f5f5f5]">
              <li>
                <Link href="/about" className="hover:text-white">
                  ABOUT IIAS
                </Link>
              </li>
            </ul>
          </div>

          {/* PRODUCTS */}
          <div>
            <h3 className="mb-3 text-[11px] font-semibold tracking-[0.18em] text-white">
              PRODUCTS
            </h3>
            <ul className="space-y-1.5 text-[11px] tracking-wide text-[#f5f5f5]">
              <li>
                <Link href="#" className="hover:text-white">
                  VOTING ADVISORY
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white">
                  ADRIAN
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white">
                  GOVERNANCE SCORECARD
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white">
                  COMPAYRE
                </Link>
              </li>
            </ul>
          </div>

          {/* COMMUNITY */}
          <div>
            <h3 className="mb-3 text-[11px] font-semibold tracking-[0.18em] text-white">
              COMMUNITY
            </h3>
            <ul className="space-y-1.5 text-[11px] tracking-wide text-[#f5f5f5]">
              <li>
                <Link href="#" className="hover:text-white">
                  BLOG (INSTITUTIONAL EYE)
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white">
                  DATA SCIENCES
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Right: socials + url + copyright */}
        <div className="flex flex-col items-start gap-3 text-right text-[11px] text-[#f5f5f5] md:items-end">
          {/* Social icons */}
          <div className="flex gap-2">
            <a
              href="https://twitter.com"
              aria-label="Twitter"
              className="flex h-7 w-7 items-center justify-center rounded-[2px] bg-[#1da1f2] text-[11px] font-semibold uppercase text-white"
            >
              t
            </a>
            <a
              href="https://www.linkedin.com"
              aria-label="LinkedIn"
              className="flex h-7 w-7 items-center justify-center rounded-[2px] bg-[#0077b5] text-[11px] font-semibold text-white"
            >
              in
            </a>
          </div>

          <div className="mt-1 text-[11px] leading-snug text-[#f5f5f5] md:text-right">
            <p>www.iias.in</p>
          </div>

          <div className="mt-1 max-w-[200px] text-[10px] leading-snug text-[#cccccc] md:text-right">
            <p>© 2017 by Institutional Investor</p>
            <p>Advisory Services (India) Limited</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
