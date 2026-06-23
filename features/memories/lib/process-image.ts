import exifr from "exifr";

const MAX_EDGE = 2048; // longest-edge cap (architecture: viewing-resolution only)
const WEBP_QUALITY = 0.8;

export interface ProcessedImage {
  blob: Blob;
  width: number;
  height: number;
  takenAt: string | null; // EXIF DateTimeOriginal as ISO, or null
}

/**
 * Read the EXIF capture date from the ORIGINAL file, then resize to WebP. The EXIF read
 * MUST happen before re-encoding — drawing through a canvas strips metadata. Missing or
 * unparseable EXIF yields null (never throws). The canvas decode throws for formats the
 * browser can't decode (e.g. HEIC) so the upload queue can mark that file failed + retry.
 */
export async function processImage(file: File): Promise<ProcessedImage> {
  const takenAt = await readExifDate(file);

  // Decode via HTMLImageElement (works in every browser incl. headless software-WebGL;
  // createImageBitmap is unreliable under SwiftShader). HEIC and other undecodable inputs
  // reject here, so the upload queue marks that file failed + offers retry.
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const w0 = img.naturalWidth;
    const h0 = img.naturalHeight;
    const scale = Math.min(1, MAX_EDGE / Math.max(w0, h0));
    const width = Math.round(w0 * scale);
    const height = Math.round(h0 * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable.");
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", WEBP_QUALITY),
    );
    if (!blob) throw new Error("Failed to encode image to WebP.");

    return { blob, width, height, takenAt };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("The source image could not be decoded."));
    img.src = url;
  });
}

async function readExifDate(file: File): Promise<string | null> {
  try {
    const exif = await exifr.parse(file, ["DateTimeOriginal"]);
    const d = exif?.DateTimeOriginal;
    if (d instanceof Date && !Number.isNaN(d.getTime())) return d.toISOString();
    return null;
  } catch {
    return null; // no/!parseable EXIF is fine — the date is optional
  }
}
