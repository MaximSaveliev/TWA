"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Sparkles, MapPin, Calendar, ArrowRight, Globe, Compass, Sun, Moon } from "lucide-react";

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 overflow-hidden transition-colors">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <Link href="/" className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-100">TripPlanner</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {mounted ? (theme === "dark" ? <Sun size={15} /> : <Moon size={15} />) : <Moon size={15} />}
          </button>
          <Link href="/auth/login">
            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 text-sm">
              Sign in
            </Button>
          </Link>
          <Link href="/auth/register">
            <Button size="sm" className="bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm h-8 px-4">
              Get started
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center">
        {/* Subtle background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[25%] right-[15%] w-[500px] h-[400px] rounded-full bg-amber-100/60 dark:bg-amber-900/20 blur-[100px]" />
          <div className="absolute bottom-[20%] left-[10%] w-[300px] h-[300px] rounded-full bg-sky-100/50 dark:bg-sky-900/20 blur-[80px]" />
          {/* Grid */}
          <div
            className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(0,0,0,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,1) 1px, transparent 1px)",
              backgroundSize: "72px 72px",
            }}
          />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-8 pt-36 pb-28 w-full">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 text-xs font-medium mb-10 tracking-wide">
            <Sparkles className="w-3 h-3" />
            Powered by Groq AI
          </div>

          {/* Headline */}
          <h1 className="text-[clamp(3rem,7vw,5.5rem)] font-extrabold leading-[1.03] tracking-[-0.03em] mb-6 max-w-3xl text-gray-900 dark:text-gray-50">
            Every journey,{" "}
            <span className="text-amber-500">perfectly</span>
            <br />
            planned.
          </h1>

          <p className="text-gray-500 dark:text-gray-400 text-lg leading-relaxed max-w-lg mb-12">
            Describe your dream trip and let AI build your itinerary. Manage destinations,
            organize travel days, and explore smarter.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/auth/register">
              <Button
                size="lg"
                className="bg-amber-500 hover:bg-amber-400 text-black font-bold h-12 px-8 text-sm tracking-wide"
              >
                Start planning free
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button
                size="lg"
                variant="outline"
                className="border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white h-12 px-8 text-sm"
              >
                Sign in
              </Button>
            </Link>
          </div>

          {/* Stats row */}
          <div className="mt-20 pt-10 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-12">
            {[
              { label: "AI-generated itineraries", value: "Instant" },
              { label: "Trips & destinations", value: "Unlimited" },
              { label: "Planning — free to use", value: "Always" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{s.value}</div>
                <div className="text-xs text-gray-400 mt-1 tracking-wide">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-8 py-28">
          <div className="mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-3 text-gray-900 dark:text-gray-100">
              Everything a traveler needs
            </h2>
            <p className="text-gray-400 text-base">From idea to detailed plan in minutes.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: Sparkles,
                color: "amber",
                title: "AI Trip Assistant",
                desc: "Chat with Groq AI to get personalized destination picks, day-by-day breakdowns, and travel tips tailored to your style.",
              },
              {
                icon: MapPin,
                color: "sky",
                title: "Destination Organizer",
                desc: "Add and order every stop on your journey. Keep notes, details, and logistics for each location neatly in one place.",
              },
              {
                icon: Calendar,
                color: "emerald",
                title: "Multi-Trip Management",
                desc: "Handle any number of trips at once. Switch between them instantly, track progress, and access plans from anywhere.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="group p-7 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-sm transition-all duration-300"
              >
                <div
                  className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-6 ${
                    f.color === "amber"
                      ? "bg-amber-50 dark:bg-amber-950 text-amber-500"
                      : f.color === "sky"
                      ? "bg-sky-50 dark:bg-sky-950 text-sky-500"
                      : "bg-emerald-50 dark:bg-emerald-950 text-emerald-500"
                  }`}
                >
                  <f.icon className="w-4.5 h-4.5" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="max-w-6xl mx-auto px-8 py-28 text-center">
          <Globe className="w-8 h-8 text-amber-400 mx-auto mb-6" />
          <h2 className="text-4xl font-extrabold tracking-tight mb-4 text-gray-900 dark:text-gray-100">
            Ready to explore?
          </h2>
          <p className="text-gray-400 text-base mb-8 max-w-sm mx-auto leading-relaxed">
            Free to start. No credit card. Just great trips.
          </p>
          <Link href="/auth/register">
            <Button
              size="lg"
              className="bg-amber-500 hover:bg-amber-400 text-black font-bold h-12 px-10 text-sm tracking-wide"
            >
              Create free account
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-gray-300 dark:text-gray-600 text-xs">© {new Date().getFullYear()} TripPlanner</span>
          </div>
          <span className="text-gray-300 dark:text-gray-600 text-xs">AI-powered travel planning</span>
        </div>
      </footer>
    </div>
  );
}
