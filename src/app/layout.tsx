import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Mantle Alpha & Risk Monitor",
  description: "Read-only AI risk monitor for Mantle on-chain targets."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
