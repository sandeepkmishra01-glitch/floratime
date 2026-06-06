import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FloraTime — Discover What's Blooming in DC",
  description:
    "Explore flowering plants observed across Washington, D.C. Powered by GBIF and community observations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
