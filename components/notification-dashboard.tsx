"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Edit3, Plus, RotateCcw, Search, Trash2, X } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import DataTable, { type TableColumn } from "@/components/data-table";
import ActionConfirmDialog from "@/components/action-confirm-dialog";
import DashboardToast from "@/components/dashboard-toast";
import DashboardShell from "@/components/dashboard-shell";
import { auth, db } from "@/lib/firebase";
import type {
  NewsNotification,
  NotificationInput,
} from "@/models/notification";

type NotificationForm = NotificationInput;
const emptyForm: NotificationForm = {
  title: "",
  image: "",
  message: "",
  url: "",
};

function timestampToIso(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value) {
    const timestamp = value as { toDate?: () => Date };
    if (typeof timestamp.toDate === "function")
      return timestamp.toDate().toISOString();
  }
  return typeof value === "string" ? value : "";
}

async function uploadImage(file: File) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset)
    throw new Error("Cloudinary upload settings are missing.");
  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", uploadPreset);
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body },
  );
  const result = (await response.json()) as {
    secure_url?: string;
    error?: { message?: string };
  };
  if (!response.ok || !result.secure_url)
    throw new Error(result.error?.message || "Image upload failed.");
  return result.secure_url;
}

function previewText(value: string, maxLength = 65) {
  return value.length > maxLength
    ? `${value.slice(0, maxLength - 1).trim()}...`
    : value;
}

