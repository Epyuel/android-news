"use client";

import { ChevronLeft, ChevronRight, MoreVertical } from "lucide-react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

export type TableColumn<T> = {
  key: keyof T;
  label: string;
  render?: (value: T[keyof T], row: T) => ReactNode;
};

type DataTableProps<T extends { id: string }> = {
  rows: T[];
  columns: TableColumn<T>[];
  pageSize?: number;
  itemLabel?: string;
  renderActions?: (row: T, close: () => void) => ReactNode;
  emptyMessage?: string;
};

export default function DataTable<T extends { id: string }>({
  rows,
  columns,
  pageSize = 5,
  itemLabel = "records",
  renderActions,
  emptyMessage = "No records found",
}: DataTableProps<T>) {
  const [page, setPage] = useState(1);
  const [actionMenu, setActionMenu] = useState<{
    row: T;
    top: number;
    left: number;
    opensUp: boolean;
  } | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!actionMenu) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (
        !actionMenuRef.current?.contains(target) &&
        !target.closest("[data-row-action-trigger]")
      ) {
        setActionMenu(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActionMenu(null);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [actionMenu]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const visibleRows = useMemo(
    () => rows.slice((page - 1) * pageSize, page * pageSize),
    [page, pageSize, rows],
  );

  return (
    <>
      <div className="overflow-x-auto rounded-[14px] border border-[#e5ecf4] bg-white/45">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  className="h-[50px] bg-[#f0f5fa] px-5 text-xs font-bold text-[#72849d]"
                  key={String(column.key)}
                >
                  {column.label}
                </th>
              ))}
              <th className="h-[50px] w-20 bg-[#f0f5fa] px-5 text-center text-xs font-bold text-[#72849d]">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length ? (
              visibleRows.map((row) => (
                <tr key={row.id}>
                  {columns.map((column) => (
                    <td
                      className="h-[78px] border-t border-[#e7eef5] px-5 text-[13px] font-semibold text-[#40546d]"
                      key={String(column.key)}
                    >
                      {column.render
                        ? column.render(row[column.key], row)
                        : String(row[column.key])}
                    </td>
                  ))}
                  <td className="relative h-[78px] w-20 border-t border-[#e7eef5] px-5 text-center">
                    <button
                      className="inline-grid h-[39px] w-[39px] place-items-center rounded-full border-0 bg-[#f1f5f9] text-[#62758d] hover:bg-[#e6edf5] hover:text-[#172231]"
                      aria-label={`Actions for ${row.id}`}
                      aria-expanded={actionMenu?.row.id === row.id}
                      data-row-action-trigger
                      onClick={(event) => {
                        if (actionMenu?.row.id === row.id) {
                          setActionMenu(null);
                          return;
                        }

                        const bounds = event.currentTarget.getBoundingClientRect();
                        setActionMenu({
                          row,
                          top:
                            bounds.bottom + 250 > window.innerHeight
                              ? bounds.top - 8
                              : bounds.bottom + 8,
                          left: bounds.right,
                          opensUp: bounds.bottom + 250 > window.innerHeight,
                        });
                      }}
                    >
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  className="px-12 py-12 text-center text-[#8395aa]"
                  colSpan={columns.length + 1}
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {actionMenu && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={actionMenuRef}
              className={`fixed z-[70] w-52 -translate-x-full rounded-xl border border-[#e3ebf3] bg-white p-2.5 shadow-[0_15px_34px_rgba(54,79,107,0.16)] ${
                actionMenu.opensUp ? "-translate-y-full" : ""
              }`}
              style={{ top: actionMenu.top, left: actionMenu.left }}
            >
              {renderActions?.(actionMenu.row, () => {
                setActionMenu(null);
              })}
            </div>,
            document.body,
          )
        : null}

      <div className="flex flex-col items-start justify-between gap-3 px-2 pt-6 text-xs text-[#899ab0] sm:flex-row sm:items-center">
        <span>
          Showing {rows.length ? (page - 1) * pageSize + 1 : 0}-
          {Math.min(page * pageSize, rows.length)} of {rows.length} {itemLabel}
        </span>
        <div className="flex gap-1.5">
          <button
            className="grid h-8 w-8 place-items-center rounded-lg border border-[#e1e9f2] bg-white text-[#6f829b] disabled:cursor-not-allowed disabled:opacity-45"
            aria-label="Previous page"
            disabled={page === 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: pageCount }, (_, index) => index + 1).map(
            (number) => (
              <button
                key={number}
                className={`grid h-8 w-8 place-items-center rounded-lg border text-sm ${
                  page === number
                    ? "border-[#172231] bg-[#172231] text-white"
                    : "border-[#e1e9f2] bg-white text-[#6f829b]"
                }`}
                onClick={() => setPage(number)}
              >
                {number}
              </button>
            ),
          )}
          <button
            className="grid h-8 w-8 place-items-center rounded-lg border border-[#e1e9f2] bg-white text-[#6f829b] disabled:cursor-not-allowed disabled:opacity-45"
            aria-label="Next page"
            disabled={page === pageCount}
            onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </>
  );
}
