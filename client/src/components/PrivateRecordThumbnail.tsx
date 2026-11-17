import { useEffect, useRef, useState, type ReactNode } from "react";
import type { PrivateImageReference } from "@/lib/dashboard";
import { supabase } from "@/lib/supabase";

type PrivateRecordThumbnailProps = {
  photo: PrivateImageReference | null;
  fallback: ReactNode;
};

/**
 * Loads the private object with the signed-in Supabase session. The stored database URL is
 * never assigned to an image element; only a temporary browser-local blob URL is rendered.
 */
export default function PrivateRecordThumbnail({ photo, fallback }: PrivateRecordThumbnailProps) {
  const [source, setSource] = useState<string | null>(null);
  const activeObjectUrl = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSource(null);
    activeObjectUrl.current = null;

    if (!photo || !supabase) return () => { cancelled = true; };

    void (async () => {
      const { data, error } = await supabase.storage.from(photo.bucket).download(photo.path);
      if (error || !data) return;
      const localUrl = URL.createObjectURL(data);
      if (cancelled) {
        URL.revokeObjectURL(localUrl);
        return;
      }
      activeObjectUrl.current = localUrl;
      setSource(localUrl);
    })().catch(() => {
      // Photo failures are intentionally silent; the record remains readable with its icon.
    });

    return () => {
      cancelled = true;
      if (activeObjectUrl.current) URL.revokeObjectURL(activeObjectUrl.current);
      activeObjectUrl.current = null;
    };
  }, [photo?.bucket, photo?.path]);

  function handleImageError() {
    if (activeObjectUrl.current) URL.revokeObjectURL(activeObjectUrl.current);
    activeObjectUrl.current = null;
    setSource(null);
  }

  return (
    <span className="dashboard-record-artwork" aria-hidden="true">
      {source ? (
        <img
          className="dashboard-record-photo"
          src={source}
          alt=""
          loading="lazy"
          decoding="async"
          onError={handleImageError}
        />
      ) : (
        <span className="dashboard-record-artwork-fallback">{fallback}</span>
      )}
    </span>
  );
}
