"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { setToken } from "@/lib/auth";
import { Compass, ArrowRight, Sparkles, MapPin, Calendar } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/api/auth/register", form);
      const { data } = await api.post("/api/auth/login", {
        email: form.email,
        password: form.password,
      });
      setToken(data.access_token);
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left: Brand panel ── */}
      <div className="hidden lg:flex lg:w-[52%] relative flex-col overflow-hidden bg-amber-500">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500" />
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-white/10" />
        <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-white/10" />
        <div className="absolute top-1/2 left-8 w-32 h-32 rounded-full bg-white/[0.07]" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />
        <div className="relative z-10 flex flex-col h-full p-14">
          <Link href="/" className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-white" />
            <span className="text-white text-sm font-semibold">TripPlanner</span>
          </Link>
          <div className="flex-1 flex flex-col justify-center max-w-sm">
            <h2 className="text-[2.6rem] font-extrabold text-white leading-[1.1] tracking-tight mb-5">
              Plan your first
              <br />
              great trip.
            </h2>
            <p className="text-white/75 text-base leading-relaxed mb-10">
              Free forever. No credit card. Just tell the AI where you want to go and watch your itinerary take shape.
            </p>
            <div className="space-y-3.5">
              {[
                { icon: Sparkles, label: "AI builds your itinerary instantly" },
                { icon: MapPin, label: "Add and organize destinations" },
                { icon: Calendar, label: "Manage multiple trips at once" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-white/80 text-sm">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-white/40 text-xs">© {new Date().getFullYear()} TripPlanner</p>
        </div>
      </div>

      {/* ── Right: Form panel ── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white dark:bg-gray-950 transition-colors">
        <div className="w-full max-w-[360px]">
          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2 mb-10 lg:hidden">
            <Compass className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">TripPlanner</span>
          </Link>

          <div className="mb-8">
            <h1 className="text-[1.6rem] font-extrabold text-gray-900 dark:text-gray-100 tracking-tight mb-1.5">
              Create your account
            </h1>
            <p className="text-gray-400 dark:text-gray-500 text-sm">Start planning trips in under a minute</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="h-11 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600 text-sm rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Username
              </Label>
              <Input
                id="username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
                autoComplete="username"
                placeholder="travelexplorer"
                className="h-11 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600 text-sm rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                className="h-11 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600 text-sm rounded-xl"
              />
            </div>

            {error && (
              <div className="px-3.5 py-3 rounded-xl bg-red-50 dark:bg-red-950 border border-red-100 dark:border-red-900">
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl mt-1 tracking-wide"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-black/25 border-t-black rounded-full animate-spin" />
                  Creating account…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Create account
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-amber-600 hover:text-amber-500 font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
