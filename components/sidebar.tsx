"use client";

import {
  Bell,
  CircleDollarSign,
  FileText,
  Layers3,
  Share2,
  Settings,
  Video,
  Users,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
  ["Manage News", "/news", FileText],
  ["Notification", "/notification", Bell],
  ["Video management", "/video-management", Video],
  ["Social media", "/social-media", Share2],
  ["Manage Ads", "/ads", CircleDollarSign],
  ["Manage Category", "/category", Layers3],
  ["Administrators", "/adminstrator", Users],
  ["Settings", "/settings", Settings],
] as const;

type SidebarProps = { open: boolean; onClose: () => void };

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside
      className={`fixed top-4 bottom-4 left-4 z-40 flex w-[min(278px,calc(100vw-32px))] max-h-[calc(100vh-32px)] -translate-x-[120%] flex-col overflow-y-auto rounded-[19px] border border-white/90 bg-[#f8fbff] px-3.5 py-6 shadow-[0_20px_45px_rgba(67,92,120,0.1)] transition-transform duration-200 md:static md:z-auto md:min-h-[calc(100vh-64px)] md:w-auto md:max-h-none md:translate-x-0 md:overflow-visible md:bg-[#f8fbff]/90 ${
        open ? "translate-x-0" : ""
      }`}
    >
      <div className="flex items-center gap-3.5 px-3 pb-9 text-[15px] font-bold tracking-tight text-[#172231]">
        <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full bg-[#172231] text-2xl font-light leading-none text-white">
          +
        </span>
        <span>ANDROID NEWS APP</span>
        <button
          className="ml-auto grid h-8 w-8 place-items-center rounded-full border-0 bg-[#eaf0f6] text-[#172231] shadow-none md:hidden"
          aria-label="Close navigation"
          onClick={onClose}
        >
          <X size={19} />
        </button>
      </div>

      <nav className="grid gap-2">
        {navItems.map(([label, href, Icon]) => (
          <button
            className={`flex min-h-11 w-full items-center gap-4 rounded-[13px] border-0 px-3.5 text-left text-[13px] font-semibold transition-colors ${
              pathname === href
                ? "bg-[#172231] text-white shadow-[0_8px_16px_rgba(23,34,49,0.14)]"
                : "bg-transparent text-[#627590] hover:bg-[#e3ebf5] hover:text-[#172231]"
            }`}
            key={href}
            onClick={() => {
              router.push(href);
              onClose();
            }}
          >
            <Icon className="shrink-0" size={20} strokeWidth={1.8} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <footer className="mt-auto border-t border-[#dfe8f2] px-3 pt-5 text-[11px] leading-7 text-[#8ba0bc]">
        Copyright © {(new Date()).getFullYear()} Epdemrew
      </footer>
    </aside>
  );
}
