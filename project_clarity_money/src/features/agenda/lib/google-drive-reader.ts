/**
 * Lê arquivos da pasta configurada pelo usuário no Google Drive.
 * Suporta: Google Docs (exportado como texto), PDFs e arquivos .txt/.md.
 * Usa supabaseAdmin para buscar token e folder_id sem depender de RLS.
 */

import { extractText } from "@/features/ai/lib/extract-text";

const MAX_FILES = 30;
const MAX_CHARS_PER_FILE = 5_000;
const MAX_CHARS_TOTAL = 40_000;

const MAX_FILES_PER_CLIENT = 10;
const MAX_CHARS_PER_FILE_CLIENT = 3_000;
const MAX_CHARS_PER_CLIENT = 15_000;

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

/** Normaliza um nome para comparação: remove acentos, minúsculas, trim. */
function normalizeFolderName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/** Retorna o token e o folder_id configurados para o userId, ou null se indisponível. */
async function getDriveCredentials(
  userId: string,
): Promise<{ token: string; folderId: string } | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row } = await (supabaseAdmin as any)
    .from("google_drive_tokens")
    .select("folder_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!row || !(row as any).folder_id) return null;

  const { getValidGoogleDriveToken } = await import(
    "@/features/agenda/lib/google-auth.functions"
  );
  const token = await getValidGoogleDriveToken(userId);
  if (!token) return null;

  return { token, folderId: (row as any).folder_id };
}

/**
 * Encontra a pasta do Drive cujo nome corresponde ao clientName.
 * Usa exact match normalizado com fallback por primeiro nome.
 * Retorna o id da pasta ou null se não encontrado.
 */
async function findClientFolder(
  token: string,
  folderId: string,
  clientName: string,
): Promise<string | null> {
  let topLevel: DriveItem[];
  try {
    topLevel = await listItemsInFolder(token, folderId);
  } catch {
    return null;
  }

  const normalizedClient = normalizeFolderName(clientName);
  const firstNameClient = normalizedClient.split(/\s+/)[0];

  for (const folder of topLevel) {
    if (folder.mimeType !== FOLDER_MIME) continue;
    const normalizedFolder = normalizeFolderName(folder.name);
    if (normalizedFolder === normalizedClient) return folder.id;
    if (normalizedFolder.split(/\s+/)[0] === firstNameClient) return folder.id;
  }

  return null;
}

/**
 * Lê transcrições do Drive para um único cliente.
 * Estrutura esperada: RootFolder → [Nome do Cliente] → transcrições → arquivos
 * Retorna [] se Drive não conectado, cliente não encontrado ou sem transcrições.
 */
export async function readDriveTranscriptionsForClient(
  userId: string,
  clientName: string,
): Promise<DriveFileContent[]> {
  const creds = await getDriveCredentials(userId);
  if (!creds) return [];

  const { token, folderId } = creds;

  const clientFolderId = await findClientFolder(token, folderId, clientName);
  if (!clientFolderId) return [];

  let clientItems: DriveItem[];
  try {
    clientItems = await listItemsInFolder(token, clientFolderId);
  } catch {
    return [];
  }

  const transcFolder = clientItems.find(
    (item) =>
      item.mimeType === FOLDER_MIME &&
      normalizeFolderName(item.name).includes("transcri"),
  );

  if (!transcFolder) return [];

  let transcFiles: DriveItem[];
  try {
    transcFiles = await listItemsInFolder(token, transcFolder.id);
  } catch {
    return [];
  }

  const supportedFiles = transcFiles
    .filter((f) => SUPPORTED_MIME_TYPES.includes(f.mimeType))
    .sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime())
    .slice(0, MAX_FILES_PER_CLIENT);

  const results: DriveFileContent[] = [];
  let totalChars = 0;

  for (const file of supportedFiles) {
    if (totalChars >= MAX_CHARS_PER_CLIENT) break;
    let content: string | null = null;
    try {
      content = await readFileContent(token, file);
    } catch {
      continue;
    }
    if (!content) continue;
    const truncated = content.slice(0, MAX_CHARS_PER_FILE_CLIENT);
    results.push({ name: file.name, content: truncated, modifiedTime: file.modifiedTime });
    totalChars += truncated.length;
  }

  return results;
}

