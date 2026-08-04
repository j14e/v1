import Image from "next/image";
import Link from "next/link";

type SonaLogoProps = {
  variant?: "header" | "dialog" | "page";
  linked?: boolean;
};

export function SonaLogo({ variant = "header", linked = true }: SonaLogoProps) {
  const usesTransparentLogo = variant === "header" || variant === "page";
  const logo = (
    <span className={`sona-logo-crop sona-logo-${variant}`}>
      <Image
        className="sona-logo-image"
        src={usesTransparentLogo ? "/sona-logo-transparent.png" : "/sona-logo.png"}
        alt=""
        width={usesTransparentLogo ? 1254 : 960}
        height={usesTransparentLogo ? 1254 : 960}
        sizes={variant === "page" ? "180px" : variant === "dialog" ? "82px" : "112px"}
        priority
      />
    </span>
  );

  if (!linked) {
    return <span className={`sona-logo-link sona-logo-link-${variant}`} aria-label="SONA">{logo}</span>;
  }

  return <Link className={`sona-logo-link sona-logo-link-${variant}`} href="/" aria-label="SONA home">{logo}</Link>;
}
