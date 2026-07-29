import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [];

if (supabaseUrl) {
  remotePatterns.push({
    protocol: "https",
    hostname: new URL(supabaseUrl).hostname,
    pathname: "/storage/v1/object/public/avatars/**",
  });
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ["172.23.8.182"],
  images: {
    remotePatterns,
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
