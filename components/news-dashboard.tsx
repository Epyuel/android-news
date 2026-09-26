"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Edit3,
  Eye,
  EyeOff,
  Maximize2,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import DataTable, { type TableColumn } from "@/components/data-table";
import ActionConfirmDialog from "@/components/action-confirm-dialog";
import DashboardToast from "@/components/dashboard-toast";
import DashboardShell from "@/components/dashboard-shell";
import RichTextEditor from "@/components/rich-text-editor";
import { auth, db } from "@/lib/firebase";
import type { Category } from "@/models/category";
import type { News, NewsContentType, NewsInput, NewsStatus } from "@/models/news";

type NewsForm = {
  title: string;
  date: string;
  categoryId: string;
  type: NewsContentType;
  image: string;
  description: string;
  descriptionText: string;
  status: NewsStatus;
};

const emptyForm: NewsForm = {
  title: "",
  date: new Date().toISOString().slice(0, 10),
  categoryId: "",
  type: "standard",
  image: "",
  description: "",
  descriptionText: "",
  status: "active",
};

const typeOptions: { label: string; value: NewsContentType }[] = [
  { label: "Standard Post", value: "standard" },
  { label: "Breaking News", value: "breaking" },
  { label: "Featured Story", value: "featured" },
];

function truncate(value: string, length = 88) {
  return value.length > length ? `${value.slice(0, length - 1).trim()}...` : value;
}

function formatDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(date);
}

function categoryNameFor(categoryId: string, categories: Category[]) {
  return (
    categories.find((category) => category.id === categoryId)?.name ??
    categories.find((category) => category.name === categoryId)?.name ??
    "Uncategorized"
  );
}

