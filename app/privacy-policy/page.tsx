import type { Metadata } from "next";
import PublicLegalPage from "@/components/public-legal-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacy Policy | DANA HD",
  description: "Read the DANA HD privacy policy.",
};

export default function PrivacyPolicyPage() {
  return (
    <PublicLegalPage
      field="privacyPolicy"
      title="Privacy Policy"
      description="How DANA HD handles information when you use the app and its services."
      label="Legal"
    />
  );
}
