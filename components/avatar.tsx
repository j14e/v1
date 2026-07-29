import Image from "next/image";

type AvatarProps = {
  name: string;
  url?: string | null;
  size?: "small" | "medium" | "large";
};

export function Avatar({ name, url, size = "medium" }: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <span className={`avatar avatar-${size}`} aria-label={`${name}'s photo`}>
      {url ? (
        <Image
          src={url}
          alt=""
          fill
          sizes={size === "large" ? "112px" : size === "small" ? "34px" : "58px"}
        />
      ) : (
        <span aria-hidden="true">{initials || "?"}</span>
      )}
    </span>
  );
}
