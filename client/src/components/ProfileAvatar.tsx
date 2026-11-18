import { useEffect, useRef, useState } from "react";
import { UserRound } from "lucide-react";
import { supabase, supabaseUrl } from "@/lib/supabase";

function profilePhotoPath(value: string | null) {
  if (!value || !supabaseUrl) return null;
  try {
    const photoUrl = new URL(value);
    if (photoUrl.origin !== new URL(supabaseUrl).origin) return null;
    const match = photoUrl.pathname.match(/\/storage\/v1\/object\/(?:public|authenticated|sign)\/gm-avatars\/(.+)$/i);
    if (!match) return null;
    const segments = match[1].split("/").map((part) => decodeURIComponent(part));
    if (segments.length < 1 || segments.some((part) => !part || part === "." || part === ".." || part.includes("/") || part.includes("\\") || part.includes("\0"))) return null;
    return segments.join("/");
  } catch {
    return null;
  }
}

export function initials(value: string | null | undefined) {
  const parts = (value ?? "Guarda Municipal").trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "GM";
}

export default function ProfileAvatar({
  photoUrl,
  name,
  size = "default",
  className = "",
}: {
  photoUrl: string | null;
  name?: string | null;
  size?: "default" | "large";
  className?: string;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const activeImageUrl = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setImageUrl(null);
    const path = profilePhotoPath(photoUrl);
    if (!supabase || !path) return () => { cancelled = true; };

    void supabase.storage.from("gm-avatars").download(path).then(({ data }) => {
      if (!data || cancelled) return;
      const localUrl = URL.createObjectURL(data);
      if (cancelled) {
        URL.revokeObjectURL(localUrl);
        return;
      }
      activeImageUrl.current = localUrl;
      setImageUrl(localUrl);
    }).catch(() => undefined);

    return () => {
      cancelled = true;
      if (activeImageUrl.current) URL.revokeObjectURL(activeImageUrl.current);
      activeImageUrl.current = null;
    };
  }, [photoUrl]);

  return (
    <span className={`${className} profile-avatar profile-avatar-${size}`.trim()} aria-hidden="true">
      {imageUrl ? <img src={imageUrl} alt="" /> : name ? <strong>{initials(name)}</strong> : <UserRound size={size === "large" ? 34 : 19} />}
    </span>
  );
}
