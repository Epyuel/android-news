import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Administrators | Android News App",
    description: "Manage administrators for Android News App",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
    return (
        <html lang="en" className="h-full antialiased">
            <body className="flex min-h-full flex-col bg-[#f5f8fc] font-sans text-[#19283c]">
                {children}
            </body>
        </html>
    );
}
