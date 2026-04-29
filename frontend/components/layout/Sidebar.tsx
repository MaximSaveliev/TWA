"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  MessageSquare, Map, Bookmark, Plus, LogOut, User,
  ChevronLeft, ChevronRight, Sun, Moon, Menu, X, Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { removeToken } from "@/lib/auth";

const NAV = [
  { label: "Chats",  icon: MessageSquare, href: "/dashboard" },
  { label: "Trips",  icon: Map,           href: "/dashboard/trips" },
  { label: "Saved",  icon: Bookmark,      href: "/dashboard/saved" },
];

function useIsActive(href: string) {
  const pathname = usePathname();
  if (href === "/dashboard") return pathname === "/dashboard" || pathname.startsWith("/dashboard/chat/");
  return pathname === href || pathname.startsWith(href + "/");
}

function NavLink({ label, icon: Icon, href, collapsed, onClick }: {
  label: string; icon: React.ElementType; href: string; collapsed: boolean; onClick?: () => void;
}) {
  const active = useIsActive(href);
  return (
    <Link
      href={href}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        collapsed ? "justify-center" : ""
      } ${
        active
          ? "bg-black dark:bg-white text-white dark:text-black"
          : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-black dark:hover:text-white"
      }`}
    >
      <Icon size={16} />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

function SidebarInner({ collapsed, mobile, onClose, onToggle }: { collapsed: boolean; mobile?: boolean; onClose?: () => void; onToggle?: () => void }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const isDark = mounted && theme === "dark";

  const handleLogout = () => { removeToken(); router.push("/auth/login"); };

  return (
    <aside className={`flex flex-col bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 h-screen overflow-hidden transition-[width] duration-200 ${
      mobile ? "w-64" : collapsed ? "w-14" : "w-56"
    }`}>
      {/* Logo */}
      <div className={`flex items-center px-3 py-4 shrink-0 ${(!mobile && collapsed) ? "justify-center" : "justify-between"}`}>
        {(mobile || !collapsed) && (
          <Link href="/dashboard" className="flex items-center gap-1.5 text-sm font-bold tracking-tight text-black dark:text-white select-none">
            <Compass size={14} className="text-amber-500 shrink-0" />
            tripplanner.
          </Link>
        )}
        {mobile ? (
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 text-gray-400">
            <X size={14} />
          </Button>
        ) : (
          <button
            onClick={onToggle}
            className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        {NAV.map(({ label, icon, href }) => (
          <NavLink key={label} label={label} icon={icon} href={href} collapsed={!mobile && collapsed} onClick={onClose} />
        ))}
      </nav>

      {/* New chat */}
      <div className="px-2 pb-2 shrink-0">
        {(!mobile && collapsed) ? (
          <Link href="/dashboard" title="New chat" className="flex items-center justify-center p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-black dark:hover:text-white transition-colors">
            <Plus size={16} />
          </Link>
        ) : (
          <Link href="/dashboard" className="block w-full" onClick={onClose}>
            <Button variant="outline" className="w-full rounded-full text-sm font-medium dark:border-gray-700 dark:text-gray-300">
              New chat
            </Button>
          </Link>
        )}
      </div>

      {/* Bottom actions */}
      <div className="border-t border-gray-100 dark:border-gray-800 px-2 py-2 space-y-0.5 shrink-0">
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          title={(!mobile && collapsed) ? (isDark ? "Light mode" : "Dark mode") : undefined}
          className={`flex items-center gap-3 w-full px-2.5 py-2.5 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-black dark:hover:text-white transition-colors ${(!mobile && collapsed) ? "justify-center" : ""}`}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
          {(mobile || !collapsed) && <span>{isDark ? "Light mode" : "Dark mode"}</span>}
        </button>
        <Link
          href="/dashboard/profile"
          onClick={onClose}
          title={(!mobile && collapsed) ? "Profile" : undefined}
          className={`flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-black dark:hover:text-white transition-colors ${(!mobile && collapsed) ? "justify-center" : ""}`}
        >
          <User size={16} />
          {(mobile || !collapsed) && "Profile"}
        </Link>
        <button
          onClick={handleLogout}
          title={(!mobile && collapsed) ? "Logout" : undefined}
          className={`flex items-center gap-3 w-full px-2.5 py-2.5 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-red-500 transition-colors ${(!mobile && collapsed) ? "justify-center" : ""}`}
        >
          <LogOut size={16} />
          {(mobile || !collapsed) && "Logout"}
        </button>
      </div>
    </aside>
  );
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:flex shrink-0">
        <SidebarInner collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-sm text-gray-500"
      >
        <Menu size={16} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="md:hidden fixed inset-y-0 left-0 z-50">
            <SidebarInner collapsed={false} mobile onClose={() => setMobileOpen(false)} />
          </div>
        </>
      )}
    </>
  );
}
