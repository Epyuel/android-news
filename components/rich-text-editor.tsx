"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "react-quill-new/dist/quill.snow.css";
import type Quill from "quill";

const QuillEditor = dynamic(async () => {
  const [reactQuill, quillModule] = await Promise.all([
    import("react-quill-new"),
    import("quill"),
  ]);
  const Font = quillModule.default.import("formats/font") as { whitelist: string[] };
  Font.whitelist = ["sans-serif", "serif", "monospace", "cursive", "fantasy"];
  quillModule.default.register("formats/font", Font, true);
  return reactQuill.default;
}, {
  ssr: false,
  loading: () => <div className="min-h-72 animate-pulse rounded-md bg-[#f2f5f9]" />,
});

const formats = [
  "header", "bold", "italic", "underline", "strike", "script", "list", "indent",
  "align", "color", "background", "blockquote", "code-block", "link", "image", "video", "table", "font", "size",
];

const emojiOptions = [
  [0x1f600], [0x1f601], [0x1f602], [0x1f603], [0x1f604], [0x1f605], [0x1f606], [0x1f609],
  [0x1f60a], [0x1f60d], [0x1f618], [0x1f622], [0x1f62d], [0x1f621], [0x1f634], [0x1f914],
  [0x1f917], [0x1f92f], [0x1f970], [0x1f973], [0x1f929], [0x1f44d], [0x1f44e], [0x1f44f],
  [0x1f4aa], [0x1f64f], [0x1f91d], [0x1f44b], [0x2764, 0xfe0f], [0x1f499], [0x1f49a], [0x1f49b],
  [0x1f49c], [0x1f9e1], [0x1f494], [0x1f48c], [0x1f389], [0x1f38a], [0x2728], [0x1f31f],
  [0x1f525], [0x1f4a1], [0x1f4f1], [0x1f4bb], [0x1f3a7], [0x1f4da], [0x1f680], [0x2705],
  [0x274c], [0x1f31e], [0x1f308], [0x1f33f], [0x1f436], [0x1f431], [0x1f98b], [0x1f355],
  [0x1f354], [0x1f37f], [0x2615], [0x1f4b0], [0x1f4a7], [0x1f4a4], [0x2b50],
  [0x1f4af], [0x1f3c6], [0x1f947], [0x1f948], [0x1f3c5], [0x1f30d], [0x1f30e], [0x1f30f],
  [0x1f3e0], [0x1f3d9], [0x1f3d6], [0x1f3dd], [0x1f331], [0x1f332], [0x1f333], [0x1f340],
  [0x1f343], [0x1f335], [0x1f338], [0x1f33b], [0x1f347], [0x1f349], [0x1f34a], [0x1f34e],
  [0x1f353], [0x1f95d], [0x1f36a], [0x1f370], [0x1f363], [0x1f35c], [0x1f32e], [0x1f37a],
  [0x1f377], [0x1f9c3], [0x1f964], [0x1f697], [0x1f681], [0x1f682], [0x1f6f8], [0x1f6e9],
  [0x1f6a2], [0x1f6b2], [0x1f4a5], [0x1f4ab], [0x1f4a8], [0x1f4ac], [0x1f4ad], [0x1f4e3],
  [0x1f4cc], [0x1f4ce], [0x1f4a3], [0x1f52d], [0x1f50d], [0x1f512], [0x1f511], [0x1f4e6],
  [0x1f381], [0x1f48e], [0x1f9e9], [0x1f3ae], [0x1f3b2], [0x1f3af], [0x1f3b8], [0x1f3a8],
  [0x1f3ac], [0x1f3a4], [0x1f9d1], [0x1f467], [0x1f466], [0x1f469], [0x1f468], [0x1f9d3],
  [0x1f9d1, 0x200d, 0x1f4bb], [0x1f440], [0x1f64c], [0x1f91e], [0x1f918], [0x1f9e0], [0x1f9be],
  [0x1f438], [0x1f43c], [0x1f42c], [0x1f984], [0x1f419], [0x1f41d], [0x1f98e], [0x1f40b],
  [0x1f4a9], [0x1f47b], [0x1f47d], [0x1f916], [0x1f9ff], [0x1f921], [0x1f608], [0x1f47f],
].map((points) => String.fromCodePoint(...points));

type ToolbarContext = { quill: Quill };
type QuillTableBlot = { domNode: HTMLTableElement };
type QuillTableModule = {
  insertTable: (rows: number, columns: number) => void;
  deleteRow: () => void;
  deleteColumn: () => void;
  deleteTable: () => void;
  getTable: () => [QuillTableBlot | null, unknown, unknown, number];
};

