"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Newspaper,
} from "lucide-react";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) router.replace("/category");
    });
    return unsubscribe;
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setNotice("");
    try {
      await setPersistence(
        auth,
        remember ? browserLocalPersistence : browserSessionPersistence,
      );
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace("/category");
    } catch {
      setNotice("Email or password is incorrect.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      setNotice("Enter your email address first.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setNotice("Password reset email sent.");
    } catch {
      setNotice("Unable to send a reset email for this address.");
    }
  };

  return (
    <main className="relative grid min-h-screen place-items-start overflow-hidden bg-[radial-gradient(circle_at_100%_0%,rgba(218,228,240,0.76)_0_8%,rgba(218,228,240,0.28)_8%_15%,transparent_15%),radial-gradient(circle_at_0%_100%,rgba(218,228,240,0.68)_0_12%,rgba(218,228,240,0.26)_12%_20%,transparent_20%),linear-gradient(135deg,#f8fbff_0%,#eef4fb_100%)] px-4 pt-20 pb-8 md:place-items-center md:px-6 md:pt-24 md:pb-12">
      <header className="absolute top-6 left-5 flex items-center gap-4 text-sm font-bold text-[#172231] md:top-11 md:left-[clamp(24px,5vw,86px)] md:text-[17px]">
        <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-[#172231] text-2xl font-light leading-none text-white md:h-[38px] md:w-[38px]">
          +
        </span>
        <span>ANDROID NEWS APP</span>
      </header>

      <section
        className="grid w-full overflow-hidden rounded-2xl border border-white/90 bg-white/75 shadow-[0_28px_70px_rgba(66,88,115,0.12)] md:min-h-[640px] md:max-w-[1180px] md:grid-cols-[minmax(330px,1fr)_minmax(360px,1.05fr)] md:rounded-[19px]"
        aria-label="Sign in"
      >
        <div className="relative flex min-h-80 flex-col overflow-hidden border-b border-[#e2ebf5]/90 bg-[radial-gradient(circle_at_48%_86%,rgba(215,227,241,0.82),transparent_42%)] px-6 py-8 md:min-h-0 md:items-center md:border-r md:border-b-0 md:px-16 md:py-20">
          <div className="w-full max-w-[360px]">
            <span className="mb-5 grid h-[38px] w-[38px] place-items-center rounded-full bg-[#172231] text-2xl font-light leading-none text-white md:mx-auto">
              +
            </span>
            <p className="mb-7 text-left text-[15px] font-bold text-[#172231] md:mb-12 md:text-center">
              ANDROID NEWS APP
            </p>
            <h1 className="m-0 mb-3 text-[28px] leading-tight font-bold text-[#111b28] md:text-[34px]">
              Stay Informed, Stay Ahead
            </h1>
            <p className="m-0 text-base leading-7 text-[#73869f]">
              Manage your news platform with ease. Secure, fast, and reliable.
            </p>
          </div>

          <div className="relative mt-auto min-h-56 w-full max-w-[330px] origin-bottom-left scale-[0.86] md:w-[76%] md:scale-100">
            <div className="absolute bottom-2 left-0 h-[180px] w-[280px] -rotate-[7deg] rounded-[14px] bg-white/85 shadow-[0_18px_34px_rgba(65,86,111,0.13)]">
              <span className="absolute top-6 left-6 h-2.5 w-2.5 rounded-full bg-[#d6e1ed]" />
              <span className="absolute top-6 left-11 h-2.5 w-2.5 rounded-full bg-[#d6e1ed]" />
              <span className="absolute top-6 left-16 h-2.5 w-2.5 rounded-full bg-[#d6e1ed]" />
              <div className="absolute top-[84px] left-[38px] h-[58px] w-[58px] rounded-[10px] bg-[#253446]" />
              <p className="absolute top-[72px] left-[118px] h-2 w-[126px] rounded-full bg-[#dce5ef]" />
              <p className="absolute top-[98px] left-[118px] h-2 w-[86px] rounded-full bg-[#dce5ef]" />
              <p className="absolute top-[122px] left-[118px] h-2 w-[146px] rounded-full bg-[#dce5ef]" />
              <p className="absolute top-[146px] left-[118px] h-2 w-[106px] rounded-full bg-[#dce5ef]" />
            </div>
            <div className="absolute right-0 bottom-[88px] grid h-[74px] w-[74px] -rotate-[9deg] place-items-center rounded-[20px] bg-[#172231] text-white shadow-[0_16px_30px_rgba(23,34,49,0.22)]">
              <Newspaper size={34} strokeWidth={1.6} />
            </div>
          </div>
        </div>

        <form
          className="flex flex-col justify-center bg-white/90 px-6 py-9 md:px-16 md:py-20"
          onSubmit={handleSubmit}
        >
          <div className="mb-8 md:mb-12">
            <h2 className="m-0 mb-2 text-[28px] leading-tight font-bold text-[#111b28] md:text-[34px]">
              Welcome Back
            </h2>
            <p className="m-0 text-base text-[#7487a2]">
              Sign in to access your account
            </p>
          </div>

          <label className="mb-7 grid gap-2.5 text-sm font-bold text-[#40546d]">
            Email Address
            <span className="flex min-h-[59px] items-center gap-4 rounded-[9px] border border-[#d9e3ee] bg-[#fbfdff] px-4 text-[#7287a1] focus-within:border-[#9cb7d5] focus-within:ring-4 focus-within:ring-[#7294b8]/10">
              <Mail size={19} />
              <input
                className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[#172231] outline-none placeholder:text-[#8699b4]"
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email address"
                autoComplete="email"
              />
            </span>
          </label>

          <label className="mb-7 grid gap-2.5 text-sm font-bold text-[#40546d]">
            Password
            <span className="flex min-h-[59px] items-center gap-4 rounded-[9px] border border-[#d9e3ee] bg-[#fbfdff] px-4 text-[#7287a1] focus-within:border-[#9cb7d5] focus-within:ring-4 focus-within:ring-[#7294b8]/10">
              <LockKeyhole size={19} />
              <input
                className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[#172231] outline-none placeholder:text-[#8699b4]"
                required
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-0 bg-transparent text-[#6f829b] hover:bg-[#edf3f9]"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((shown) => !shown)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>

          <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center md:mb-10">
            <label className="inline-flex items-center gap-3 text-sm text-[#40546d]">
              <input
                className="h-5 w-5 accent-[#172231]"
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />
              <span>Remember me</span>
            </label>
            <button
              type="button"
              className="border-0 bg-transparent text-sm font-bold text-[#526982] hover:text-[#172231]"
              onClick={handlePasswordReset}
            >
              Forgot password?
            </button>
          </div>

          <button
            className="inline-flex min-h-[57px] items-center justify-center gap-3 rounded-[17px] border-0 bg-[#111b28] text-[15px] font-bold text-white shadow-[0_11px_22px_rgba(17,27,40,0.18)] hover:bg-[#25384e] disabled:cursor-not-allowed disabled:opacity-70"
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
            <ArrowRight size={18} />
          </button>

          {notice && (
            <p className="mt-5 text-center text-[13px] text-[#b95252]">
              {notice}
            </p>
          )}
        </form>
      </section>
    </main>
  );
}