export default function NotificationDashboard() {
  const router = useRouter();
  const [rows, setRows] = useState<NewsNotification[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<NewsNotification | null>(null);
  const [form, setForm] = useState<NotificationForm>(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<"success" | "error">("success");
  const showSuccess = (message: string) => {
    setNoticeTone("success");
    setNotice(message);
  };
  const showError = (message: string) => {
    setNoticeTone("error");
    setNotice(message);
  };
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    destructive?: boolean;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const loadRows = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "notifications"));
      const items = snapshot.docs.map((item) => {
        const data = item.data();
        return {
          id: item.id,
          title: String(data.title ?? ""),
          image: String(data.image ?? ""),
          message: String(data.message ?? ""),
          url: String(data.url ?? ""),
          createdAt: timestampToIso(data.createdAt),
          updatedAt: timestampToIso(data.updatedAt),
        } satisfies NewsNotification;
      });
      items.sort((a, b) =>
        (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
      );
      setRows(items);
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "Unable to load notifications.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) router.replace("/login");
      else void loadRows();
    });
    return unsubscribe;
  }, [router]);

  useEffect(() => {
    return () => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const visibleRows = useMemo(() => {
    const normalized = search.toLowerCase();
    return rows.filter((row) =>
      [row.title, row.message, row.url].some((value) =>
        value.toLowerCase().includes(normalized),
      ),
    );
  }, [rows, search]);

  const resetForm = () => {
    setEditing(null);
    setForm(emptyForm);
    setFile(null);
    setPreview("");
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (row: NewsNotification) => {
    setEditing(row);
    setForm({
      title: row.title,
      image: row.image ?? "",
      message: row.message,
      url: row.url ?? "",
    });
    setFile(null);
    setPreview(row.image ?? "");
    setDialogOpen(true);
  };

  const columns: TableColumn<NewsNotification>[] = [
    {
      key: "title",
      label: "Title",
      render: (value) => (
        <span className="block max-w-[190px] truncate">{String(value)}</span>
      ),
    },
    {
      key: "image",
      label: "Image",
      render: (value, row) =>
        value ? (
          <img
            className="h-12 w-20 rounded-lg object-cover ring-1 ring-[#e4ecf4]"
            src={String(value)}
            alt={row.title}
          />
        ) : (
          <span className="text-[#91a0b3]">No image</span>
        ),
    },
    {
      key: "message",
      label: "Message",
      render: (value) => (
        <span className="block max-w-[260px] truncate">
          {previewText(String(value))}
        </span>
      ),
    },
    {
      key: "url",
      label: "URL",
      render: (value) =>
        value ? (
          <a
            className="block max-w-[190px] truncate text-[#3578aa] underline"
            href={String(value)}
            target="_blank"
            rel="noreferrer"
          >
            {String(value)}
          </a>
        ) : (
          <span className="text-[#91a0b3]">None</span>
        ),
    },
  ];

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const image = file ? await uploadImage(file) : form.image;
      const payload: NotificationInput = {
        ...form,
        title: form.title.trim(),
        message: form.message.trim(),
        url: form.url.trim(),
        image,
      };
      if (editing) {
        await updateDoc(doc(db, "notifications", editing.id), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "notifications"), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      setDialogOpen(false);
      resetForm();
      showSuccess(editing ? "Notification updated." : "Notification created.");
      await loadRows();
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Unable to save notification.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: NewsNotification) => {
    try {
      await deleteDoc(doc(db, "notifications", row.id));
      setRows((current) => current.filter((item) => item.id !== row.id));
      showSuccess("Notification deleted.");
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "Unable to delete notification.",
      );
    }
  };

  const handleSend = async (row: NewsNotification) => {
    setSendingId(row.id);
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : "";
      const response = await fetch(`/api/notifications/${row.id}/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: row.title,
          message: row.message,
          image: row.image,
          url: row.url,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Unable to send notification.");
      showSuccess(`Notification sent to ${result.topic}.`);
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Unable to send notification.",
      );
    } finally {
      setSendingId(null);
    }
  };

  const confirmDelete = (row: NewsNotification) =>
    setConfirmation({
      title: "Delete notification?",
      description: `“${row.title}” will be permanently deleted. This cannot be undone.`,
      confirmLabel: "Delete notification",
      destructive: true,
      onConfirm: () => handleDelete(row),
    });

  const confirmSend = (row: NewsNotification) =>
    setConfirmation({
      title: "Send push notification?",
      description: `Send “${row.title}” to mobile readers now?`,
      confirmLabel: "Send notification",
      onConfirm: () => handleSend(row),
    });

  return (
    <DashboardShell>
      <div className="mt-8 flex flex-col gap-5 md:-mt-[50px] md:min-h-[50px] md:pr-[260px]">
        <div>
          <h1 className="m-0 text-[28px] leading-tight font-medium text-[#1c2c41]">
            Manage Notification
          </h1>
          <p className="mt-2 text-sm text-[#8a9bb2]">
            Create and send messages to mobile readers.
          </p>
        </div>
      </div>
      <div className="mt-7 flex justify-end">
        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-full border-0 bg-[#172231] px-5 text-[13px] font-bold text-white"
          onClick={openCreate}
        >
          <Plus size={18} /> Add New Notification
        </button>
      </div>
      <section className="mt-6 min-h-[500px] rounded-[18px] border border-white/95 bg-white/85 px-4 py-5 shadow-[0_16px_32px_rgba(92,119,147,0.06)]">
        <div className="mb-5 flex flex-col gap-2.5 sm:flex-row">
          <label className="relative flex-1">
            <Search
              className="absolute top-1/2 left-4 -translate-y-1/2 text-[#8295ad]"
              size={19}
            />
            <input
              className="h-11 w-full rounded-full border border-[#e2eaf3] bg-[#fafcff]/80 pr-4 pl-12 text-[13px] outline-none"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search notifications..."
            />
          </label>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#e2eaf3] bg-[#f8fafd]/80 px-5 text-[13px] text-[#73869f]"
            onClick={() => setSearch("")}
          >
            <RotateCcw size={17} /> Reset
          </button>
        </div>
        {loading ? (
          <div className="px-12 py-12 text-center text-[#8395aa]">
            Loading notifications...
          </div>
        ) : (
          <DataTable
            rows={visibleRows}
            columns={columns}
            itemLabel="notifications"
            emptyMessage="No notifications found"
            renderActions={(row, close) => (
              <div>
                <button
                  className="flex w-full items-center gap-3 rounded-lg border-0 bg-transparent px-3 py-3 text-left text-sm text-[#40546d] hover:bg-[#f1f5fa] disabled:opacity-60"
                  disabled={sendingId === row.id}
                  onClick={() => {
                    close();
                    confirmSend(row);
                  }}
                >
                  <Bell size={16} />{" "}
                  {sendingId === row.id ? "Sending..." : "Send notification"}
                </button>
                <button
                  className="flex w-full items-center gap-3 rounded-lg border-0 bg-transparent px-3 py-3 text-left text-sm text-[#40546d] hover:bg-[#f1f5fa]"
                  onClick={() => {
                    close();
                    openEdit(row);
                  }}
                >
                  <Edit3 size={16} /> Edit
                </button>
                <button
                  className="flex w-full items-center gap-3 rounded-lg border-0 bg-transparent px-3 py-3 text-left text-sm text-[#b95252] hover:bg-[#f1f5fa]"
                  onClick={() => {
                    close();
                    confirmDelete(row);
                  }}
                >
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            )}
          />
        )}
      </section>
      {notice && <DashboardToast message={notice} tone={noticeTone} onDismiss={() => setNotice("")} />}
      {dialogOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#172231]/20 p-4"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setDialogOpen(false)
          }
        >
          <form
            className="grid max-h-[92vh] w-[min(100%,600px)] gap-4 overflow-y-auto rounded-[18px] bg-white p-6 shadow-[0_24px_70px_rgba(31,50,72,0.25)]"
            onSubmit={handleSubmit}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="m-0 text-xl font-semibold">
                  {editing ? "Edit Notification" : "Add New Notification"}
                </h2>
                <p className="mt-1 text-xs text-[#8495a9]">
                  Message content and delivery details
                </p>
              </div>
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-full border-0 bg-[#f3f6f9] text-[#64778e]"
                aria-label="Close"
                onClick={() => setDialogOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <label className="grid gap-1.5 text-xs font-bold text-[#536780]">
              Title
              <input
                className="h-11 rounded-lg border border-[#dfe8f1] px-3 text-sm font-normal text-[#19283c] outline-none focus:border-[#8eaccb]"
                required
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
              />
            </label>
            <label className="grid gap-2 rounded-xl border border-dashed border-[#d7e2ee] bg-[#f8fbff] p-4 text-xs font-bold text-[#536780]">
              Image (optional)
              <input
                className="text-xs text-[#6f829b] file:mr-3 file:rounded-full file:border-0 file:bg-[#172231] file:px-4 file:py-2 file:text-xs file:font-bold file:text-white"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  const selected = event.target.files?.[0] ?? null;
                  setFile(selected);
                  setPreview(
                    selected ? URL.createObjectURL(selected) : form.image,
                  );
                }}
              />
              <span className="font-medium text-[#8a9bb2]">
                The image uploads to Cloudinary when saved.
              </span>
            </label>
            {preview && (
              <img
                className="max-h-48 w-full rounded-xl object-cover"
                src={preview}
                alt="Notification preview"
              />
            )}
            <label className="grid gap-1.5 text-xs font-bold text-[#536780]">
              Message
              <input
                className="h-11 rounded-lg border border-[#dfe8f1] px-3 text-sm font-normal text-[#19283c] outline-none focus:border-[#8eaccb]"
                type="text"
                maxLength={240}
                required
                value={form.message}
                onChange={(event) =>
                  setForm({ ...form, message: event.target.value })
                }
              />
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-[#536780]">
              URL (optional)
              <input
                className="h-11 rounded-lg border border-[#dfe8f1] px-3 text-sm font-normal text-[#19283c] outline-none focus:border-[#8eaccb]"
                type="url"
                placeholder="https://"
                value={form.url}
                onChange={(event) =>
                  setForm({ ...form, url: event.target.value })
                }
              />
            </label>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="min-h-11 rounded-full border border-[#dfe8f1] bg-white px-5 text-sm font-bold text-[#536780]"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="min-h-11 rounded-full border-0 bg-[#172231] px-5 text-sm font-bold text-white disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editing
                    ? "Save changes"
                    : "Create notification"}
              </button>
            </div>
          </form>
        </div>
      )}
      {confirmation && (
        <ActionConfirmDialog
          {...confirmation}
          onCancel={() => setConfirmation(null)}
        />
      )}
    </DashboardShell>
  );
}
