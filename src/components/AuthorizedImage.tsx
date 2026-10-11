import { ImageOff } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchBlob } from "../api/http";

interface LoadedImage {
  src: string;
  objectUrl: string | null;
}

// Photos require the session token, which an <img> request cannot send, so the
// image is fetched as a blob and shown through an object URL.
export function AuthorizedImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [image, setImage] = useState<LoadedImage | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    fetchBlob(src)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setImage({ src, objectUrl });
      })
      .catch(() => {
        if (!cancelled) setImage({ src, objectUrl: null });
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (image?.src !== src) {
    return (
      <div
        className={`photo-placeholder ${className ?? ""}`}
        aria-busy="true"
      />
    );
  }
  if (!image.objectUrl) {
    return (
      <div className={`photo-placeholder ${className ?? ""}`}>
        <ImageOff size={24} aria-hidden="true" />
        <span className="small">No se pudo cargar la foto</span>
      </div>
    );
  }
  return <img src={image.objectUrl} alt={alt} className={className} />;
}
