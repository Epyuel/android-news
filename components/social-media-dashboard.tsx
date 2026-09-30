"use client";

import { useEffect, useMemo, useState } from "react";
import { Edit3, Plus, RotateCcw, Search, Share2, Trash2 } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import ActionConfirmDialog from "@/components/action-confirm-dialog";
import DashboardShell from "@/components/dashboard-shell";
import DashboardToast from "@/components/dashboard-toast";
import DataTable, { type TableColumn } from "@/components/data-table";
import { auth, db } from "@/lib/firebase";
import type { SocialLink, SocialLinkInput, SocialLinkStatus } from "@/models/social-link";

type SocialForm = { platform: string; url: string };
const emptyForm: SocialForm = { platform: "", url: "" };
const commonPlatforms = ["Instagram", "YouTube", "TikTok", "Facebook", "Telegram", "X", "Website"];

function timestampToIso(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value) {
    const timestamp = value as { toDate?: () => Date };
    if (typeof timestamp.toDate === "function") return timestamp.toDate().toISOString();
  }
  return typeof value === "string" ? value : "";
}

function validLink(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export default function SocialMediaDashboard() {
  const router = useRouter();
  const [rows, setRows] = useState<SocialLink[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SocialLink | null>(null);
  const [form, setForm] = useState<SocialForm>(emptyForm);
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<"success" | "error">("success");
  const [confirmation, setConfirmation] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    destructive?: boolean;
    onConfirm: () => void | Promise<void>;
  } | null>(null);
  const showNotice = (message: string, tone: "success" | "error") => {
    setNoticeTone(tone);
    setNotice(message);
  };

  const loadRows = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "socialLinks"));
      setRows(snapshot.docs.map((item) => {
        const data = item.data();
        return {
          id: item.id,
          platform: String(data.platform ?? ""),
          url: String(data.url ?? ""),
          status: data.status === "inactive" ? "inactive" : "active",
          createdAt: timestampToIso(data.createdAt),
          updatedAt: timestampToIso(data.updatedAt),
        } satisfies SocialLink;
      }).sort((a, b) => a.platform.localeCompare(b.platform)));
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Unable to load social links.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => onAuthStateChanged(auth, (user) => {
    if (!user) router.replace("/login");
    else void loadRows();
  }), [router]);

  const visibleRows = useMemo(() => rows.filter((row) =>
    `${row.platform} ${row.url}`.toLowerCase().includes(search.toLowerCase()),
  ), [rows, search]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (row: SocialLink) => { setEditing(row); setForm({ platform: row.platform, url: row.url }); setDialogOpen(true); };

  const saveLink = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const platform = form.platform.trim();
    const url = form.url.trim();
    if (!platform) return showNotice("Choose or enter a platform name.", "error");
    if (!validLink(url)) return showNotice("Enter a valid http or https link.", "error");
    setSaving(true);
    try {
      const payload: SocialLinkInput = { platform, url, status: editing?.status ?? "active" };
      if (editing) await updateDoc(doc(db, "socialLinks", editing.id), { ...payload, updatedAt: serverTimestamp() });
      else await addDoc(collection(db, "socialLinks"), { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      setDialogOpen(false);
      showNotice(editing ? "Social link updated." : "Social link added.", "success");
      await loadRows();
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Unable to save social link.", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (row: SocialLink) => {
    const status: SocialLinkStatus = row.status === "active" ? "inactive" : "active";
    try {
      await updateDoc(doc(db, "socialLinks", row.id), { status, updatedAt: serverTimestamp() });
      setRows((current) => current.map((item) => item.id === row.id ? { ...item, status } : item));
      showNotice(status === "active" ? "Social link activated." : "Social link hidden from mobile.", "success");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Unable to update social link.", "error");
    }
  };

  const deleteLink = async (row: SocialLink) => {
    try {
      await deleteDoc(doc(db, "socialLinks", row.id));
      setRows((current) => current.filter((item) => item.id !== row.id));
      showNotice("Social link deleted.", "success");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Unable to delete social link.", "error");
    }
  };

  const columns: TableColumn<SocialLink>[] = [
    { key: "platform", label: "Platform" },
    { key: "url", label: "Link", render: (value) => <a className="block max-w-[420px] truncate text-[#53749b] hover:underline" href={String(value)} target="_blank" rel="noreferrer">{String(value)}</a> },
    { key: "status", label: "Status", render: (value) => <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${value === "active" ? "bg-[#e3f5ed] text-[#218260]" : "bg-[#edf1f5] text-[#738195]"}`}>{value === "active" ? "Active" : "Inactive"}</span> },
  ];

  return (
    <DashboardShell>
      <div className="mt-8 flex flex-col gap-5 md:-mt-[50px] md:min-h-[50px] md:pr-[260px]">
        <div><h1 className="m-0 text-[28px] leading-tight font-medium text-[#1c2c41]">Social media</h1><p className="mt-2 text-sm text-[#8a9bb2]">Manage the links shown in the mobile app.</p></div>
      </div>
      <div className="mt-7 flex justify-end"><button className="inline-flex min-h-11 items-center gap-2 rounded-full border-0 bg-[#172231] px-5 text-[13px] font-bold text-white" onClick={openCreate}><Plus size={18} /> Add social link</button></div>
      <section className="mt-6 min-h-[500px] rounded-[18px] border border-white/95 bg-white/85 px-4 py-5 shadow-[0_16px_32px_rgba(92,119,147,0.06)]">
        <div className="mb-5 flex flex-col gap-2.5 sm:flex-row"><label className="relative flex-1"><Search className="absolute top-1/2 left-4 -translate-y-1/2 text-[#8295ad]" size={19} /><input className="h-11 w-full rounded-full border border-[#e2eaf3] bg-[#fafcff]/80 pr-4 pl-12 text-[13px] outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search social links..." /></label><button className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#e2eaf3] bg-[#f8fafd]/80 px-5 text-[13px] text-[#73869f]" onClick={() => setSearch("")}><RotateCcw size={17} /> Reset</button></div>
        {loading ? <div className="px-12 py-12 text-center text-[#8395aa]">Loading social links...</div> : <DataTable rows={visibleRows} columns={columns} itemLabel="links" emptyMessage="No social links configured" renderActions={(row, close) => <div>
          <button className="flex w-full items-center gap-3 rounded-lg border-0 bg-transparent px-3 py-3 text-left text-sm text-[#40546d] hover:bg-[#f1f5fa]" onClick={() => { close(); openEdit(row); }}><Edit3 size={16} /> Edit</button>
          <button className="flex w-full items-center gap-3 rounded-lg border-0 bg-transparent px-3 py-3 text-left text-sm text-[#40546d] hover:bg-[#f1f5fa]" onClick={() => { close(); void toggleStatus(row); }}><Share2 size={16} /> {row.status === "active" ? "Deactivate" : "Activate"}</button>
          <button className="flex w-full items-center gap-3 rounded-lg border-0 bg-transparent px-3 py-3 text-left text-sm text-[#b95252] hover:bg-[#f1f5fa]" onClick={() => { close(); setConfirmation({ title: "Delete social link?", description: `${row.platform} will be removed from the mobile app.`, confirmLabel: "Delete link", destructive: true, onConfirm: () => deleteLink(row) }); }}><Trash2 size={16} /> Delete</button>
        </div>} />}
      </section>
      {notice && <DashboardToast message={notice} tone={noticeTone} onDismiss={() => setNotice("")} />}
      {confirmation && <ActionConfirmDialog {...confirmation} onCancel={() => setConfirmation(null)} />}
      {dialogOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-[#172231]/20 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDialogOpen(false)}>
        <form className="grid max-h-[92vh] w-[min(100%,520px)] gap-5 overflow-y-auto rounded-[18px] bg-white p-6 shadow-[0_24px_70px_rgba(31,50,72,0.25)]" onSubmit={saveLink}>
          <div className="flex items-start justify-between gap-4"><div><h2 className="m-0 text-xl font-semibold">{editing ? "Edit social link" : "Add social link"}</h2><p className="mt-1 text-xs text-[#8495a9]">Active links are visible in the mobile app.</p></div><button type="button" className="grid h-8 w-8 place-items-center rounded-full border-0 bg-[#f3f6f9] text-[#64778e]" aria-label="Close" onClick={() => setDialogOpen(false)}>×</button></div>
          <label className="grid gap-1.5 text-xs font-bold text-[#536780]">Platform<select className="h-11 rounded-lg border border-[#dfe8f1] bg-white px-3 text-sm font-normal text-[#19283c] outline-none focus:border-[#8eaccb]" value={!form.platform ? "" : commonPlatforms.includes(form.platform) ? form.platform : "Other"} onChange={(event) => setForm({ ...form, platform: event.target.value === "Other" ? "" : event.target.value })}><option value="">Choose a platform</option>{commonPlatforms.map((platform) => <option key={platform} value={platform}>{platform}</option>)}<option value="Other">Other</option></select></label>
          {(!form.platform || !commonPlatforms.includes(form.platform)) && <label className="grid gap-1.5 text-xs font-bold text-[#536780]">Platform name<input className="h-11 rounded-lg border border-[#dfe8f1] px-3 text-sm font-normal text-[#19283c] outline-none focus:border-[#8eaccb]" required maxLength={50} value={form.platform} onChange={(event) => setForm({ ...form, platform: event.target.value })} placeholder="e.g. WhatsApp" /></label>}
          <label className="grid gap-1.5 text-xs font-bold text-[#536780]">Profile link<input className="h-11 rounded-lg border border-[#dfe8f1] px-3 text-sm font-normal text-[#19283c] outline-none focus:border-[#8eaccb]" required type="url" value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="https://..." /></label>
          <div className="flex justify-end gap-3"><button type="button" className="min-h-11 rounded-full border border-[#dfe8f1] bg-white px-5 text-sm font-bold text-[#536780]" onClick={() => setDialogOpen(false)}>Cancel</button><button type="submit" disabled={saving} className="min-h-11 rounded-full border-0 bg-[#172231] px-5 text-sm font-bold text-white disabled:opacity-60">{saving ? "Saving..." : editing ? "Save changes" : "Add link"}</button></div>
        </form>
      </div>}
    </DashboardShell>
  );
}
