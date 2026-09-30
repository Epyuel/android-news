"use client";

import { useEffect, useMemo, useState } from "react";
import { Edit3, Plus, RotateCcw, Search, Video as VideoIcon } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import DataTable, { type TableColumn } from "@/components/data-table";
import DashboardToast from "@/components/dashboard-toast";
import DashboardShell from "@/components/dashboard-shell";
import { auth, db } from "@/lib/firebase";
import type { NewsVideo, NewsVideoInput, VideoStatus } from "@/models/video";

type VideoForm = { title: string; videoUrl: string };
const emptyForm: VideoForm = { title: "", videoUrl: "" };

function timestampToIso(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value) {
    const timestamp = value as { toDate?: () => Date };
    if (typeof timestamp.toDate === "function") return timestamp.toDate().toISOString();
  }
  return typeof value === "string" ? value : "";
}

function isValidVideoUrl(value: string) {
  try {
    const url = new URL(value);
    return ["youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"].includes(url.hostname);
  } catch {
    return false;
  }
}

export default function VideoDashboard() {
  const router = useRouter();
  const [rows, setRows] = useState<NewsVideo[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<NewsVideo | null>(null);
  const [form, setForm] = useState<VideoForm>(emptyForm);
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<"success" | "error">("success");
  const showNotice = (message: string, tone: "success" | "error") => {
    setNoticeTone(tone);
    setNotice(message);
  };

  const loadRows = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "videos"));
      setRows(snapshot.docs.map((item) => {
        const data = item.data();
        return {
          id: item.id,
          title: String(data.title ?? ""),
          videoUrl: String(data.videoUrl ?? ""),
          status: data.status === "published" ? "published" : "unpublished",
          createdAt: timestampToIso(data.createdAt),
          updatedAt: timestampToIso(data.updatedAt),
        } satisfies NewsVideo;
      }).sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")));
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Unable to load videos.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => onAuthStateChanged(auth, (user) => {
    if (!user) router.replace("/login");
    else void loadRows();
  }), [router]);

  const visibleRows = useMemo(() => rows.filter((row) =>
    `${row.title} ${row.videoUrl}`.toLowerCase().includes(search.toLowerCase()),
  ), [rows, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (row: NewsVideo) => {
    setEditing(row);
    setForm({ title: row.title, videoUrl: row.videoUrl });
    setDialogOpen(true);
  };

  const saveVideo = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = form.title.trim();
    const videoUrl = form.videoUrl.trim();
    if (!title) return showNotice("Enter a video title.", "error");
    if (!isValidVideoUrl(videoUrl)) return showNotice("Enter a valid YouTube video link.", "error");

    setSaving(true);
    try {
      const payload: NewsVideoInput = { title, videoUrl, status: editing?.status ?? "unpublished" };
      if (editing) {
        await updateDoc(doc(db, "videos", editing.id), { ...payload, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, "videos"), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      setDialogOpen(false);
      showNotice(editing ? "Video updated." : "Video added as unpublished.", "success");
      await loadRows();
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Unable to save video.", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (row: NewsVideo) => {
    const status: VideoStatus = row.status === "published" ? "unpublished" : "published";
    try {
      await updateDoc(doc(db, "videos", row.id), { status, updatedAt: serverTimestamp() });
      setRows((current) => current.map((item) => item.id === row.id ? { ...item, status } : item));
      showNotice(status === "published" ? "Video published." : "Video unpublished.", "success");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Unable to update video status.", "error");
    }
  };

  const columns: TableColumn<NewsVideo>[] = [
    { key: "title", label: "Title" },
    {
      key: "videoUrl",
      label: "Video link",
      render: (value) => <a href={String(value)} target="_blank" rel="noreferrer" className="block max-w-[360px] truncate text-[#53749b] hover:underline">{String(value)}</a>,
    },
    {
      key: "status",
      label: "Status",
      render: (value) => <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${value === "published" ? "bg-[#e3f5ed] text-[#218260]" : "bg-[#edf1f5] text-[#738195]"}`}>{value === "published" ? "Published" : "Unpublished"}</span>,
    },
  ];

  return (
    <DashboardShell>
      <div className="mt-8 flex flex-col gap-5 md:-mt-[50px] md:min-h-[50px] md:pr-[260px]">
        <div><h1 className="m-0 text-[28px] leading-tight font-medium text-[#1c2c41]">Video management</h1><p className="mt-2 text-sm text-[#8a9bb2]">Add YouTube videos and control what appears in the mobile app.</p></div>
      </div>
      <div className="mt-7 flex justify-end">
        <button className="inline-flex min-h-11 items-center gap-2 rounded-full border-0 bg-[#172231] px-5 text-[13px] font-bold text-white" onClick={openCreate}><Plus size={18} /> Add video</button>
      </div>
      <section className="mt-6 min-h-[500px] rounded-[18px] border border-white/95 bg-white/85 px-4 py-5 shadow-[0_16px_32px_rgba(92,119,147,0.06)]">
        <div className="mb-5 flex flex-col gap-2.5 sm:flex-row">
          <label className="relative flex-1"><Search className="absolute top-1/2 left-4 -translate-y-1/2 text-[#8295ad]" size={19} /><input className="h-11 w-full rounded-full border border-[#e2eaf3] bg-[#fafcff]/80 pr-4 pl-12 text-[13px] outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search videos..." /></label>
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#e2eaf3] bg-[#f8fafd]/80 px-5 text-[13px] text-[#73869f]" onClick={() => setSearch("")}><RotateCcw size={17} /> Reset</button>
        </div>
        {loading ? <div className="px-12 py-12 text-center text-[#8395aa]">Loading videos...</div> : <DataTable rows={visibleRows} columns={columns} itemLabel="videos" emptyMessage="No videos found" renderActions={(row, close) => <div>
          <button className="flex w-full items-center gap-3 rounded-lg border-0 bg-transparent px-3 py-3 text-left text-sm text-[#40546d] hover:bg-[#f1f5fa]" onClick={() => { close(); openEdit(row); }}><Edit3 size={16} /> Edit</button>
          <button className="flex w-full items-center gap-3 rounded-lg border-0 bg-transparent px-3 py-3 text-left text-sm text-[#40546d] hover:bg-[#f1f5fa]" onClick={() => { close(); void toggleStatus(row); }}><VideoIcon size={16} /> {row.status === "published" ? "Unpublish" : "Publish"}</button>
        </div>} />}
      </section>
      {notice && <DashboardToast message={notice} tone={noticeTone} onDismiss={() => setNotice("")} />}
      {dialogOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-[#172231]/20 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDialogOpen(false)}>
        <form className="grid max-h-[92vh] w-[min(100%,520px)] gap-5 overflow-y-auto rounded-[18px] bg-white p-6 shadow-[0_24px_70px_rgba(31,50,72,0.25)]" onSubmit={saveVideo}>
          <div className="flex items-start justify-between gap-4"><div><h2 className="m-0 text-xl font-semibold">{editing ? "Edit video" : "Add video"}</h2><p className="mt-1 text-xs text-[#8495a9]">YouTube videos appear in the mobile app when published.</p></div><button type="button" className="grid h-8 w-8 place-items-center rounded-full border-0 bg-[#f3f6f9] text-[#64778e]" aria-label="Close" onClick={() => setDialogOpen(false)}>×</button></div>
          <label className="grid gap-1.5 text-xs font-bold text-[#536780]">Title<input className="h-11 rounded-lg border border-[#dfe8f1] px-3 text-sm font-normal text-[#19283c] outline-none focus:border-[#8eaccb]" required maxLength={160} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
          <label className="grid gap-1.5 text-xs font-bold text-[#536780]">Video link<input className="h-11 rounded-lg border border-[#dfe8f1] px-3 text-sm font-normal text-[#19283c] outline-none focus:border-[#8eaccb]" required type="url" placeholder="https://www.youtube.com/watch?v=..." value={form.videoUrl} onChange={(event) => setForm({ ...form, videoUrl: event.target.value })} /></label>
          <div className="flex justify-end gap-3"><button type="button" className="min-h-11 rounded-full border border-[#dfe8f1] bg-white px-5 text-sm font-bold text-[#536780]" onClick={() => setDialogOpen(false)}>Cancel</button><button type="submit" disabled={saving} className="min-h-11 rounded-full border-0 bg-[#172231] px-5 text-sm font-bold text-white disabled:opacity-60">{saving ? "Saving..." : editing ? "Save changes" : "Add video"}</button></div>
        </form>
      </div>}
    </DashboardShell>
  );
}
