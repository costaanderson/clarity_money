/**
 * Lê arquivos da pasta configurada pelo usuário no Google Drive.
 * Suporta: Google Docs (exportado como texto), PDFs e arquivos .txt/.md.
 * Usa supabaseAdmin para buscar token e folder_id sem depender de RLS.
 */

import { extractText } from "@/features/ai/lib/extract-text";

const MAX_FILES = 15;
const MAX_CHARS_PER_FILE = 3_000;
const MAX_CHARS_TOTAL = 18_000;

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
};

export type DriveFileContent = {
  name: string;
  content: string;
  modifiedTime: string;
};

const SUPPORTED_MIME_TYPES = [
  "application/vnd.google-apps.document",
  "application/pdf",
  "text/plain",
  "text/markdown",
];

async function listFilesInFolder(
  token: string,
  folderId: string,
): Promise<DriveFile[]> {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const fields = encodeURIComponent("files(id,name,mimeType,modifiedTime)");
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=modifiedTime+desc&pageSize=${MAX_FILES}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive API list error (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  return (json.files ?? []).filter((f: DriveFile) =>
    SUPPORTED_MIME_TYPES.includes(f.mimeType),
  );
}

async function readFileContent(
  token: string,
  file: DriveFile,
): Promise<string | null> {
  const headers = { Authorization: `Bearer ${token}` };

  // Google Docs → exportar como texto simples
  if (file.mimeType === "application/vnd.google-apps.document") {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text%2Fplain`,
      { headers },
    );
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    return text.length > 0 ? text : null;
  }

  // PDF, txt, md → download binário e passa pelo extractText
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
    { headers },
  );
  if (!res.ok) return null;

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return extractText(buffer, file.mimeType);
}

/**
 * Lê os arquivos da pasta configurada para o userId.
 * Retorna [] se o Drive não estiver conectado ou a pasta não estiver configurada.
 */
export async function readDriveFolder(userId: string): Promise<DriveFileContent[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: row } = await (supabaseAdmin as any)
    .from("google_drive_tokens")
    .select("access_token, refresh_token, expires_at, folder_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!row || !(row as any).folder_id) return [];

  // Garante token válido (auto-refresh se expirado)
  const { getValidGoogleDriveToken } = await import(
    "@/features/agenda/lib/google-auth.functions"
  );
  const token = await getValidGoogleDriveToken(userId);
  if (!token) return [];

  let files: DriveFile[];
  try {
    files = await listFilesInFolder(token, (row as any).folder_id);
  } catch (err) {
    console.error("[readDriveFolder] list error:", err);
    return [];
  }

  const results: DriveFileContent[] = [];
  let totalChars = 0;

  for (const file of files) {
    if (totalChars >= MAX_CHARS_TOTAL) break;

    let content: string | null = null;
    try {
      content = await readFileContent(token, file);
    } catch {
      continue;
    }

    if (!content) continue;

    const truncated = content.slice(0, MAX_CHARS_PER_FILE);
    results.push({
      name: file.name,
      content: truncated,
      modifiedTime: file.modifiedTime,
    });
    totalChars += truncated.length;
  }

  return results;
}
