"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/dashboard-shell";
import DashboardToast from "@/components/dashboard-toast";
import RichTextEditor from "@/components/rich-text-editor";
import { auth, db } from "@/lib/firebase";
import type { AppLegalSettings } from "@/models/app-settings";

const settingsRef = doc(db, "appSettings", "legal");
const emptySettings: AppLegalSettings = {
  privacyPolicy: "",
  privacyPolicyText: "",
  publisherInfo: "",
  publisherInfoText: "",
};

function plainTextFromHtml(html: string) {
  return html
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "• ")
    .replace(/<\/(?:p|h[1-6]|li|blockquote|div|tr)>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[\t ]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default function SettingsDashboard() {
  const router = useRouter();
  const [form, setForm] = useState<AppLegalSettings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<"success" | "error">("success");

  const showNotice = (message: string, tone: "success" | "error") => {
    setNoticeTone(tone);
    setNotice(message);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      void (async () => {
        setLoading(true);
        try {
          const snapshot = await getDoc(settingsRef);
          if (snapshot.exists()) {
            const data = snapshot.data();
            setForm({
              privacyPolicy: typeof data.privacyPolicy === "string" ? data.privacyPolicy : "",
              privacyPolicyText: typeof data.privacyPolicyText === "string" ? data.privacyPolicyText : "",
              publisherInfo: typeof data.publisherInfo === "string" ? data.publisherInfo : "",
              publisherInfoText: typeof data.publisherInfoText === "string" ? data.publisherInfoText : "",
            });
          }
        } catch (error) {
          showNotice(error instanceof Error ? error.message : "Unable to load settings.", "error");
        } finally {
          setLoading(false);
        }
      })();
    });
    return unsubscribe;
  }, [router]);

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await setDoc(settingsRef, { ...form, updatedAt: serverTimestamp() }, { merge: true });
      showNotice("App settings saved.", "success");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Unable to save settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell>
      <form onSubmit={save}>
        <div className="mt-8 flex flex-col gap-4 md:-mt-[50px] md:min-h-[50px]">
          <div>
            <h1 className="m-0 text-[28px] leading-tight font-medium text-[#1c2c41]">Settings</h1>
            <p className="mt-2 text-sm text-[#8a9bb2]">Manage the legal and publisher information shown in the mobile app.</p>
          </div>
        </div>
        <div className="mt-7 flex justify-end">
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2.5 rounded-full border-0 bg-[#172231] px-5 text-[13px] font-bold text-white shadow-[0_8px_17px_rgba(23,34,49,0.12)] hover:bg-[#25384e] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={loading || saving}
            type="submit"
          >
            <Save size={17} /> {saving ? "Saving..." : "Save changes"}
          </button>
        </div>

        {loading ? (
          <div className="mt-7 rounded-[18px] border border-white bg-white/85 px-6 py-16 text-center text-sm text-[#8395aa]">Loading settings...</div>
        ) : (
          <div className="mt-7 grid gap-5">
            <section className="rounded-[18px] border border-white/95 bg-white/85 px-5 py-6 shadow-[0_16px_32px_rgba(92,119,147,0.06)] sm:px-7">
              <div className="mb-4">
                <h2 className="m-0 text-base font-bold text-[#273950]">Privacy policy</h2>
                <p className="mb-0 mt-1 text-xs text-[#8a9bb2]">Displayed in the mobile app under Settings.</p>
              </div>
              <RichTextEditor
                value={form.privacyPolicy}
                onChange={(html) => setForm((current) => ({
                  ...current,
                  privacyPolicy: html,
                  privacyPolicyText: plainTextFromHtml(html),
                }))}
              />
            </section>

            <section className="rounded-[18px] border border-white/95 bg-white/85 px-5 py-6 shadow-[0_16px_32px_rgba(92,119,147,0.06)] sm:px-7">
              <div className="mb-4">
                <h2 className="m-0 text-base font-bold text-[#273950]">Publisher info</h2>
                <p className="mb-0 mt-1 text-xs text-[#8a9bb2]">Publisher details displayed in the mobile app.</p>
              </div>
              <RichTextEditor
                value={form.publisherInfo}
                onChange={(html) => setForm((current) => ({
                  ...current,
                  publisherInfo: html,
                  publisherInfoText: plainTextFromHtml(html),
                }))}
              />
            </section>
          </div>
        )}
      </form>
      {notice ? <DashboardToast message={notice} tone={noticeTone} onDismiss={() => setNotice("")} /> : null}
    </DashboardShell>
  );
}
