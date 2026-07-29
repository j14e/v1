import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "v1 — University contact directory",
  description:
    "A simple contact directory for verified University of Auckland students.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
