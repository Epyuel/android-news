import type { Metadata } from "next";
import PublicLegalPage from "@/components/public-legal-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About Us | DANA HD",
  description: "Learn about DANA HD and its publisher.",
};

export default function AboutUsPage() {
  return (
    <PublicLegalPage
      field="publisherInfo"
      title="About Us"
      description="Learn more about DANA HD and the publisher behind it."
      label="About Us"
    />
  );
}
