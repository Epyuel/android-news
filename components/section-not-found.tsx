"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, FileQuestion } from "lucide-react";
import DashboardShell from "@/components/dashboard-shell";

type SectionNotFoundProps = { section: string };

export default function SectionNotFound({ section }: SectionNotFoundProps) {
    const router = useRouter();
    return <DashboardShell><section className="not-found-panel"><span className="not-found-icon"><FileQuestion size={28} /></span><h1>{section} page not found</h1><p>This section is not available yet.</p><button className="primary-button" onClick={() => router.push("/adminstrator")}><ArrowLeft size={17} />Back to administrators</button></section></DashboardShell>;
}
