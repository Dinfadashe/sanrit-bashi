import "server-only";

export type SniffedFileType = "image/jpeg" | "image/png" | "application/pdf";

/**
 * Reads the first few bytes of a file and checks them against known file
 * signatures ("magic numbers"). A client-reported MIME type (File.type) is
 * just a label the browser sends along — fully attacker-controlled and
 * proves nothing about what the file actually contains. This is the real
 * check: it looks at the bytes themselves.
 *
 * Returns null if the file doesn't match any recognized signature.
 */
export async function sniffFileType(file: File): Promise<SniffedFileType | null> {
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());

  // JPEG: FF D8 FF
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    head[0] === 0x89 &&
    head[1] === 0x50 &&
    head[2] === 0x4e &&
    head[3] === 0x47 &&
    head[4] === 0x0d &&
    head[5] === 0x0a &&
    head[6] === 0x1a &&
    head[7] === 0x0a
  ) {
    return "image/png";
  }

  // PDF: starts with "%PDF-"
  if (head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46 && head[4] === 0x2d) {
    return "application/pdf";
  }

  return null;
}