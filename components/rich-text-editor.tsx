"use client";

import { useEffect, useRef } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Eraser,
  Heading1,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Table2,
  Underline as UnderlineIcon,
  Undo2,
  Unlink,
} from "lucide-react";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string, text: string) => void;
};

type ToolbarButtonProps = {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

function ToolbarButton({ label, active, onClick, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`grid h-8 w-8 place-items-center rounded-md border-0 transition-colors ${
        active
          ? "bg-[#172231] text-white"
          : "bg-transparent text-[#536780] hover:bg-[#e8eef6] hover:text-[#172231]"
      }`}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right", "justify"],
        defaultAlignment: "left",
      }),
      Link.configure({ openOnClick: false, autolink: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          "min-h-72 px-4 py-3 text-sm font-normal leading-7 text-[#26384f] outline-none [&_a]:text-[#2578b5] [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-[#d8e2ee] [&_blockquote]:pl-4 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-bold [&_strong]:font-bold [&_b]:font-bold [&_em]:italic [&_i]:italic [&_u]:underline [&_s]:line-through [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-[#f0f4f8] [&_pre]:p-3 [&_table]:w-full [&_td]:border [&_td]:border-[#d8e2ee] [&_td]:p-2 [&_th]:border [&_th]:border-[#d8e2ee] [&_th]:bg-[#f4f7fa] [&_th]:p-2",
      },
    },
    onUpdate: ({ editor: updatedEditor }) => {
      const html = updatedEditor.getHTML();
      onChangeRef.current(
        html,
        updatedEditor.getText().replace(/\s+/g, " ").trim(),
      );
    },
  });

  const toolbarState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      const alignment =
        currentEditor?.getAttributes("heading").textAlign ??
        currentEditor?.getAttributes("paragraph").textAlign ??
        "left";
      return {
        bold: currentEditor?.isActive("bold") ?? false,
        italic: currentEditor?.isActive("italic") ?? false,
        underline: currentEditor?.isActive("underline") ?? false,
        strike: currentEditor?.isActive("strike") ?? false,
        headingOne: currentEditor?.isActive("heading", { level: 2 }) ?? false,
        headingTwo: currentEditor?.isActive("heading", { level: 3 }) ?? false,
        quote: currentEditor?.isActive("blockquote") ?? false,
        code: currentEditor?.isActive("codeBlock") ?? false,
        bulletList: currentEditor?.isActive("bulletList") ?? false,
        orderedList: currentEditor?.isActive("orderedList") ?? false,
        link: currentEditor?.isActive("link") ?? false,
        alignment,
      };
    },
  });

  if (!editor) return null;

  const runStyle = (apply: () => void) => {
    const { empty, to } = editor.state.selection;
    apply();
    if (!empty) {
      editor.commands.setTextSelection(
        Math.min(to, editor.state.doc.content.size),
      );
      editor.commands.focus();
    }
  };

  const setLink = () => {
    const url = window.prompt("Paste the link URL");
    if (!url) return;
    runStyle(() =>
      editor
        .chain()
        .focus()
        .setLink({ href: url.startsWith("http") ? url : `https://${url}` })
        .run(),
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[#dfe8f1] bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-[#edf2f7] bg-[#f8fbff] p-2">
        <ToolbarButton label="Undo" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 size={16} />
        </ToolbarButton>
        <ToolbarButton label="Redo" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 size={16} />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-[#dfe8f1]" />
        <ToolbarButton label="Align left" active={toolbarState?.alignment === "left"} onClick={() => runStyle(() => editor.chain().focus().setTextAlign("left").run())}>
          <AlignLeft size={16} />
        </ToolbarButton>
        <ToolbarButton label="Align center" active={toolbarState?.alignment === "center"} onClick={() => runStyle(() => editor.chain().focus().setTextAlign("center").run())}>
          <AlignCenter size={16} />
        </ToolbarButton>
        <ToolbarButton label="Align right" active={toolbarState?.alignment === "right"} onClick={() => runStyle(() => editor.chain().focus().setTextAlign("right").run())}>
          <AlignRight size={16} />
        </ToolbarButton>
        <ToolbarButton label="Justify" active={toolbarState?.alignment === "justify"} onClick={() => runStyle(() => editor.chain().focus().setTextAlign("justify").run())}>
          <AlignJustify size={16} />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-[#dfe8f1]" />
        <ToolbarButton label="Bold" active={toolbarState?.bold} onClick={() => runStyle(() => editor.chain().focus().toggleBold().run())}>
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton label="Italic" active={toolbarState?.italic} onClick={() => runStyle(() => editor.chain().focus().toggleItalic().run())}>
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton label="Underline" active={toolbarState?.underline} onClick={() => runStyle(() => editor.chain().focus().toggleUnderline().run())}>
          <UnderlineIcon size={16} />
        </ToolbarButton>
        <ToolbarButton label="Strike" active={toolbarState?.strike} onClick={() => runStyle(() => editor.chain().focus().toggleStrike().run())}>
          <Strikethrough size={16} />
        </ToolbarButton>
        <ToolbarButton label="Heading 1" active={toolbarState?.headingOne} onClick={() => runStyle(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}>
          <Heading1 size={16} />
        </ToolbarButton>
        <ToolbarButton label="Heading 2" active={toolbarState?.headingTwo} onClick={() => runStyle(() => editor.chain().focus().toggleHeading({ level: 3 }).run())}>
          <Heading2 size={16} />
        </ToolbarButton>
        <ToolbarButton label="Quote" active={toolbarState?.quote} onClick={() => runStyle(() => editor.chain().focus().toggleBlockquote().run())}>
          <Quote size={16} />
        </ToolbarButton>
        <ToolbarButton label="Code block" active={toolbarState?.code} onClick={() => runStyle(() => editor.chain().focus().toggleCodeBlock().run())}>
          <Code2 size={16} />
        </ToolbarButton>
        <ToolbarButton label="Horizontal line" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Eraser size={16} />
        </ToolbarButton>
        <ToolbarButton label="Bulleted list" active={toolbarState?.bulletList} onClick={() => runStyle(() => editor.chain().focus().toggleBulletList().run())}>
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton label="Numbered list" active={toolbarState?.orderedList} onClick={() => runStyle(() => editor.chain().focus().toggleOrderedList().run())}>
          <ListOrdered size={16} />
        </ToolbarButton>
        <ToolbarButton label="Add link" active={toolbarState?.link} onClick={setLink}>
          <Link2 size={16} />
        </ToolbarButton>
        <ToolbarButton label="Remove link" onClick={() => runStyle(() => editor.chain().focus().unsetLink().run())}>
          <Unlink size={16} />
        </ToolbarButton>
        <ToolbarButton label="Insert table" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
          <Table2 size={16} />
        </ToolbarButton>
        <ToolbarButton label="Clear formatting" onClick={() => runStyle(() => editor.chain().focus().unsetAllMarks().clearNodes().run())}>
          <RemoveFormatting size={16} />
        </ToolbarButton>
        <input
          className="ml-1 h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
          type="color"
          title="Text color"
          aria-label="Text color"
          onChange={(event) => runStyle(() => editor.chain().focus().setColor(event.target.value).run())}
        />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
