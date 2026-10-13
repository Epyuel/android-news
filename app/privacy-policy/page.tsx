import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { getAdminFirestore } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Privacy Policy | DANA HD",
  description: "Read the DANA HD privacy policy.",
};

type HtmlNode = { tag: string; attrs: Record<string, string>; children: Array<HtmlNode | string> };
const voidTags = new Set(["br", "hr"]);
const allowedTags = new Set([
  "p", "div", "br", "hr", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li",
  "blockquote", "strong", "b", "em", "i", "u", "s", "del", "code", "pre", "a", "span",
]);

function decodeHtml(value: string) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, code: string) => {
    if (code[0] === "#") {
      const point = code[1]?.toLowerCase() === "x" ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10);
      return Number.isFinite(point) && point >= 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
    }
    return ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0" } as Record<string, string>)[code.toLowerCase()] ?? entity;
  });
}

function parsePolicyHtml(html: string): Array<HtmlNode | string> {
  const root: HtmlNode = { tag: "root", attrs: {}, children: [] };
  const stack = [root];
  let blockedTag = "";
  for (const token of html.match(/<!--[\s\S]*?-->|<\/?[a-z][^>]*>|[^<]+/gi) ?? []) {
    if (token.startsWith("<!--")) continue;
    if (blockedTag) {
      if (new RegExp(`^<\\s*\\/${blockedTag}\\s*>`, "i").test(token)) blockedTag = "";
      continue;
    }
    if (token.startsWith("</")) {
      const tag = token.match(/^<\/\s*([\w:-]+)/)?.[1]?.toLowerCase();
      if (!tag) continue;
      for (let index = stack.length - 1; index > 0; index--) {
        if (stack[index].tag === tag) {
          stack.length = index;
          break;
        }
      }
      continue;
    }
    if (!token.startsWith("<")) {
      stack[stack.length - 1].children.push(decodeHtml(token));
      continue;
    }
    const tag = token.match(/^<\s*([\w:-]+)/)?.[1]?.toLowerCase();
    if (!tag) continue;
    if (["script", "style", "iframe", "object", "svg"].includes(tag)) {
      if (!/\/\s*>$/.test(token)) blockedTag = tag;
      continue;
    }
    const attrs: Record<string, string> = {};
    const attrSource = token.slice(token.indexOf(tag) + tag.length, token.lastIndexOf(">"));
    const attrPattern = /([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let match: RegExpExecArray | null;
    while ((match = attrPattern.exec(attrSource))) {
      const key = match[1].toLowerCase();
      if (key === "style" || key === "class" || key === "href" || key === "data-mobile-button") {
        attrs[key] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? "");
      }
    }
    const node: HtmlNode = { tag, attrs, children: [] };
    stack[stack.length - 1].children.push(node);
    if (!voidTags.has(tag) && !/\/\s*>$/.test(token)) stack.push(node);
  }
  return root.children;
}

function safeStyle(node: HtmlNode): CSSProperties {
  const style: CSSProperties = {};
  for (const declaration of (node.attrs.style ?? "").split(";")) {
    const [rawKey, ...rawValue] = declaration.split(":");
    const key = rawKey?.trim().toLowerCase();
    const value = rawValue.join(":").trim();
    if (key === "text-align" && ["left", "center", "right", "justify"].includes(value)) style.textAlign = value as CSSProperties["textAlign"];
    if (key === "color" && /^(#[\da-f]{3,8}|rgba?\([\d.%\s,]+)|[a-z]{3,20})$/i.test(value)) style.color = value;
    if (key === "background-color" && /^(#[\da-f]{3,8}|rgba?\([\d.%\s,]+)|[a-z]{3,20})$/i.test(value)) style.backgroundColor = value;
    if (key === "font-size" && /^\d+(\.\d+)?(px|em|rem|%)$/i.test(value)) style.fontSize = value;
    if (key === "font-family" && /^(sans-serif|serif|monospace|cursive|fantasy)(\s*,\s*(sans-serif|serif|monospace|cursive|fantasy))*$/i.test(value)) style.fontFamily = value;
  }
  const classes = node.attrs.class ?? "";
  const align = classes.match(/(?:^|\s)ql-align-(left|center|right|justify)(?:\s|$)/)?.[1];
  const font = classes.match(/(?:^|\s)ql-font-(sans-serif|serif|monospace)(?:\s|$)/)?.[1];
  const size = classes.match(/(?:^|\s)ql-size-(small|large|huge)(?:\s|$)/)?.[1];
  if (!style.textAlign && align) style.textAlign = align as CSSProperties["textAlign"];
  if (!style.fontFamily && font) style.fontFamily = font;
  if (!style.fontSize && size) style.fontSize = { small: "0.85em", large: "1.5em", huge: "2.5em" }[size];
  return style;
}

function safeHref(value: string) {
  return /^(https?:|mailto:|tel:)/i.test(value) ? value : undefined;
}

function renderNodes(nodes: Array<HtmlNode | string>, keyPrefix = "policy"): ReactNode[] {
  return nodes.map((node, index) => {
    if (typeof node === "string") return node;
    const key = `${keyPrefix}-${index}`;
    const children = renderNodes(node.children, key);
    if (!allowedTags.has(node.tag)) return <span key={key}>{children}</span>;
    if (node.tag === "br" || node.tag === "hr") return node.tag === "br" ? <br key={key} /> : <hr key={key} className="my-6 border-0 border-t border-[#e5ebf2]" />;
    if (node.tag === "a") {
      const href = safeHref(node.attrs.href ?? "");
      if (!href) return <span key={key}>{children}</span>;
      const button = node.attrs["data-mobile-button"] === "true";
      return <a key={key} href={href} target="_blank" rel="noreferrer" style={safeStyle(node)} className={button ? "my-3 inline-flex min-h-12 items-center justify-center rounded-full bg-[#147fe8] px-7 py-3 font-semibold text-white no-underline shadow-sm transition hover:bg-[#096bc9]" : "font-medium text-[#147fe8] underline decoration-[#9cc9f4] underline-offset-4 hover:text-[#075eae]"}>{children}</a>;
    }
    return createPolicyElement(node, children, key);
  });
}

function createPolicyElement(node: HtmlNode, children: ReactNode[], key: string) {
  const props = { key, style: safeStyle(node) };
  switch (node.tag) {
    case "p": return <p {...props} className="mb-5 last:mb-0">{children}</p>;
    case "div": return <div {...props}>{children}</div>;
    case "span": return <span {...props}>{children}</span>;
    case "h1": return <h1 {...props} className="mb-4 mt-8 text-3xl leading-tight font-bold first:mt-0">{children}</h1>;
    case "h2": return <h2 {...props} className="mb-3 mt-7 text-2xl leading-tight font-bold first:mt-0">{children}</h2>;
    case "h3": return <h3 {...props} className="mb-3 mt-6 text-xl leading-snug font-bold first:mt-0">{children}</h3>;
    case "h4": case "h5": case "h6": return <h4 {...props} className="mb-2 mt-5 text-lg leading-snug font-bold first:mt-0">{children}</h4>;
    case "ul": return <ul {...props} className="mb-5 list-disc space-y-2 pl-6">{children}</ul>;
    case "ol": return <ol {...props} className="mb-5 list-decimal space-y-2 pl-6">{children}</ol>;
    case "li": return <li {...props}>{children}</li>;
    case "blockquote": return <blockquote {...props} className="my-6 border-l-[3px] border-[#147fe8] bg-[#f5f9ff] px-5 py-3 text-[#526780]">{children}</blockquote>;
    case "strong": case "b": return <strong {...props}>{children}</strong>;
    case "em": case "i": return <em {...props}>{children}</em>;
    case "u": return <u {...props}>{children}</u>;
    case "s": case "del": return <del {...props}>{children}</del>;
    case "code": return <code {...props}>{children}</code>;
    case "pre": return <pre {...props} className="my-5 overflow-x-auto rounded-xl bg-[#f2f6fa] p-4 text-sm">{children}</pre>;
    default: return <span key={key}>{children}</span>;
  }
}

async function getPrivacyPolicy() {
  try {
    const snapshot = await getAdminFirestore().collection("appSettings").doc("legal").get();
    const html = snapshot.data()?.privacyPolicy;
    return typeof html === "string" ? html : "";
  } catch {
    return "";
  }
}

export default async function PrivacyPolicyPage() {
  const policy = await getPrivacyPolicy();
  return (
    <main className="min-h-screen bg-[#f5f8fc] text-[#19283c]">
      <header className="border-b border-white/10 bg-[#102238] text-white">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="text-sm font-bold tracking-wide">DANA HD</Link>
          <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/85 transition hover:bg-white/10 hover:text-white">
            <ArrowLeft size={16} /> Home
          </Link>
        </div>
      </header>
      <section className="mx-auto max-w-5xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
        <div className="mb-8 max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#e8f2ff] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#147fe8]">
            <ShieldCheck size={15} /> DANA HD · Legal
          </div>
          <h1 className="m-0 text-3xl leading-tight font-semibold sm:text-4xl">Privacy Policy</h1>
          <p className="mb-0 mt-3 text-base leading-7 text-[#6c7e94]">How DANA HD handles information when you use the app and its services.</p>
        </div>
        <article className="rounded-2xl border border-[#e5ebf2] bg-white px-5 py-7 shadow-[0_12px_34px_rgba(32,55,83,0.06)] sm:px-9 sm:py-10">
          {policy ? (
            <div className="privacy-policy-content max-w-none text-[15px] leading-7 text-[#35465d]">{renderNodes(parsePolicyHtml(policy))}</div>
          ) : (
            <p className="m-0 text-sm leading-6 text-[#718096]">The privacy policy is not available right now. Please check back later.</p>
          )}
        </article>
        <footer className="pt-6 text-center text-xs text-[#8a9bb2]">DANA HD</footer>
      </section>
    </main>
  );
}
