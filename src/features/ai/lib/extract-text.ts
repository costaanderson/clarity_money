import * as pdfParseModule from "pdf-parse";
// pdf-parse pode exportar como default ou named dependendo do bundler
const pdfParse: (buf: Buffer) => Promise<{ text: string }> =
  (pdfParseModule as unknown as { default?: (buf: Buffer) => Promise<{ text: string }> }).default ??
  (pdfParseModule as unknown as (buf: Buffer) => Promise<{ text: string }>);

/**
 * Extrai texto de um Buffer de arquivo.
 * Suporta: .txt, .md (texto direto), .pdf (via pdf-parse).
 * Retorna null para formatos não suportados (imagens, etc.).
 */
export async function extractText(
  buffer: Buffer,
  mime: string | null | undefined,
): Promise<string | null> {
  const m = (mime ?? "").toLowerCase();

  if (m === "text/plain" || m === "text/markdown" || m === "") {
    const text = buffer.toString("utf-8").trim();
    return text.length > 0 ? text : null;
  }

  if (m === "application/pdf") {
    try {
      const result = await pdfParse(buffer);
      const text = result.text.trim();
      return text.length > 0 ? text : null;
    } catch {
      return null;
    }
  }

  return null;
}