function getEditorHtml(quill: Quill) {
  const semantic = new DOMParser().parseFromString(quill.getSemanticHTML(), "text/html");
  const liveTables = quill.root.querySelectorAll("table");
  const savedTables = semantic.body.querySelectorAll("table");
  liveTables.forEach((liveTable, index) => {
    const savedTable = savedTables[index];
    if (!savedTable) return;
    if (liveTable.style.width) savedTable.style.width = liveTable.style.width;
    if (liveTable.style.tableLayout) savedTable.style.tableLayout = liveTable.style.tableLayout;
    liveTable.querySelectorAll("td, th").forEach((liveCell, cellIndex) => {
      const savedCell = savedTable.querySelectorAll("td, th")[cellIndex];
      if (savedCell instanceof HTMLElement && liveCell instanceof HTMLElement && liveCell.style.width) {
        savedCell.style.width = liveCell.style.width;
      }
    });
  });
  return semantic.body.innerHTML;
}

function installTableResizing(quill: Quill, onResize: () => void) {
  const onPointerDown = (event: PointerEvent) => {
    const cell = Array.from(quill.root.querySelectorAll<HTMLTableCellElement>("td, th")).find((candidate) => {
      const bounds = candidate.getBoundingClientRect();
      return event.clientY >= bounds.top && event.clientY <= bounds.bottom
        && event.clientX >= bounds.right - 9 && event.clientX <= bounds.right + 4;
    });
    if (!cell) return;
    const bounds = cell.getBoundingClientRect();
    const table = cell.closest<HTMLTableElement>("table");
    if (!table) return;

    const column = cell.cellIndex;
    const firstRow = table.rows[0];
    if (!firstRow || firstRow.cells.length < 2) return;
    const neighborColumn = column < firstRow.cells.length - 1 ? column + 1 : column - 1;
    const rows = Array.from(table.rows);
    const columnWidths = Array.from(firstRow.cells).map((item) => item.getBoundingClientRect().width);
    const startX = event.clientX;
    const startWidth = columnWidths[column] ?? bounds.width;
    const neighborWidth = columnWidths[neighborColumn];
    const startTableWidth = table.getBoundingClientRect().width;
    const cellsByColumn = columnWidths.map((_, index) => rows.map((row) => row.cells[index]).filter((item): item is HTMLTableCellElement => Boolean(item)));
    table.style.tableLayout = "fixed";
    table.style.width = `${startTableWidth}px`;
    columnWidths.forEach((width, index) => {
      cellsByColumn[index].forEach((item) => { item.style.width = `${width}px`; });
    });
    quill.root.classList.add("is-table-resizing");
    try {
      cell.setPointerCapture(event.pointerId);
    } catch {
      // Document-level pointer listeners remain as a fallback.
    }
    event.preventDefault();
    event.stopPropagation();

    const onPointerMove = (moveEvent: PointerEvent) => {
      const delta = Math.max(48 - startWidth, Math.min(neighborWidth - 48, moveEvent.clientX - startX));
      [column, neighborColumn].forEach((index) => {
        const width = columnWidths[index] + (index === column ? delta : -delta);
        cellsByColumn[index].forEach((item) => { item.style.width = `${width}px`; });
      });
    };
    const onPointerUp = () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerUp);
      quill.root.classList.remove("is-table-resizing");
      onResize();
      quill.update("user");
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp, { once: true });
    document.addEventListener("pointercancel", onPointerUp, { once: true });
  };

  quill.root.addEventListener("pointerdown", onPointerDown, true);
  return () => quill.root.removeEventListener("pointerdown", onPointerDown, true);
}

type RichTextEditorProps = {
  value: string;
  onChange: (html: string, text: string) => void;
};

