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

const FOLDER_MIME = "application/vnd.google-apps.folder";

type DriveItem = DriveFile & { mimeType: string };

async function listItemsInFolder(
  token: string,
  folderId: string,
): Promise<DriveItem[]> {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const fields = encodeURIComponent("files(id,name,mimeType,modifiedTime)");
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=modifiedTime+desc&pageSize=100`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive API list error (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  return json.files ?? [];
}

/**
 * Coleta arquivos suportados a partir de uma pasta, percorrendo subpastas
 * até a profundidade indicada (maxDepth).
 * Estrutura esperada: Clientes_ativos → {Nome do Cliente} → transcrição → arquivos
 * O pathPrefix acumula o caminho (ex: "Anderson / transcrição") para identificar
 * de qual cliente é cada arquivo no prompt da Donna.
 */
async function collectFiles(
  token: string,
  folderId: string,
  maxDepth: number,
  pathPrefix = "",
): Promise<DriveFile[]> {
  const items = await listItemsInFolder(token, folderId);
  const files: DriveFile[] = [];

  for (const item of items) {
    if (SUPPORTED_MIME_TYPES.includes(item.mimeType)) {
      // Inclui o caminho no nome para que a Donna saiba de qual cliente é
      files.push({
        ...item,
        name: pathPrefix ? `${pathPrefix} / ${item.name}` : item.name,
      });
    } else if (item.mimeType === FOLDER_MIME && maxDepth > 0) {
      try {
        const nestedPrefix = pathPrefix ? `${pathPrefix} / ${item.name}` : item.name;
        const nested = await collectFiles(token, item.id, maxDepth - 1, nestedPrefix);
        files.push(...nested);
      } catch {
        // ignora subpasta inacessível
      }
    }
  }

  return files;
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
    // maxDepth=3 cobre: pasta raiz → [cliente] → Transcrições → arquivos
    files = await collectFiles(token, (row as any).folder_id, 3);
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
