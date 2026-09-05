/**
 * Extrai texto de um Buffer de arquivo.
 * Suporta: .txt, .md (texto direto), .pdf (via pdf-parse).
 * Retorna null para formatos não suportados (imagens, etc.).
 *
 * NOTA: pdf-parse é importado dinamicamente para evitar que o Vite bundle
 * o pdfjs-dist junto ao código do servidor. pdfjs-dist usa DOMMatrix (API
 * de browser) que não existe no Node.js da Vercel e derrubaria o processo.
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
      // Import dinâmico — Vite não avalia em build time, evita DOMMatrix crash
      const mod = await import("pdf-parse");
      const pdfParse: (buf: Buffer) => Promise<{ text: string }> =
        (mod as any).default ?? (mod as any);
      const result = await pdfParse(buffer);
      const text = result.text.trim();
      return text.length > 0 ? text : null;
    } catch {
      return null;
    }
  }

  return null;
}
