import type { Metadata } from "next";
import "./globals.css";
import { AuthCodeHandler } from "@/components/auth-code-handler";

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
      <body>
        <AuthCodeHandler />
        {children}
      </body>
    </html>
  );
}
