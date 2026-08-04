import type { Metadata } from "next";
import "./globals.css";
import { AuthCodeHandler } from "@/components/auth-code-handler";

export const metadata: Metadata = {
  title: "SONA — Student directory",
  description: "Find and connect with verified students on SONA.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthCodeHandler />
        {children}
      </body>
    </html>
  );
}
