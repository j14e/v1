import Image from "next/image";
import Link from "next/link";

type SonaLogoProps = {
  variant?: "header" | "dialog" | "page";
  linked?: boolean;
};

export function SonaLogo({ variant = "header", linked = true }: SonaLogoProps) {
  const logo = (
    <span className={`sona-logo-crop sona-logo-${variant}`}>
      <Image
        className="sona-logo-image"
        src="/sona-logo.png"
        alt=""
        width={960}
        height={960}
        sizes={variant === "page" ? "180px" : variant === "dialog" ? "82px" : "112px"}
        priority
      />
    </span>
  );

  if (!linked) {
    return <span className="sona-logo-link" aria-label="SONA">{logo}</span>;
  }

  return <Link className="sona-logo-link" href="/" aria-label="SONA home">{logo}</Link>;
}
