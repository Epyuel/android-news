import type { Metadata } from "next";
import { cache } from "react";
import { getAdminFirestore } from "@/lib/firebase-admin";

type SharedPost = { id: string; title: string; description: string; image: string; date: string };
type PageProps = { params: Promise<{ id: string }> };
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://android-news.vercel.app").replace(/\/$/, "");

const getPost = cache(async (id: string): Promise<SharedPost | null> => {
  try {
    const snapshot = await getAdminFirestore().collection("news").doc(id).get();
    if (!snapshot.exists) return null;
    const data = snapshot.data() ?? {};
    if (data.status === "inactive") return null;
    const description = String(data.descriptionText || data.description || "")
      .replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;/gi, " ")
      .replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/\s+/g, " ").trim();
    return {
      id,
      title: String(data.title || "DANA HD"),
      description,
      image: String(data.image || ""),
      date: String(data.date || ""),
    };
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);
  const url = `${siteUrl}/post/${encodeURIComponent(id)}`;
  const title = post?.title || "DANA HD | Shared news";
  const description = post?.description.slice(0, 240) || "Open this news post in the DANA HD app.";
  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    openGraph: {
      type: "article", url, title, description, siteName: "DANA HD",
      ...(post?.image ? { images: [{ url: post.image, alt: title }] } : {}),
    },
    twitter: {
      card: post?.image ? "summary_large_image" : "summary", title, description,
      ...(post?.image ? { images: [post.image] } : {}),
    },
  };
}

export default async function SharedPostPage({ params }: PageProps) {
  const { id } = await params;
  const post = await getPost(id);
  const appUrl = `androidnewsmobile:///?newsId=${encodeURIComponent(id)}`;

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl bg-white px-5 py-8 text-[#19283c] sm:px-8">
      <header className="mb-7 flex items-center justify-between border-b border-[#e5ebf2] pb-4">
        <a className="text-lg font-bold text-[#147fe8]" href="/">DANA HD</a>
        <a className="rounded-full bg-[#147fe8] px-4 py-2 text-sm font-semibold text-white" href={appUrl}>Open in app</a>
      </header>
      <article>
        {post?.image ? <img src={post.image} alt={post.title} className="mb-6 aspect-[16/9] w-full rounded-2xl object-cover" /> : null}
        <h1 className="text-3xl font-bold leading-tight">{post?.title || "Open this post in DANA HD"}</h1>
        {post?.date ? <p className="mt-3 text-sm text-[#718096]">{post.date}</p> : null}
        {post?.description ? <p className="mt-6 whitespace-pre-wrap text-base leading-7 text-[#35465d]">{post.description}</p> : <p className="mt-6 text-base leading-7 text-[#35465d]">This shared post is ready to open in the DANA HD app.</p>}
      </article>
    </main>
  );
}
