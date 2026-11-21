import type { CSSProperties, ImgHTMLAttributes } from "react";

type NextImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string | { src: string };
  alt: string;
  fill?: boolean;
  priority?: boolean;
  fetchPriority?: "high" | "low" | "auto";
  quality?: number;
  unoptimized?: boolean;
};

/**
 * Minimal `next/image` replacement for the SPA. Images are served straight
 * from /public (already compressed by the project's image pipeline), so no
 * optimizer is needed. `fill` keeps the same absolute-fill behaviour.
 */
export default function Image({
  src,
  alt,
  fill,
  priority,
  fetchPriority,
  quality: _quality,
  unoptimized: _unoptimized,
  style,
  ...rest
}: NextImageProps) {
  const resolved = typeof src === "string" ? src : src.src;
  const fillStyle: CSSProperties | undefined = fill
    ? { position: "absolute", inset: 0, width: "100%", height: "100%", ...style }
    : style;
  const resolvedFetchPriority = fetchPriority ?? (priority ? "high" : undefined);

  return (
    <>
      {priority ? <link rel="preload" as="image" href={resolved} /> : null}
      <img
        src={resolved}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={resolvedFetchPriority}
        style={fillStyle}
        {...rest}
      />
    </>
  );
}
