import { UserRound } from "lucide-react";
import { useMemo, useState } from "react";

export function ProfileAvatar({
  fullName,
  email,
  profilePhotoUrl,
  size = "md",
}: {
  fullName?: string | null;
  email?: string | null;
  profilePhotoUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const [failed, setFailed] = useState(false);
  const initials = useMemo(() => getInitials(fullName, email), [email, fullName]);
  const dimension =
    size === "sm"
      ? "h-8 w-8 text-xs"
      : size === "lg"
        ? "h-20 w-20 text-xl"
        : "h-10 w-10 text-sm";
  const iconSize = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-9 w-9" : "h-5 w-5";

  if (!profilePhotoUrl || failed) {
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-cgi-gradient font-semibold text-white shadow-glow ${dimension}`}
        title={initials}
      >
        <UserRound className={iconSize} style={{ color: "#241347" }} />
      </div>
    );
  }

  return (
    <img
      src={profilePhotoUrl}
      alt={fullName ? `Photo de profil de ${fullName}` : "Photo de profil"}
      className={`rounded-xl object-cover shadow-glow ${dimension}`}
      onError={() => setFailed(true)}
    />
  );
}

function getInitials(fullName?: string | null, email?: string | null) {
  const source = (fullName?.trim() || email?.trim() || "U").replace(/\s+/g, " ");
  const parts = source.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? "U"}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}
