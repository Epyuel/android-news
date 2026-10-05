"use client";

import { Bell, ChevronDown, LogOut, Menu, ShieldCheck } from "lucide-react";
import { onAuthStateChanged, signOut, updatePassword } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/sidebar";
import DashboardToast from "@/components/dashboard-toast";
import { auth } from "@/lib/firebase";

type DashboardShellProps = { children: React.ReactNode };

export default function DashboardShell({ children }: DashboardShellProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<"success" | "error">("success");
  const [displayName, setDisplayName] = useState("Admin");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setDisplayName(user?.displayName || user?.email?.split("@")[0] || "Admin");
    });
    return unsubscribe;
  }, []);

  const initials = useMemo(
    () =>
      displayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "A",
    [displayName],
  );

  const handlePasswordChange = async () => {
    const password = window.prompt("Enter a new password (at least 6 characters)");
    if (!password) return;
    if (!auth.currentUser) {
      setNoticeTone("error");
      setNotice("Sign in before changing your password.");
      return;
    }
    try {
      await updatePassword(auth.currentUser, password);
      setNoticeTone("success");
      setNotice("Password updated successfully.");
    } catch {
      setNoticeTone("error");
      setNotice("Please sign in again before changing your password.");
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.replace("/login");
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_93%_8%,rgba(219,229,242,0.5),transparent_30%),linear-gradient(135deg,#f8fafd_0%,#f2f6fb_100%)] p-4 md:p-8">
      {sidebarOpen && (
        <button
          className="fixed inset-0 z-30 border-0 bg-[#172231]/15 md:hidden"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="mx-auto grid min-h-[calc(100vh-32px)] max-w-[1480px] gap-8 md:min-h-[calc(100vh-64px)] md:grid-cols-[278px_minmax(0,1fr)]">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <section className="min-w-0 pt-0">
          <header className="flex min-h-[50px] items-center justify-end gap-3.5">
            <button
              className="mr-auto grid h-11 w-11 place-items-center rounded-full border-0 bg-white text-[#172231] shadow-[0_8px_22px_rgba(73,100,130,0.08)] md:hidden"
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>

            <div className="relative">
              <button
                className="flex min-h-[47px] items-center gap-3 rounded-full border-0 bg-white/70 py-1 pr-3.5 pl-1.5 text-[13px] font-bold text-[#172231] shadow-[0_8px_22px_rgba(73,100,130,0.08)]"
                aria-expanded={profileOpen}
                onClick={() => setProfileOpen((open) => !open)}
              >
                <span className="grid h-[35px] w-[35px] place-items-center rounded-full bg-[#182432] text-sm text-white">
                  {initials}
                </span>
                <span className="hidden sm:inline">{displayName}</span>
                <ChevronDown className="hidden sm:block" size={16} />
              </button>

              {profileOpen && (
                <div className="absolute top-14 right-0 z-50 w-[214px] rounded-[14px] border border-[#e4ebf3] bg-white p-2 shadow-[0_18px_40px_rgba(54,79,107,0.17)]">
                  <button
                    className="flex w-full items-center gap-2.5 rounded-lg border-0 bg-transparent p-2.5 text-left text-xs text-[#19283c] hover:bg-[#f1f5fa]"
                    onClick={handlePasswordChange}
                  >
                    <ShieldCheck size={16} />
                    Change password
                  </button>
                  <button
                    className="flex w-full items-center gap-2.5 rounded-lg border-0 bg-transparent p-2.5 text-left text-xs text-[#b95252] hover:bg-[#f1f5fa]"
                    onClick={handleSignOut}
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
              )}
            </div>

            {/* <button
              className="grid h-[47px] w-[47px] place-items-center rounded-full border-0 bg-white/70 text-[#172231] shadow-[0_8px_22px_rgba(73,100,130,0.08)]"
              aria-label="Notifications"
            >
              <Bell size={20} strokeWidth={1.8} />
            </button> */}
          </header>

          {children}

          {notice && <DashboardToast message={notice} tone={noticeTone} onDismiss={() => setNotice("")} />}
        </section>
      </div>
    </main>
  );
}
