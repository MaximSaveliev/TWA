"use client";

import { useEffect, useState } from "react";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import type { User as UserType } from "@/types";

export default function ProfilePage() {
  const [user, setUser] = useState<UserType | null>(null);
  const [form, setForm] = useState({ email: "", username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<UserType>("/api/auth/me").then(({ data }) => {
      setUser(data);
      setForm({ email: data.email, username: data.username, password: "" });
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError("");
    try {
      const payload: Record<string, string> = { email: form.email, username: form.username };
      if (form.password) payload.password = form.password;
      const { data } = await api.patch<UserType>("/api/auth/me", payload);
      setUser(data);
      setForm({ email: data.email, username: data.username, password: "" });
      setSuccess(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-md mx-auto px-8 py-10">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <User size={20} className="text-gray-500 dark:text-gray-400" />
          </div>
          <div>
            <p className="font-bold text-xl text-gray-900 dark:text-gray-100">{user.username}</p>
            <p className="text-sm text-gray-400">{user.email}</p>
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-5">Account settings</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Leave blank to keep current" />
            </div>
            {success && <p className="text-sm text-green-600">Profile updated successfully.</p>}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
