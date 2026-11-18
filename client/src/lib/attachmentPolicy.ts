export const MAX_ANEXO_BYTES = 1_048_576;

export type TipoAnexoOcorrencia = "image" | "video" | "document";

const MIME_POR_EXTENSAO: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  avif: "image/avif",
  bmp: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  m4v: "video/x-m4v",
  avi: "video/x-msvideo",
  "3gp": "video/3gpp",
  "3g2": "video/3gpp2",
  ogv: "video/ogg",
  mkv: "video/x-matroska",
  pdf: "application/pdf",
};

const MIMES_ACEITOS = new Set(Object.values(MIME_POR_EXTENSAO));

/** Normaliza MIME declarado pelo navegador ou infere-o por uma extensão permitida. */
export function mimetypeAnexo(file: Pick<File, "name" | "type">): string | null {
  const declarado = file.type.trim().toLowerCase().split(";")[0];
  if (MIMES_ACEITOS.has(declarado)) return declarado;
  if (declarado && declarado !== "application/octet-stream") return null;

  const extensao = file.name.toLowerCase().match(/\.([a-z0-9]{1,8})$/)?.[1];
  return extensao ? MIME_POR_EXTENSAO[extensao] ?? null : null;
}

export function classificarAnexo(file: Pick<File, "name" | "type">): TipoAnexoOcorrencia | null {
  const mime = mimetypeAnexo(file);
  if (!mime) return null;
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "document";
  return null;
}

export const ACCEPT_ANEXOS_COMPLETO = [
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif", "image/avif", "image/bmp", "image/tiff",
  "video/mp4", "video/quicktime", "video/webm", "video/x-m4v", "video/x-msvideo", "video/3gpp", "video/3gpp2", "video/ogg", "video/x-matroska",
  "application/pdf",
  ".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif", ".avif", ".bmp", ".tif", ".tiff",
  ".mp4", ".mov", ".webm", ".m4v", ".avi", ".3gp", ".3g2", ".ogv", ".mkv", ".pdf",
].join(",");

export const ACCEPT_ANEXOS_RAPIDO = [
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif", "image/avif", "image/bmp", "image/tiff",
  ".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif", ".avif", ".bmp", ".tif", ".tiff",
].join(",");