function StatusPill({ status }: { status: NewsStatus }) {
  const active = status === "active";
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${
        active
          ? "bg-[#e8f6ee] text-[#2d7c4f]"
          : "bg-[#f3f5f8] text-[#7a8ca3]"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export default function NewsDashboard() {
  const router = useRouter();
  const [rows, setRows] = useState<News[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detail, setDetail] = useState<News | null>(null);
  const [editing, setEditing] = useState<News | null>(null);
  const [form, setForm] = useState<NewsForm>(emptyForm);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
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
  const [categories, setCategories] = useState<Category[]>([]);
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
      const snapshot = await getDocs(
        query(collection(db, "news"), orderBy("date", "desc")),
      );
      setRows(
        snapshot.docs.map((item) => {
          const data = item.data() as Omit<News, "id" | "createdAt" | "updatedAt"> & {
            category?: string;
            createdAt?: { toDate: () => Date };
            updatedAt?: { toDate: () => Date };
          };
          return {
            ...data,
            categoryId: data.categoryId || data.category || "",
            id: item.id,
            createdAt: data.createdAt?.toDate().toISOString(),
            updatedAt: data.updatedAt?.toDate().toISOString(),
          };
        }),
      );
    } catch (error) {
      showError(error instanceof Error ? error.message : "Unable to load news.");
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const snapshot = await getDocs(collection(db, "categories"));
      setCategories(
        snapshot.docs
          .map((item) => ({
            id: item.id,
            name: String(item.data().name ?? "").trim(),
            image: String(item.data().image ?? ""),
          }))
          .filter((category) => category.name)
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    } catch {
      setCategories([]);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      void loadRows();
      void loadCategories();
    });
    return unsubscribe;
  }, [router]);

  const filteredRows = useMemo(() => {
    const query = search.toLowerCase();
    return rows.filter((row) =>
      [
        row.title,
        categoryNameFor(row.categoryId, categories),
        row.type,
        row.status,
        row.date,
        row.descriptionText,
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [rows, search, categories]);

  const columns: TableColumn<News>[] = [
    {
      key: "title",
      label: "Title",
      render: (value, row) => (
        <div className="grid gap-1">
          <span className="max-w-[220px] truncate text-[#24364c]">
            {String(value)}
          </span>
          <span className="max-w-[260px] truncate text-[11px] font-medium text-[#8a9bb2]">
            {truncate(row.descriptionText, 72)}
          </span>
        </div>
      ),
    },
    {
      key: "image",
      label: "Image",
      render: (value, row) => (
        <img
          className="h-12 w-20 rounded-lg object-cover ring-1 ring-[#e4ecf4]"
          src={String(value)}
          alt={row.title}
        />
      ),
    },
    {
      key: "date",
      label: "Date",
      render: (value) => formatDate(String(value)),
    },
    {
      key: "categoryId",
      label: "Category",
      render: (value) => categoryNameFor(String(value), categories),
    },
    {
      key: "type",
      label: "Type",
      render: (value) => (
        <span className="inline-flex rounded-full bg-[#eff4f8] px-3 py-1.5 text-xs text-[#3f536b] capitalize">
          {String(value)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (value) => <StatusPill status={value as NewsStatus} />,
    },
  ];

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, categoryId: categories[0]?.id ?? "" });
    setStep(1);
    setSelectedImage(null);
    setImagePreview("");
    setDialogOpen(true);
  };

  const openEdit = (row: News) => {
    setEditing(row);
    setForm({
      title: row.title,
      date: row.date,
      categoryId:
        categories.find((category) => category.id === row.categoryId)?.id ??
        categories.find((category) => category.name === row.categoryId)?.id ??
        "",
      type: row.type,
      image: row.image,
      description: row.description,
      descriptionText: row.descriptionText,
      status: row.status,
    });
    setStep(1);
    setSelectedImage(null);
    setImagePreview(row.image);
    setDialogOpen(true);
  };

  const refreshAfterChange = async () => {
    if (auth.currentUser) await loadRows();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }

    setSaving(true);
    try {
      const image = selectedImage
        ? await handleCloudinaryUpload(selectedImage)
        : form.image;
      const payload: NewsInput = {
        ...form,
        image,
        description: form.description || `<p>${form.descriptionText}</p>`,
        status: form.status || "active",
      };
      if (editing) {
        await updateDoc(doc(db, "news", editing.id), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "news"), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      setDialogOpen(false);
      showSuccess(editing ? "News updated successfully." : "News created successfully.");
      await refreshAfterChange();
    } catch (error) {
      showError(error instanceof Error ? error.message : "Unable to save news.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: News) => {
    try {
      await deleteDoc(doc(db, "news", row.id));
      setRows((current) => current.filter((item) => item.id !== row.id));
      showSuccess("News deleted successfully.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Unable to delete news.");
    }
  };

  const handleToggleStatus = async (row: News) => {
    const nextStatus: NewsStatus = row.status === "active" ? "inactive" : "active";
    try {
      await updateDoc(doc(db, "news", row.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      setRows((current) =>
        current.map((item) =>
          item.id === row.id ? { ...item, status: nextStatus } : item,
        ),
      );
      showSuccess(`News is now ${nextStatus}.`);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Unable to update status.");
    }
  };

  const handleNotify = async (row: News) => {
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : "";
      const response = await fetch(`/api/news/${row.id}/notify`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: row.title,
          descriptionText: row.descriptionText,
          image: row.image,
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
    }
  };

  const confirmDelete = (row: News) =>
    setConfirmation({
      title: "Delete news?",
      description: `“${row.title}” will be permanently deleted. This cannot be undone.`,
      confirmLabel: "Delete news",
      destructive: true,
      onConfirm: () => handleDelete(row),
    });

  const confirmNotify = (row: News) =>
    setConfirmation({
      title: "Send push notification?",
      description: `Send a notification about “${row.title}” to mobile readers?`,
      confirmLabel: "Send notification",
      onConfirm: () => handleNotify(row),
    });

  const handleCloudinaryUpload = async (file: File): Promise<string> => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) {
      throw new Error("Add Cloudinary cloud name and unsigned upload preset to use uploads.");
    }

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
      throw new Error(result.error?.message || "Cloudinary upload failed.");
    return result.secure_url;
  };

  return (
    <DashboardShell>
      <div className="mt-8 flex flex-col gap-5 md:-mt-[50px] md:min-h-[50px] md:pr-[260px]">
        <div>
          <h1 className="m-0 text-[28px] leading-tight font-medium tracking-tight text-[#1c2c41]">
            Manage News
          </h1>
          <p className="mt-2 text-sm text-[#8a9bb2]">
            Create, edit, publish, and notify mobile readers.
          </p>
        </div>
      </div>

      <div className="mt-7 flex justify-end">
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2.5 rounded-full border-0 bg-[#172231] px-5 text-[13px] font-bold text-white shadow-[0_8px_17px_rgba(23,34,49,0.12)] hover:bg-[#25384e]"
          onClick={openCreate}
        >
          <Plus size={19} />
          Add New News
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
              className="h-11 w-full rounded-full border border-[#e2eaf3] bg-[#fafcff]/80 pr-4 pl-12 text-[13px] text-[#19283c] outline-none focus:border-[#a9bfd9] focus:ring-4 focus:ring-[#7294b8]/10"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search..."
              aria-label="Search news"
            />
          </label>
          <button
            className="inline-flex h-11 items-center justify-center gap-2.5 rounded-full border border-[#e2eaf3] bg-[#f8fafd]/80 px-5 text-[13px] text-[#73869f]"
            onClick={() => setSearch("")}
          >
            <RotateCcw size={17} />
            Reset
          </button>
        </div>

        {loading ? (
          <div className="px-12 py-12 text-center text-[#8395aa]">
            Loading news...
          </div>
        ) : (
          <DataTable
            rows={filteredRows}
            columns={columns}
            itemLabel="news"
            emptyMessage="No news found"
            renderActions={(row, close) =>
                <div>
                  <button
                    className="flex w-full items-center gap-3 rounded-lg border-0 bg-transparent px-3 py-3 text-left text-sm text-[#40546d] hover:bg-[#f1f5fa]"
                    onClick={() => {
                      close();
                      setDetail(row);
                    }}
                  >
                    <Maximize2 size={15} />
                    Detail
                  </button>
                  <button
                    className="flex w-full items-center gap-3 rounded-lg border-0 bg-transparent px-3 py-3 text-left text-sm text-[#40546d] hover:bg-[#f1f5fa]"
                    onClick={() => {
                      close();
                      confirmNotify(row);
                    }}
                  >
                    <Bell size={15} />
                    Push notification
                  </button>
                  <button
                    className="flex w-full items-center gap-3 rounded-lg border-0 bg-transparent px-3 py-3 text-left text-sm text-[#40546d] hover:bg-[#f1f5fa]"
                    onClick={() => {
                      close();
                      void handleToggleStatus(row);
                    }}
                  >
                    {row.status === "active" ? <EyeOff size={15} /> : <Eye size={15} />}
                    {row.status === "active" ? "Make inactive" : "Make active"}
                  </button>
                  <button
                    className="flex w-full items-center gap-3 rounded-lg border-0 bg-transparent px-3 py-3 text-left text-sm text-[#40546d] hover:bg-[#f1f5fa]"
                    onClick={() => {
                      close();
                      openEdit(row);
                    }}
                  >
                    <Edit3 size={15} />
                    Edit
                  </button>
                  <button
                    className="flex w-full items-center gap-3 rounded-lg border-0 bg-transparent px-3 py-3 text-left text-sm text-[#b95252] hover:bg-[#f1f5fa]"
                    onClick={() => {
                      close();
                      confirmDelete(row);
                    }}
                  >
                    <Trash2 size={15} />
                    Delete
                  </button>
                </div>
            }
          />
        )}
      </section>

      {notice && <DashboardToast message={notice} tone={noticeTone} onDismiss={() => setNotice("")} />}

      {detail && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#172231]/15 p-5"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setDetail(null)
          }
        >
          <article className="max-h-[92vh] w-[min(100%,760px)] overflow-y-auto rounded-[18px] bg-white p-6 shadow-[0_24px_70px_rgba(31,50,72,0.25)]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <StatusPill status={detail.status} />
                <h2 className="mt-3 mb-1 text-2xl font-bold text-[#172231]">
                  {detail.title}
                </h2>
                <p className="text-sm text-[#8495a9]">
                  {formatDate(detail.date)} • {categoryNameFor(detail.categoryId, categories)}
                </p>
              </div>
              <button
                className="grid h-9 w-9 place-items-center rounded-full border-0 bg-[#f3f6f9] text-[#64778e]"
                aria-label="Close detail"
                onClick={() => setDetail(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="mb-5 flex h-36 shrink-0 justify-center overflow-hidden rounded-xl bg-[#f4f7fa] p-2">
              <img
                className="h-full max-w-full object-contain"
                src={detail.image}
                alt={detail.title}
              />
            </div>
            <div
              className="prose max-w-none text-[#26384f] [&_img]:max-w-full"
              dangerouslySetInnerHTML={{ __html: detail.description }}
            />
          </article>
        </div>
      )}

      {dialogOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#172231]/15 p-5"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setDialogOpen(false)
          }
        >
          <form
            className="grid max-h-[92vh] w-[min(100%,820px)] gap-5 overflow-y-auto rounded-[18px] bg-white p-6 shadow-[0_24px_70px_rgba(31,50,72,0.25)]"
            onSubmit={handleSubmit}
          >
            <div className="flex justify-between gap-4">
              <div>
                <h2 className="m-0 mb-1 text-xl font-semibold">
                  {editing ? "Edit News" : "Add News"}
                </h2>
                <p className="m-0 text-xs text-[#8495a9]">
                  Step {step} of 2: {step === 1 ? "News details" : "Description"}
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

            {step === 1 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-bold text-[#536780] md:col-span-2">
                  News title
                  <input
                    className="h-11 rounded-lg border border-[#dfe8f1] px-3 text-[#19283c] outline-none focus:border-[#8eaccb]"
                    required
                    value={form.title}
                    onChange={(event) =>
                      setForm({ ...form, title: event.target.value })
                    }
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-bold text-[#536780]">
                  News date
                  <input
                    className="h-11 rounded-lg border border-[#dfe8f1] px-3 text-[#19283c] outline-none focus:border-[#8eaccb]"
                    required
                    type="date"
                    value={form.date}
                    onChange={(event) =>
                      setForm({ ...form, date: event.target.value })
                    }
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-bold text-[#536780]">
                  Status
                  <select
                    className="h-11 rounded-lg border border-[#dfe8f1] px-3 text-[#19283c] outline-none focus:border-[#8eaccb]"
                    value={form.status}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        status: event.target.value as NewsStatus,
                      })
                    }
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
                <label className="grid gap-1.5 text-xs font-bold text-[#536780]">
                  Category
                  <select
                    className="h-11 rounded-lg border border-[#dfe8f1] px-3 text-[#19283c] outline-none focus:border-[#8eaccb]"
                    required
                    value={form.categoryId}
                    onChange={(event) =>
                      setForm({ ...form, categoryId: event.target.value })
                    }
                  >
                    <option value="" disabled>
                      {categories.length ? "Select a category" : "Create a category first"}
                    </option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-xs font-bold text-[#536780]">
                  Content type
                  <select
                    className="h-11 rounded-lg border border-[#dfe8f1] px-3 text-[#19283c] outline-none focus:border-[#8eaccb]"
                    value={form.type}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        type: event.target.value as NewsContentType,
                      })
                    }
                  >
                    {typeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 rounded-xl border border-dashed border-[#d7e2ee] bg-[#f8fbff] p-4 text-xs font-bold text-[#536780] md:col-span-2">
                  Image
                  <input
                    className="text-xs text-[#6f829b] file:mr-3 file:rounded-full file:border-0 file:bg-[#172231] file:px-4 file:py-2 file:text-xs file:font-bold file:text-white"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    disabled={saving}
                    required={!form.image && !selectedImage}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      setSelectedImage(file);
                      setImagePreview(URL.createObjectURL(file));
                    }}
                  />
                  <span className="font-medium text-[#8a9bb2]">
                    {selectedImage
                      ? `${selectedImage.name} will upload when you publish.`
                      : "The selected image uploads to Cloudinary when you publish."}
                  </span>
                </label>
                {(imagePreview || form.image) && (
                  <img
                    className="max-h-56 w-full rounded-xl object-cover md:col-span-2"
                    src={imagePreview || form.image}
                    alt="Selected news"
                  />
                )}
              </div>
            ) : (
              <div className="grid gap-2 text-xs font-bold text-[#536780]">
                <span>Description</span>
                <RichTextEditor
                  value={form.description}
                  onChange={(description, descriptionText) =>
                    setForm({ ...form, description, descriptionText })
                  }
                />
                <span className="font-medium text-[#8a9bb2]">
                  The rich HTML is saved as the description, and a plain text copy is
                  saved for push notifications and mobile previews.
                </span>
              </div>
            )}

            <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row">
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center gap-2.5 rounded-full border border-[#dfe8f1] bg-white px-5 text-[13px] font-bold text-[#536780]"
                onClick={() => (step === 1 ? setDialogOpen(false) : setStep(1))}
              >
                {step === 1 ? "Cancel" : "Back"}
              </button>
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2.5 rounded-full border-0 bg-[#172231] px-5 text-[13px] font-bold text-white shadow-[0_8px_17px_rgba(23,34,49,0.12)] hover:bg-[#25384e] disabled:cursor-not-allowed disabled:opacity-70"
                type="submit"
                disabled={saving}
              >
                {step === 1
                  ? "Continue"
                  : saving
                    ? "Saving..."
                    : editing
                      ? "Save changes"
                      : "Publish"}
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