/**
 * Lê transcrições do Drive indexadas pelo nome da pasta de cliente (nível 1).
 * Estrutura esperada: RootFolder → [Nome do Cliente] → transcrições → arquivos
 * Retorna Map<clientFolderName, DriveFileContent[]>
 */
export async function readDriveTranscriptionsByClient(
  userId: string,
): Promise<Map<string, DriveFileContent[]>> {
  const creds = await getDriveCredentials(userId);
  if (!creds) return new Map();

  const { token, folderId } = creds;

  let topLevel: DriveItem[];
  try {
    topLevel = await listItemsInFolder(token, folderId);
  } catch {
    return new Map();
  }

  const result = new Map<string, DriveFileContent[]>();

  for (const clientFolder of topLevel) {
    if (clientFolder.mimeType !== FOLDER_MIME) continue;

    // Encontra a subpasta de transcrições (nome contém "transcri", case-insensitive)
    let clientItems: DriveItem[];
    try {
      clientItems = await listItemsInFolder(token, clientFolder.id);
    } catch {
      continue;
    }

    const transcFolder = clientItems.find(
      (item) =>
        item.mimeType === FOLDER_MIME &&
        normalizeFolderName(item.name).includes("transcri"),
    );

    if (!transcFolder) continue;

    let transcFiles: DriveItem[];
    try {
      transcFiles = await listItemsInFolder(token, transcFolder.id);
    } catch {
      continue;
    }

    const supportedFiles = transcFiles
      .filter((f) => SUPPORTED_MIME_TYPES.includes(f.mimeType))
      .sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime())
      .slice(0, MAX_FILES_PER_CLIENT);

    const clientContents: DriveFileContent[] = [];
    let totalChars = 0;

    for (const file of supportedFiles) {
      if (totalChars >= MAX_CHARS_PER_CLIENT) break;
      let content: string | null = null;
      try {
        content = await readFileContent(token, file);
      } catch {
        continue;
      }
      if (!content) continue;
      const truncated = content.slice(0, MAX_CHARS_PER_FILE_CLIENT);
      clientContents.push({ name: file.name, content: truncated, modifiedTime: file.modifiedTime });
      totalChars += truncated.length;
    }

    if (clientContents.length > 0) {
      result.set(clientFolder.name, clientContents);
    }
  }

  return result;
}

export type DriveStructurePreview = {
  topFolders: Array<{
    name: string;
    hasTranscriptions: boolean;
    fileCount: number;
  }>;
};

/**
 * Retorna uma prévia da estrutura de pastas do Drive (apenas metadados, sem ler conteúdo).
 * Usado na página de Configurações para validar a hierarquia antes de gerar um briefing.
 */
export async function previewDriveStructure(userId: string): Promise<DriveStructurePreview> {
  const creds = await getDriveCredentials(userId);
  if (!creds) return { topFolders: [] };

  const { token, folderId } = creds;

  let topLevel: DriveItem[];
  try {
    topLevel = await listItemsInFolder(token, folderId);
  } catch {
    return { topFolders: [] };
  }

  const topFolders: DriveStructurePreview["topFolders"] = [];

  for (const item of topLevel) {
    if (item.mimeType !== FOLDER_MIME) continue;

    let hasTranscriptions = false;
    let fileCount = 0;

    try {
      const children = await listItemsInFolder(token, item.id);
      const transcFolder = children.find(
        (c) =>
          c.mimeType === FOLDER_MIME &&
          normalizeFolderName(c.name).includes("transcri"),
      );
      if (transcFolder) {
        hasTranscriptions = true;
        const transcFiles = await listItemsInFolder(token, transcFolder.id);
        fileCount = transcFiles.filter((f) => SUPPORTED_MIME_TYPES.includes(f.mimeType)).length;
      }
    } catch {
      // subpasta inacessível — inclui sem transcrições
    }

    topFolders.push({ name: item.name, hasTranscriptions, fileCount });
  }

  return { topFolders };
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