export default function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const onChangeRef = useRef(onChange);
  const resizeCleanupRef = useRef<(() => void) | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [emojiPickerPosition, setEmojiPickerPosition] = useState({ left: 8, top: 120 });
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => () => resizeCleanupRef.current?.(), []);
  const ensureTableResizing = useCallback((quill: Quill) => {
    resizeCleanupRef.current ??= installTableResizing(quill, () => {
      onChangeRef.current(getEditorHtml(quill), quill.getText().replace(/\s+/g, " ").trim());
    });
  }, []);
  const modules = useMemo(() => ({
    table: true,
    toolbar: {
      container: [
        [{ formatStyle: [false, "Title", "Subtitle", "Heading 1", "Heading 2", "Heading 3", "Quote", "Code"] }],
        [{ font: [false, "sans-serif", "serif", "monospace", "cursive", "fantasy"] }, { size: ["small", false, "large", "huge"] }],
        ["bold", "italic", "underline", "strike"],
        [{ script: "sub" }, { script: "super" }],
        [{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
        [{ indent: "-1" }, { indent: "+1" }],
        [{ align: [] }],
        [{ color: [] }, { background: [] }],
        ["blockquote", "code-block"],
        ["link", "image", "video", "table", { emoji: ["😀", "😂", "😊", "❤️", "🎉", "✨", "📱", "🔥", "✅", "⭐"] }],
        [{ emoji: emojiOptions }],
        ["emojiPicker"],
        ["deleteRow", "deleteColumn", "deleteTable"],
        ["clean"],
      ],
      handlers: {
        formatStyle(this: ToolbarContext, style: string | false) {
          const quill = this.quill;
          quill.format("header", false, "user");
          quill.format("blockquote", false, "user");
          quill.format("code-block", false, "user");
          if (style === "Title") quill.format("header", 1, "user");
          if (style === "Subtitle") quill.format("header", 2, "user");
          if (style === "Heading 1") quill.format("header", 1, "user");
          if (style === "Heading 2") quill.format("header", 2, "user");
          if (style === "Heading 3") quill.format("header", 3, "user");
          if (style === "Quote") quill.format("blockquote", true, "user");
          if (style === "Code") quill.format("code-block", true, "user");
        },
        table(this: ToolbarContext) {
          const quill = this.quill;
          (quill.getModule("table") as QuillTableModule).insertTable(3, 3);
          quillRef.current = quill;
          ensureTableResizing(quill);
        },
        deleteRow(this: ToolbarContext) {
          ensureTableResizing(this.quill);
          (this.quill.getModule("table") as QuillTableModule).deleteRow();
        },
        deleteColumn(this: ToolbarContext) {
          ensureTableResizing(this.quill);
          (this.quill.getModule("table") as QuillTableModule).deleteColumn();
        },
        deleteTable(this: ToolbarContext) {
          ensureTableResizing(this.quill);
          (this.quill.getModule("table") as QuillTableModule).deleteTable();
        },
        emojiPicker(this: ToolbarContext) {
          quillRef.current = this.quill;
          const button = wrapperRef.current?.querySelector<HTMLElement>(".ql-emojiPicker");
          const wrapper = wrapperRef.current?.getBoundingClientRect();
          const buttonBounds = button?.getBoundingClientRect();
          if (wrapper && buttonBounds) {
            setEmojiPickerPosition({
              left: Math.max(8, buttonBounds.left - wrapper.left),
              top: buttonBounds.bottom - wrapper.top + 6,
            });
          }
          setEmojiPickerOpen((open) => !open);
        },
        emoji(this: ToolbarContext, emoji: string) {
          const selection = this.quill.getSelection(true);
          if (!selection || !emoji) return;
          this.quill.insertText(selection.index, emoji, "user");
          this.quill.setSelection(selection.index + emoji.length, 0, "silent");
        },
      },
    },
  }), [ensureTableResizing]);

  return (
    <div ref={wrapperRef} className="rich-text-editor relative overflow-hidden rounded-xl border border-[#dfe8f1] bg-white">
      <QuillEditor
        theme="snow"
        value={value}
        useSemanticHTML
        onChange={(html, _delta, _source, editor) => {
          onChange(html, editor.getText().replace(/\s+/g, " ").trim());
        }}
        modules={modules}
        formats={formats}
        placeholder="Write content..."
      />
      {emojiPickerOpen ? (
        <div
          aria-label="Emoji picker"
          className="absolute z-20 grid max-h-64 grid-cols-6 gap-1 overflow-y-auto rounded-lg border border-[#dfe8f1] bg-white p-2 shadow-lg"
          style={emojiPickerPosition}
        >
          {emojiOptions.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-label={`Insert ${emoji}`}
              className="grid size-9 place-items-center rounded-md text-xl hover:bg-[#eef4fa]"
              onClick={() => {
                const quill = quillRef.current;
                const selection = quill?.getSelection(true);
                if (quill && selection) {
                  quill.insertText(selection.index, emoji, "user");
                  quill.setSelection(selection.index + emoji.length, 0, "silent");
                }
                setEmojiPickerOpen(false);
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
