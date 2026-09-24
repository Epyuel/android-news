"use client";

import { useEffect, useMemo, useState } from "react";
import { Edit3, Plus, RotateCcw, Search, Trash2, X } from "lucide-react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useRouter } from "next/navigation";
import DataTable, { type TableColumn } from "@/components/data-table";
import DashboardShell from "@/components/dashboard-shell";
import { auth } from "@/lib/firebase";

type Administrator = {
  id: string;
  username: string;
  fullName: string;
  email: string;
};

type AdminForm = {
  username: string;
  fullName: string;
  email: string;
  password: string;
};

const emptyForm: AdminForm = {
  username: "",
  fullName: "",
  email: "",
  password: "",
};

export default function AdminDashboard() {
  const router = useRouter();
  const [rows, setRows] = useState<Administrator[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Administrator | null>(null);
  const [form, setForm] = useState<AdminForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const loadRows = async (user: User) => {
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Unable to load administrators.");
      setRows(result.users);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Unable to load administrators.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      void loadRows(user);
    });
    return unsubscribe;
  }, [router]);

  const filteredRows = useMemo(
    () =>
      rows.filter((row) =>
        Object.values(row).some((value) =>
          value.toLowerCase().includes(search.toLowerCase()),
        ),
      ),
    [rows, search],
  );

  const columns: TableColumn<Administrator>[] = [
    {
      key: "username",
      label: "Username",
      render: (value) => (
        <span className="inline-flex rounded-full bg-[#eff4f8] px-3.5 py-2 text-xs text-[#3f536b]">
          {String(value)}
        </span>
      ),
    },
    { key: "fullName", label: "Full Name" },
    { key: "email", label: "Email" },
  ];

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
    setSelectedId(null);
  };

  const openEdit = (row: Administrator) => {
    setEditing(row);
    setForm({
      username: row.username,
      fullName: row.fullName,
      email: row.email,
      password: "",
    });
    setDialogOpen(true);
    setSelectedId(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : "";
      const response = await fetch("/api/admin/users", {
        method: editing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(
          editing
            ? {
                id: editing.id,
                fullName: form.fullName,
                email: form.email,
                password: form.password || undefined,
              }
            : form,
        ),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Unable to save administrator.");
      setDialogOpen(false);
      setNotice(
        editing
          ? "Administrator updated successfully."
          : "Administrator created successfully.",
      );
      if (auth.currentUser) await loadRows(auth.currentUser);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Unable to save administrator.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: Administrator) => {
    if (!window.confirm(`Delete ${row.username}? This cannot be undone.`))
      return;
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : "";
      const response = await fetch(
        `/api/admin/users?id=${encodeURIComponent(row.id)}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Unable to delete administrator.");
      setRows((current) => current.filter((item) => item.id !== row.id));
      setSelectedId(null);
      setNotice("Administrator deleted successfully.");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Unable to delete administrator.",
      );
    }
  };

  return (
    <DashboardShell>
      <div className="mt-8 flex flex-col gap-5 md:-mt-[50px] md:min-h-[50px] md:pr-[260px]">
        <div>
          <h1 className="m-0 text-[28px] leading-tight font-medium tracking-tight text-[#1c2c41]">
            Manage Admin
          </h1>
          <p className="mt-2 text-sm text-[#8a9bb2]">
            Manage and oversee system administrators
          </p>
        </div>
      </div>

      <div className="mt-7 flex justify-end">
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2.5 rounded-full border-0 bg-[#172231] px-5 text-[13px] font-bold text-white shadow-[0_8px_17px_rgba(23,34,49,0.12)] hover:bg-[#25384e]"
          onClick={openCreate}
        >
          <Plus size={19} />
          Add New Admin
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
              aria-label="Search administrators"
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
            Loading administrators...
          </div>
        ) : (
          <DataTable
            rows={filteredRows}
            columns={columns}
            onAction={(row) =>
              setSelectedId((current) => (current === row.id ? null : row.id))
            }
            renderActions={(row) =>
              row.id === selectedId ? (
                <div className="absolute top-[58px] right-4 z-10 w-36 rounded-xl border border-[#e3ebf3] bg-white p-2 shadow-[0_15px_34px_rgba(54,79,107,0.16)]">
                  <button
                    className="flex w-full items-center gap-2 rounded-lg border-0 bg-transparent p-2.5 text-left text-xs text-[#40546d] hover:bg-[#f1f5fa]"
                    onClick={() => openEdit(row)}
                  >
                    <Edit3 size={15} />
                    Edit
                  </button>
                  <button
                    className="flex w-full items-center gap-2 rounded-lg border-0 bg-transparent p-2.5 text-left text-xs text-[#b95252] hover:bg-[#f1f5fa]"
                    onClick={() => void handleDelete(row)}
                  >
                    <Trash2 size={15} />
                    Delete
                  </button>
                </div>
              ) : null
            }
          />
        )}
      </section>

      {notice && (
        <button
          className="fixed right-4 bottom-4 left-4 z-50 rounded-xl border border-[#dbe6f1] bg-[#172231] px-4 py-3 text-xs text-white shadow-[0_12px_30px_rgba(23,34,49,0.2)] md:right-8 md:left-auto"
          onClick={() => setNotice("")}
        >
          {notice}
        </button>
      )}

      {dialogOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-transparent p-5"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setDialogOpen(false)
          }
        >
          <form
            className="grid w-[min(100%,430px)] gap-4 rounded-[18px] bg-white p-6 shadow-[0_24px_70px_rgba(31,50,72,0.25)]"
            onSubmit={handleSubmit}
          >
            <div className="mb-1 flex justify-between gap-4">
              <div>
                <h2 className="m-0 mb-1 text-xl font-semibold">
                  {editing ? "Edit Administrator" : "Add New Admin"}
                </h2>
                <p className="m-0 text-xs text-[#8495a9]">
                  {editing
                    ? "Update administrator account details."
                    : "Create an account through Firebase Admin."}
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
              Username
              <input
                className="h-10 rounded-lg border border-[#dfe8f1] px-3 text-[#19283c] outline-none focus:border-[#8eaccb]"
                required={!editing}
                disabled={Boolean(editing)}
                value={form.username}
                onChange={(event) =>
                  setForm({ ...form, username: event.target.value })
                }
              />
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-[#536780]">
              Full name
              <input
                className="h-10 rounded-lg border border-[#dfe8f1] px-3 text-[#19283c] outline-none focus:border-[#8eaccb]"
                required
                value={form.fullName}
                onChange={(event) =>
                  setForm({ ...form, fullName: event.target.value })
                }
              />
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-[#536780]">
              Email
              <input
                className="h-10 rounded-lg border border-[#dfe8f1] px-3 text-[#19283c] outline-none focus:border-[#8eaccb]"
                required
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
              />
            </label>
            {!editing && (
              <label className="grid gap-1.5 text-xs font-bold text-[#536780]">
                Temporary password
                <input
                  className="h-10 rounded-lg border border-[#dfe8f1] px-3 text-[#19283c] outline-none focus:border-[#8eaccb]"
                  required
                  minLength={6}
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    setForm({ ...form, password: event.target.value })
                  }
                />
              </label>
            )}
            {editing && (
              <label className="grid gap-1.5 text-xs font-bold text-[#536780]">
                New password <span className="font-medium">optional</span>
                <input
                  className="h-10 rounded-lg border border-[#dfe8f1] px-3 text-[#19283c] outline-none focus:border-[#8eaccb]"
                  minLength={6}
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    setForm({ ...form, password: event.target.value })
                  }
                />
              </label>
            )}
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2.5 rounded-full border-0 bg-[#172231] px-5 text-[13px] font-bold text-white shadow-[0_8px_17px_rgba(23,34,49,0.12)] hover:bg-[#25384e] disabled:cursor-not-allowed disabled:opacity-70"
              type="submit"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : editing
                  ? "Save changes"
                  : "Create administrator"}
            </button>
          </form>
        </div>
      )}
    </DashboardShell>
  );
}
