// src/app/page.tsx
import Link from "next/link";
import Image from 'next/image'
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section>
          {/* Gradient section for hero content and laptop */}
          <div className="  bg-gradient-to-b from-gray-900 via-gray-900 via-50% to-white">
            <div className="container-max">
              {/* Centered hero content */}
              <div className="text-center pt-12 pb-8">
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl font-play">
                  COMPENSATION ANALYTICS
                </h1>
                <p className="mt-4 text-base text-gray-300 sm:text-lg">
                  Search and analyse compensation data for 1250+ directors.
                </p>

                <div className="mt-8 flex flex-wrap justify-center gap-4">
                  <Link 
                    href="/demo" 
                    className="rounded bg-cyan-500 px-6 py-3 text-sm font-medium text-white hover:bg-cyan-600 transition-colors"
                  >
                    TRY IT NOW
                  </Link>
                  <Link
                    href="/contact"
                    className="rounded bg-cyan-500 px-6 py-3 text-sm font-medium text-white hover:bg-cyan-600 transition-colors"
                  >
                    GET IN TOUCH
                  </Link>
                </div>
              </div>

              {/* Laptop mockup */}
              {/* Laptop mockup with GIF overlay */}
              <div className="flex justify-center px-4 pb-0">
                <div className="relative w-full max-w-4xl">
                  {/* Base laptop image */}
                  <Image
                    src="/assets/iias/hero.png"  // your GIF path
                    alt="Laptop Frame"
                    className="w-full h-auto"
                    width={1200}
                    height={700}
                    priority
                  />

                  {/* GIF overlay positioned to match screen */}
                  <div className="absolute top-[6%] left-[12.2%] w-[75.8%] h-[80%] overflow-hidden rounded-md shadow-lg">
                    <Image
                      src="/assets/iias/hero-gif.gif"  // your GIF path
                      alt="GIF Demo"
                      className=" object-cover"
                      width={800}
                      height={500}
                      unoptimized
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Feature icons grid - on white background */}
          <div className="bg-white">
            <div className="container-max pt-16 pb-16">
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto px-4">
                {/* Feature 1 */}
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-cyan-500">
                    <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      Remuneration data for 500+ companies and 1300+ executive directors across five years
                    </p>
                  </div>
                </div>

                {/* Feature 2 */}
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-orange-500">
                    <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      Identify and select executive directors based on different pay grades
                    </p>
                  </div>
                </div>

                {/* Feature 3 */}
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-cyan-600">
                    <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      Benchmark executive data to relevant peer-set and compare individual pay metrics
                    </p>
                  </div>
                </div>

                {/* Feature 4 */}
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-cyan-500">
                    <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      Establish linkages between executive pay and performance
                    </p>
                  </div>
                </div>

                {/* Feature 5 */}
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-orange-500">
                    <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      Check if the proposed pay for an executive director is in line with identified pay scales
                    </p>
                  </div>
                </div>

                {/* Feature 6 */}
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-500">
                    <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      Compute transparency score for pay proposals of companies
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>



        {/* Features */}
        <section className="bg-white">
          {/* First Row - Cyan Background */}
          <div className="grid lg:grid-cols-2 gap-0 min-h-screen">
            {/* Left - Desktop Image */}
            <div className="bg-cyan-500 flex items-center justify-center p-12 lg:p-16">
              <div className="relative w-full max-w-3xl">
              <div className="flex justify-center  pb-0">
                <div className="relative w-full max-w-4xl">
                  {/* Base laptop image */}
                  <Image
                    src="/assets/iias/monitor-image.avif"
                    alt="Compensation Analytics Dashboard"
                    className="w-full h-auto"
                    width={1200}
                    height={700}
                    priority
                  />

                  {/* GIF overlay positioned to match screen */}
                  <div className="absolute top-[5.5%] left-[7.5%] w-[84.7%] h-[59%] overflow-hidden rounded-md shadow-lg">
                    <Image
                      src="/assets/iias/feature-1.avif"  // your GIF path
                      alt="feature 1 Demo"
                      className=" object-cover"
                      width={1000}
                      height={600}
                      unoptimized
                    />
                  </div>
                </div>
              </div>
              </div>
            </div>

            {/* Right - Feature List */}
            <div className="bg-cyan-500 flex items-center p-12 lg:p-16">
              <div className="space-y-8 max-w-xl">
                <ul className="space-y-4 text-white leading-relaxed">
                  <li className="text-2xl sm:text-3xl">Intuitive user interface</li>
                  <li className="text-2xl sm:text-3xl">Cloud based accessibility</li>
                  <li className="text-2xl sm:text-3xl">Pay mix information</li>
                  <li className="text-2xl sm:text-3xl">Historical pay trends</li>
                  <li className="text-2xl sm:text-3xl">Stock options data</li>
                  <li className="text-2xl sm:text-3xl">Pay benchmarks</li>
                </ul>
                <div className="pt-8">
                  <Link 
                    href="/demo" 
                    className="inline-block rounded bg-blue-900 px-8 py-4 text-base font-medium text-white hover:bg-blue-800 transition-colors"
                  >
                    TRY IT NOW
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Second Row - White Background */}
          <div className="grid lg:grid-cols-2 gap-0 min-h-screen">
            {/* Left - Feature List */}
            <div className="bg-white flex items-center p-12 lg:p-16 order-2 lg:order-1">
              <div className="space-y-8 max-w-xl">
                <ul className="space-y-4 text-gray-700 leading-relaxed">
                  <li className="text-2xl sm:text-3xl">Select peers based on relevant filters</li>
                  <li className="text-2xl sm:text-3xl">Benchmark against peer set</li>
                  <li className="text-2xl sm:text-3xl">Identify growth trends</li>
                  <li className="text-2xl sm:text-3xl">Check pay alignment with performance</li>
                </ul>
                <div className="pt-8">
                  <Link 
                    href="/demo" 
                    className="inline-block rounded bg-blue-900 px-8 py-4 text-base font-medium text-white hover:bg-blue-800 transition-colors"
                  >
                    TRY IT NOW
                  </Link>
                </div>
              </div>
            </div>

            {/* Right - Desktop Image */}
            <div className="bg-white flex items-center justify-center p-12 lg:p-16 order-1 lg:order-2">
              <div className="relative w-full max-w-3xl">
              <div className="flex justify-center  pb-0">
                <div className="relative w-full max-w-4xl">
                  {/* Base laptop image */}
                  <Image
                    src="/assets/iias/monitor-image.avif"
                    alt="Compensation Analytics Dashboard"
                    className="w-full h-auto"
                    width={1200}
                    height={700}
                    priority
                  />

                  {/* GIF overlay positioned to match screen */}
                  <div className="absolute top-[5.5%] left-[7.5%] w-[84.7%] h-[59%] overflow-hidden rounded-md shadow-lg">
                    <Image
                      src="/assets/iias/feature-2.avif"  // your GIF path
                      alt="feature 2 Demo"
                      className=" object-cover"
                      width={1000}
                      height={600}
                      unoptimized
                    />
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>
        </section>


        {/* Pricing & Plans */}
        <section className="bg-gray-100 py-12 sm:py-16">
          <div className="container-max">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-gray-700 sm:text-4xl">
                PRICING PLANS
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3 max-w-6xl mx-auto">
              {/* Personal Plan */}
              <div className="bg-white rounded-lg overflow-hidden shadow-lg">
                <div className="bg-teal-400 text-white text-center py-3">
                  <div className="text-sm font-medium">Personal</div>
                </div>
                <div className="bg-teal-400 text-white text-center py-8">
                  <div className="text-6xl font-bold">Free</div>
                </div>
                <div className="p-6 space-y-4 min-h-[300px]">
                  <div className="text-gray-600 text-sm">Market trends</div>
                  <div className="text-gray-600 text-sm">Company pay data</div>
                  <div className="h-32"></div>
                </div>
                <div className="bg-teal-400 text-white text-center py-3">
                  <div className="text-xs font-medium">Suitable For Academicians/Researchers</div>
                </div>
                <div className="p-6 text-center">
                  <Link 
                    href="/demo" 
                    className="inline-block bg-blue-900 text-white px-8 py-2.5 rounded text-sm font-medium hover:bg-blue-800 transition-colors"
                  >
                    GO TO WEBSITE
                  </Link>
                </div>
              </div>

              {/* Basic Plan */}
              <div className="bg-white rounded-lg overflow-hidden shadow-lg">
                <div className="bg-cyan-400 text-white text-center py-3">
                  <div className="text-sm font-medium">Basic</div>
                </div>
                <div className="bg-cyan-400 text-white text-center py-8">
                  <div className="flex items-start justify-center">
                    <span className="text-2xl font-bold mt-2">₹</span>
                    <span className="text-6xl font-bold">100k</span>
                    <span className="text-sm mt-8 ml-1">/yr</span>
                  </div>
                </div>
                <div className="p-6 space-y-4 min-h-[300px]">
                  <div className="text-gray-600 text-sm">Market trends</div>
                  <div className="text-gray-600 text-sm">Company pay data</div>
                  <div className="text-gray-600 text-sm">Executive director pay data</div>
                  <div className="text-gray-600 text-sm">Compare salaries</div>
                  <div className="h-16"></div>
                </div>
                <div className="bg-cyan-400 text-white text-center py-3">
                  <div className="text-xs font-medium">For Voting Advisory Subscribers</div>
                </div>
                <div className="p-6 text-center">
                  <button type="button" aria-label="View pricing details" title="View pricing details" className="text-gray-400">
                    <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Advanced Plan */}
              <div className="bg-white rounded-lg overflow-hidden shadow-lg">
                <div className="bg-red-400 text-white text-center py-3">
                  <div className="text-sm font-medium">Advanced</div>
                </div>
                <div className="bg-red-400 text-white text-center py-8">
                  <div className="flex items-start justify-center">
                    <span className="text-2xl font-bold mt-2">₹</span>
                    <span className="text-6xl font-bold">300k</span>
                    <span className="text-sm mt-8 ml-1">/yr</span>
                  </div>
                </div>
                <div className="p-6 space-y-4 min-h-[300px]">
                  <div className="text-gray-600 text-sm">Market trends</div>
                  <div className="text-gray-600 text-sm">Company pay data</div>
                  <div className="text-gray-600 text-sm">Executive director pay data</div>
                  <div className="text-gray-600 text-sm">Compare salaries</div>
                  <div className="text-gray-600 text-sm">Tranparency Index</div>
                  <div className="text-gray-600 text-sm">Proposed pay scores</div>
                  <div className="text-gray-600 text-sm">Advanced search filters</div>
                </div>
                <div className="bg-red-400 text-white text-center py-3">
                  <div className="text-xs font-medium">For Executive Director Pay Committees</div>
                </div>
                <div className="p-6 text-center">
                  <button aria-label="View pricing details" title="View pricing details" className="text-gray-400">
                    <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* Want to subscribe */}
        <section className="bg-white py-12 sm:py-16">
          <div className="container-max">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-700 sm:text-4xl">WANT TO SUBSCRIBE?</h2>
              <p className="mt-2 text-gray-600">Drop in a message</p>
            </div>

            <div className="max-w-4xl mx-auto">
              <form className="grid md:grid-cols-2 gap-4">
                {/* Left column - Form fields */}
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Name *"
                    className="w-full px-4 py-3 bg-gray-400 text-white placeholder-white border-0 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  />
                  <input
                    type="email"
                    placeholder="Email *"
                    className="w-full px-4 py-3 bg-gray-400 text-white placeholder-white border-0 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    className="w-full px-4 py-3 bg-gray-400 text-white placeholder-white border-0 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  />
                  <input
                    type="text"
                    placeholder="Subject"
                    className="w-full px-4 py-3 bg-gray-400 text-white placeholder-white border-0 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  />
                </div>

                {/* Right column - Message textarea */}
                <div className="relative">
                  <textarea
                    placeholder="Message"
                    rows={7}
                    className="w-full h-full px-4 py-3 bg-gray-400 text-white placeholder-white border-0 focus:outline-none focus:ring-2 focus:ring-gray-500 resize-none"
                  ></textarea>
                  <button
                    type="submit"
                    className="absolute bottom-4 right-4 bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 text-sm font-medium transition-colors"
                  >
                    Send
                  </button>
                </div>
              </form>

              {/* Call section */}
              <div className="mt-8 text-center">
                <p className="text-gray-600 text-sm mb-2">or</p>
                <p className="text-gray-600 text-sm mb-2">Call us for further details and detailed demo</p>
                <a href="tel:+912261235515" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  +91 22 6123 5515
                </a>
              </div>
            </div>
          </div>
        </section>


      </main>

      <Footer />
    </div>
  );
}
