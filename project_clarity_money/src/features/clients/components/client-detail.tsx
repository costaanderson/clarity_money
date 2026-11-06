import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseError } from "@/lib/parse-error";
import {
  archiveClient,
  getClient,
  markContact,
  restoreClient,
  updateClient,
  updateClientCategories,
} from "@/features/clients/lib/clients.server";
import { CategoryMultiSelect } from "@/features/clients/components/category-multi-select";
import { type ImportantDate } from "@/features/clients/lib/clients.schemas";
import { type PipelineStage } from "@/features/pipeline/lib/pipeline.types";
import { listPipelineStages } from "@/features/pipeline/lib/pipeline.server";
import { createNote, deleteNote, listNotes } from "@/features/clients/lib/notes.server";
import {
  createSignedUpload,
  deleteDocument,
  getDocumentUrl,
  listDocuments,
  registerDocument,
} from "@/features/clients/lib/documents.server";
import { generateAI, listAIGenerations, listClientDriveTranscriptions } from "@/features/ai/lib/ai.functions";
import { listCategories } from "@/features/settings/lib/categories.server";
import { listClientDiagnostics } from "@/features/diagnostic/lib/diagnostics.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Archive,
  ArchiveRestore,
  Clock,
  Download,
  FileText,
  HelpCircle,
  MessageSquare,
  Mail,
  Mic,
  Moon,
  Pause,
  Phone,
  Play,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function ClientDetail({ id }: { id: string }) {
  const qc = useQueryClient();

  const clientQ = useQuery({ queryKey: ["client", id], queryFn: () => getClient({ data: { id } }) });
  const catsQ = useQuery({ queryKey: ["categories"], queryFn: () => listCategories() });
  const stagesQ = useQuery({ queryKey: ["pipeline-stages"], queryFn: () => listPipelineStages() });

  const markC = useMutation({
    mutationFn: () => markContact({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client", id] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["pipeline"] });
      toast.success("Contato registrado");
    },
  });
  const archive = useMutation({
    mutationFn: () => archiveClient({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client", id] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["pipeline"] });
      toast.success("Cliente arquivado");
    },
  });
  const restore = useMutation({
    mutationFn: () => restoreClient({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client", id] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["pipeline"] });
      toast.success("Cliente reativado");
    },
  });
  const updateCategories = useMutation({
    mutationFn: (categoryIds: string[]) =>
      updateClientCategories({ data: { clientId: id, categoryIds } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client", id] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["pipeline"] });
      toast.success("Categorias atualizadas");
    },
    onError: (e: Error) => toast.error(parseError(e)),
  });

  const c = clientQ.data;
  if (clientQ.isLoading) return <div className="p-8 text-sm text-muted-foreground">Carregando…</div>;
  if (!c) return <div className="p-8 text-sm text-muted-foreground">Cliente não encontrado.</div>;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-start gap-4 min-w-0">
          <div className="h-16 w-16 shrink-0 rounded-full bg-gradient-to-br from-secondary to-muted border border-border flex items-center justify-center font-serif text-2xl text-primary">
            {c.name[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-3xl font-serif leading-tight truncate">{c.name}</h1>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <Badge variant="outline" className="rounded-full font-normal">{c.type}</Badge>
              <Badge
                variant={c.status === "ativo" ? "default" : c.status === "lead" ? "secondary" : "outline"}
                className="rounded-full font-normal capitalize"
              >
                {c.status}
              </Badge>
              {(c.client_categories ?? []).map((cc: any) => cc.categories).filter(Boolean).map((cat: any) => (
                <span
                  key={cat.id}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full border font-medium"
                  style={{ borderColor: cat.color, color: cat.color }}
                >
                  {cat.name}
                </span>
              ))}
              <CategoryMultiSelect
                categories={catsQ.data ?? []}
                selectedIds={(c.client_categories ?? []).map((cc: any) => cc.category_id)}
                onChange={(ids) => updateCategories.mutate(ids)}
                placeholder="+ tag"
              />
            </div>
            <div className="text-sm text-muted-foreground mt-3 flex items-center gap-4 flex-wrap">
              {c.email && (
                <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                  <Mail className="h-3.5 w-3.5" />{c.email}
                </a>
              )}
              {c.phone && (
                <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                  <Phone className="h-3.5 w-3.5" />{c.phone}
                </a>
              )}
              {(c as any).last_contact_at && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Último contato: {new Date((c as any).last_contact_at).toLocaleDateString("pt-BR")}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => markC.mutate()} disabled={markC.isPending}>
                  <Clock className="h-4 w-4 mr-1.5" />
                  Registrar contato
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-64">
                <p className="text-xs">
                  Atualiza a data do último contato com este cliente para hoje. Essa data aparece abaixo do nome e é usada pela IA e pelas Regras de Ativação para identificar clientes inativos.
                </p>
                <p className="text-xs mt-1 text-muted-foreground">
                  Para registrar o que foi discutido, adicione uma nota abaixo.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {c.status !== "arquivado" ? (
            <Button variant="outline" size="sm" onClick={() => archive.mutate()}>
              <Archive className="h-4 w-4 mr-1.5" /> Arquivar
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => restore.mutate()}>
              <ArchiveRestore className="h-4 w-4 mr-1.5" /> Reativar
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="dados">
        <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-b rounded-none gap-1 overflow-x-auto">
          {[
            { value: "dados", label: "Dados cadastrais", icon: null },
            { value: "transcricoes", label: "Transcrições & Notas", icon: Mic },
            { value: "documentos", label: "Documentos", icon: FileText },
            { value: "diagnostico", label: "Diagnóstico", icon: Moon },
            { value: "ia", label: "IA Bússola", icon: Sparkles },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="rounded-none border-b-2 border-transparent bg-transparent px-3 py-2.5 text-sm text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-foreground transition-colors whitespace-nowrap"
              >
                {Icon && <Icon className="h-4 w-4 mr-1.5" />}
                {t.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="dados" className="mt-6"><EditPanel client={c} categories={catsQ.data ?? []} stages={stagesQ.data ?? []} /></TabsContent>
        <TabsContent value="transcricoes" className="mt-6"><TranscriptionsPanel clientId={id} clientName={c.name} /></TabsContent>
        <TabsContent value="documentos" className="mt-6"><DocumentsPanel clientId={id} /></TabsContent>
        <TabsContent value="diagnostico" className="mt-6"><DiagnosticPanel clientId={id} /></TabsContent>
        <TabsContent value="ia" className="mt-6"><AIPanel clientId={id} /></TabsContent>
      </Tabs>
    </div>
  );
}


const NOTE_MAX = 4000;

// ─── Helpers para transcrição ────────────────────────────────────────────────

type TranscriptLine = {
  timestamp: string | null;
  speaker: string | null;
  text: string;
  tags: string[];
};

function parseTranscript(content: string): TranscriptLine[] {
  const results: TranscriptLine[] = [];
  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    // padrão: [HH:MM:SS] Nome: fala  ou  [HH:MM] Nome: fala  ou  Nome: fala
    const withTs = line.match(/^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*([^:]+):\s*(.+)$/);
    if (withTs) {
      results.push({ timestamp: withTs[1], speaker: withTs[2].trim(), text: withTs[3].trim(), tags: detectTags(withTs[3]) });
      continue;
    }
    const noTs = line.match(/^([A-ZÀ-Ü][^:]{1,40}):\s*(.+)$/);
    if (noTs) {
      results.push({ timestamp: null, speaker: noTs[1].trim(), text: noTs[2].trim(), tags: detectTags(noTs[2]) });
      continue;
    }
    results.push({ timestamp: null, speaker: null, text: line, tags: detectTags(line) });
  }
  return results;
}

function detectTags(text: string): string[] {
  const t = text.toLowerCase();
  const tags: string[] = [];
  if (/d[íi]vida|endivid/.test(t)) tags.push("Gatilho Financeiro");
  if (/aposentad/.test(t)) tags.push("Aposentadoria");
  if (/risco/.test(t)) tags.push("Objeção");
  if (/aporte|invest/.test(t)) tags.push("Intenção de Aporte");
  return tags;
}

function tsToSeconds(ts: string): number {
  const parts = ts.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parts[0] * 60 + parts[1];
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

const TAG_COLORS: Record<string, string> = {
  "Gatilho Financeiro": "border-amber-400 text-amber-700 bg-amber-50",
  "Aposentadoria": "border-blue-400 text-blue-700 bg-blue-50",
  "Objeção": "border-red-400 text-red-700 bg-red-50",
  "Intenção de Aporte": "border-green-500 text-green-700 bg-green-50",
};

// ─── TranscriptionsPanel ─────────────────────────────────────────────────────

function TranscriptionsPanel({ clientId, clientName }: { clientId: string; clientName: string }) {
  const qc = useQueryClient();

  const driveQ = useQuery({
    queryKey: ["drive-transcriptions", clientId],
    queryFn: () => listClientDriveTranscriptions({ data: { clientId } }),
    staleTime: 5 * 60 * 1000,
  });

  const files = driveQ.data ?? [];
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [search, setSearch] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [synthesis, setSynthesis] = useState("");
  const [synthError, setSynthError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedFile = files[selectedIdx] ?? null;
  const totalDuration = 2880; // 48 min simulado

  // Reset ao trocar de arquivo
  useEffect(() => {
    setProgress(0);
    setIsPlaying(false);
    setSynthesis("");
    setSynthError(null);
  }, [selectedIdx]);

  // Player simulado
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setProgress((p) => {
          if (p >= totalDuration) { setIsPlaying(false); return totalDuration; }
          return p + 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying]);

  const lines = selectedFile ? parseTranscript(selectedFile.content) : [];
  const clientFirstName = clientName.split(" ")[0].toLowerCase();
  const filtered = search.trim()
    ? lines.filter((l) => l.text.toLowerCase().includes(search.toLowerCase()) || (l.speaker ?? "").toLowerCase().includes(search.toLowerCase()))
    : lines;

  const gen = useMutation({
    mutationFn: () => generateAI({
      data: {
        client_id: clientId,
        kind: "analise",
        extra_prompt: selectedFile
          ? `Analise a seguinte transcrição de sessão:\n\n${selectedFile.content}`
          : undefined,
      },
    }),
    onSuccess: (res) => {
      setSynthesis(res.output);
      setSynthError(null);
    },
    onError: (e: Error) => setSynthError(e.message),
  });

  // Parseia bullet points do output da IA para exibir como cards
  const highlights = synthesis
    .split("\n")
    .filter((l) => l.trim().startsWith("-") || l.trim().startsWith("•") || l.trim().match(/^\d+\./))
    .map((l) => l.replace(/^[-•\d.]\s*/, "").trim())
    .filter(Boolean);

  return (
    <div className="space-y-4">
      {/* Drive Sync Card */}
      <Card className="border-border/60">
        <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-full bg-background border flex items-center justify-center shrink-0">
              <Mic className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm">Google Drive · Transcrições</p>
              {driveQ.isLoading ? (
                <p className="text-xs text-muted-foreground">Verificando…</p>
              ) : files.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {files.length} arquivo{files.length > 1 ? "s" : ""} encontrado{files.length > 1 ? "s" : ""} para <strong>{clientName}</strong>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Nenhuma transcrição encontrada no Drive para este cliente
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {files.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-emerald-700 border-emerald-300 bg-emerald-50 border">
                Indexado
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={driveQ.isFetching}
              onClick={() => qc.invalidateQueries({ queryKey: ["drive-transcriptions", clientId] })}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${driveQ.isFetching ? "animate-spin" : ""}`} />
              Sincronizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {files.length > 0 && (
        <>
          {/* Seletor de arquivo + player */}
          <Card className="border-border/60">
            <CardContent className="p-4 space-y-3">
              {files.length > 1 && (
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide mb-1 block">Transcrição</label>
                  <Select
                    value={String(selectedIdx)}
                    onValueChange={(v) => setSelectedIdx(Number(v))}
                  >
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {files.map((f, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {f.name} · {new Date(f.modifiedTime).toLocaleDateString("pt-BR")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {files.length === 1 && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{selectedFile?.name}</p>
                    {selectedFile && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(selectedFile.modifiedTime).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Player simulado */}
              <div className="bg-muted/40 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsPlaying((p) => !p)}
                    className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 hover:bg-primary/90 transition-colors"
                  >
                    {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
                  </button>
                  <span className="text-xs tabular-nums text-muted-foreground w-20 shrink-0">
                    {formatSeconds(progress)} / {formatSeconds(totalDuration)}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={totalDuration}
                    value={progress}
                    onChange={(e) => setProgress(Number(e.target.value))}
                    className="flex-1 h-1.5 accent-primary cursor-pointer"
                  />
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">1.0×</Badge>
                </div>
              </div>

              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="pl-8 h-8 text-sm"
                  placeholder="Buscar palavras na transcrição…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Split view */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Coluna esquerda — Transcrição */}
            <div className="space-y-1 max-h-[520px] overflow-y-auto pr-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2 sticky top-0 bg-background py-1">
                Transcrição · {filtered.length} linha{filtered.length !== 1 ? "s" : ""}
                {search && ` · filtrado por "${search}"`}
              </p>
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma linha encontrada.</p>
              )}
              {filtered.map((line, i) => {
                const isClient = line.speaker
                  ? line.speaker.split(" ")[0].toLowerCase() === clientFirstName
                  : false;
                return (
                  <div key={i} className="group flex gap-2 py-1 hover:bg-muted/30 rounded px-1 transition-colors">
                    {line.timestamp && (
                      <button
                        className="text-[10px] tabular-nums text-muted-foreground/60 hover:text-primary shrink-0 mt-0.5 w-10 text-left"
                        onClick={() => setProgress(tsToSeconds(line.timestamp!))}
                        title="Ir para este momento"
                      >
                        {line.timestamp}
                      </button>
                    )}
                    <div className="min-w-0 flex-1">
                      {line.speaker && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {line.speaker}
                        </span>
                      )}
                      <p className={`text-sm leading-relaxed ${isClient ? "font-serif italic" : ""}`}>
                        {line.text}
                      </p>
                      {line.tags.length > 0 && (
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          {line.tags.map((tag) => (
                            <span
                              key={tag}
                              className={`text-[10px] px-1.5 py-0 rounded border font-medium ${TAG_COLORS[tag] ?? "border-border text-muted-foreground"}`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Coluna direita — Destaques Donna IA */}
            <div className="space-y-3">
              <div className="flex items-center justify-between sticky top-0 bg-background py-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Destaques Donna IA
                </p>
                <Button
                  size="sm"
                  disabled={gen.isPending}
                  onClick={() => { setSynthError(null); gen.mutate(); }}
                  className="gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {gen.isPending ? "Sintetizando…" : "Sintetizar com Donna IA"}
                </Button>
              </div>

              {gen.isPending && (
                <div className="space-y-2">
                  {[1, 2, 3].map((k) => (
                    <div key={k} className="h-16 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              )}

              {synthError && (
                <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  <span>{synthError}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto py-0.5 text-destructive hover:text-destructive"
                    onClick={() => { setSynthError(null); gen.mutate(); }}
                  >
                    Tentar
                  </Button>
                </div>
              )}

              {!synthesis && !gen.isPending && !synthError && (
                <div className="border border-dashed rounded-lg py-10 text-center">
                  <Sparkles className="h-7 w-7 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">Clique em "Sintetizar" para a Donna extrair os pontos-chave.</p>
                </div>
              )}

              {highlights.length > 0 && (
                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {highlights.map((h, i) => (
                    <Card key={i} className="border-secondary/40">
                      <CardContent className="p-3">
                        <p className="text-sm leading-relaxed font-serif italic">{h}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {synthesis && highlights.length === 0 && (
                <Card className="border-secondary/40">
                  <CardContent className="p-4">
                    <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">{synthesis}</pre>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </>
      )}

      {/* Notas rápidas (sempre visível) */}
      <div className="pt-4 border-t">
        <NotesPanel clientId={clientId} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function NotesPanel({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const [kind, setKind] = useState<"nota" | "contexto">("nota");
  const [content, setContent] = useState("");

  const notesQ = useQuery({
    queryKey: ["notes", clientId],
    queryFn: () => listNotes({ data: { clientId } }),
  });
  const add = useMutation({
    mutationFn: () => createNote({ data: { client_id: clientId, kind, content } }),
    onSuccess: () => {
      setContent("");
      qc.invalidateQueries({ queryKey: ["notes", clientId] });
      qc.invalidateQueries({ queryKey: ["client", clientId] });
      toast.success("Registrado");
    },
    onError: (e: Error) => toast.error(parseError(e)),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteNote({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes", clientId] }),
  });

  const remaining = NOTE_MAX - content.length;
  const nearLimit = remaining < 200;

  const notaPlaceholder =
    "Resumo da conversa — o que foi discutido, próximos passos acordados.\n\nPara transcrições longas, suba o arquivo na aba Documentos.";
  const contextoPlaceholder =
    "Síntese do perfil comportamental: padrões observados, emoções recorrentes, gatilhos financeiros, crenças limitantes…\n\nEsse campo também pode ser gerado pela IA na aba IA Bússola.";

  const allNotes = notesQ.data ?? [];
  const contextNotes = allNotes.filter((n) => n.kind === "contexto");
  const regularNotes = allNotes.filter((n) => n.kind === "nota");

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <Card className="md:col-span-1 h-fit md:sticky md:top-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-serif flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Novo registro
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nota">Nota de contato</SelectItem>
                  <SelectItem value="contexto">Contexto comportamental</SelectItem>
                </SelectContent>
              </Select>
              {kind === "contexto" && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground shrink-0 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-64">
                      <p className="text-xs">
                        Síntese do perfil comportamental do cliente: padrões observados, emoções recorrentes, gatilhos financeiros e crenças limitantes.
                      </p>
                      <p className="text-xs mt-1 text-muted-foreground">
                        Pode ser escrita manualmente ou gerada pela IA na aba <strong>IA Bússola</strong>. Limite: 4.000 caracteres.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {kind === "nota"
                ? "Registre o que foi discutido. Transcrições longas: use a aba Documentos."
                : "Síntese comportamental do cliente — pode ser escrita manualmente ou gerada pela IA."}
            </p>
          </div>
          <div>
            <Textarea
              rows={6}
              placeholder={kind === "nota" ? notaPlaceholder : contextoPlaceholder}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={NOTE_MAX}
            />
            {content.length > 0 && (
              <p className={`text-xs mt-1 text-right ${remaining <= 0 ? "text-destructive font-medium" : nearLimit ? "text-amber-600" : "text-muted-foreground/50"}`}>
                {remaining <= 0 ? "Limite atingido" : `${content.length} / ${NOTE_MAX}`}
              </p>
            )}
          </div>
          <Button
            className="w-full"
            disabled={!content.trim() || content.length > NOTE_MAX || add.isPending}
            onClick={() => add.mutate()}
          >
            Adicionar
          </Button>
        </CardContent>
      </Card>

      <div className="md:col-span-2 space-y-6">
        {allNotes.length === 0 && (
          <div className="border border-dashed rounded-lg py-12 text-center">
            <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum registro ainda.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Adicione a primeira nota ao lado.</p>
          </div>
        )}

        {/* Contact history timeline */}
        {contextNotes.length > 0 && (
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
              Contexto comportamental
            </h3>
            <div className="space-y-2">
              {contextNotes.map((n) => (
                <Card key={n.id} className="group border-secondary/60">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(n.created_at).toLocaleString("pt-BR")}
                      </span>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8" onClick={() => del.mutate(n.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{n.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Regular notes */}
        {regularNotes.length > 0 && (
          <div>
            {contextNotes.length > 0 && (
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
                Notas de contato
              </h3>
            )}
            <div className="space-y-2">
              {regularNotes.map((n) => (
                <Card key={n.id} className="group">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(n.created_at).toLocaleString("pt-BR")}
                      </span>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8" onClick={() => del.mutate(n.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{n.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function DocumentsPanel({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const docsQ = useQuery({
    queryKey: ["documents", clientId],
    queryFn: () => listDocuments({ data: { clientId } }),
  });

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { path, token } = await createSignedUpload({
        data: { client_id: clientId, file_name: file.name },
      });
      const { error: upErr } = await supabase.storage
        .from("client-documents")
        .uploadToSignedUrl(path, token, file, { contentType: file.type });
      if (upErr) throw upErr;
      const result = await registerDocument({
        data: { client_id: clientId, name: file.name, mime: file.type, size: file.size, path },
      });
      if ((result as any).extracted_text) {
        toast.success("Documento indexado", {
          description: "Texto extraído — a IA já pode analisar este conteúdo.",
        });
      } else {
        toast("Documento anexado", {
          description: "Formato não indexado pela IA. Para análise, use arquivos .pdf, .txt ou .md.",
        });
      }
      qc.invalidateQueries({ queryKey: ["documents", clientId] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Se o servidor retornou HTML (bucket não configurado, erro 500 etc.)
      // evita exibir o HTML bruto no toast
      const isHtml = msg.trimStart().startsWith("<");
      toast.error("Falha ao enviar documento", {
        description: isHtml
          ? "Erro de configuração no servidor. Verifique se o bucket 'client-documents' existe no Supabase Storage."
          : msg,
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function downloadDoc(docId: string) {
    const { url } = await getDocumentUrl({ data: { id: docId } });
    window.open(url, "_blank", "noopener");
  }

  const del = useMutation({
    mutationFn: (id: string) => deleteDocument({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents", clientId] });
      toast.success("Documento removido");
    },
  });

  return (
    <div className="space-y-4">
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-full bg-background border flex items-center justify-center shrink-0">
              <Upload className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-medium">Anexar documento</p>
              <p className="text-xs text-muted-foreground">
                Transcrições (.txt, .pdf) e resumos são indexados pela IA. Contratos, imagens e planilhas são armazenados mas não processados.
              </p>
            </div>
          </div>
          <Button onClick={() => fileRef.current?.click()} disabled={uploading} size="sm">
            {uploading ? "Enviando…" : "Enviar"}
          </Button>
          <input ref={fileRef} type="file" hidden onChange={handleFile} />
        </CardContent>
      </Card>

      {docsQ.data?.length === 0 && (
        <div className="border border-dashed rounded-lg py-10 text-center">
          <FileText className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum documento anexado ainda.</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Suba transcrições ou resumos para que a IA possa analisá-los.</p>
        </div>
      )}

      <div className="grid gap-2">
        {docsQ.data?.map((d) => {
          const isIndexed = !!(d as any).extracted_text;
          return (
            <Card key={d.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{d.name}</p>
                    <Badge
                      variant={isIndexed ? "secondary" : "outline"}
                      className={`text-[10px] px-1.5 py-0 shrink-0 ${isIndexed ? "text-emerald-700 border-emerald-300 bg-emerald-50" : ""}`}
                      title={isIndexed ? "Texto extraído — a IA pode analisar este documento" : "Formato não suportado para extração de texto — armazenado mas não indexado pela IA"}
                    >
                      {isIndexed ? "Indexado" : "Não processado"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {d.mime ?? "arquivo"} · {d.size ? `${Math.round((d.size / 1024) * 10) / 10} KB` : "—"} ·{" "}
                    {new Date(d.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => downloadDoc(d.id)}>
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => del.mutate(d.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

const AI_KINDS = [
  { value: "resumo", label: "Resumo das notas" },
  { value: "briefing", label: "Preparar reunião" },
  { value: "analise", label: "Análise comportamental" },
  { value: "mensagem", label: "Mensagem de ativação" },
] as const;

function AIPanel({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const [kind, setKind] = useState<(typeof AI_KINDS)[number]["value"]>("resumo");
  const [extra, setExtra] = useState("");
  const [latest, setLatest] = useState<string>("");
  const [genError, setGenError] = useState<string | null>(null);

  const notesQ = useQuery({
    queryKey: ["notes", clientId],
    queryFn: () => listNotes({ data: { clientId } }),
  });
  const docsQ = useQuery({
    queryKey: ["documents", clientId],
    queryFn: () => listDocuments({ data: { clientId } }),
  });
  const historyQ = useQuery({
    queryKey: ["ai", clientId],
    queryFn: () => listAIGenerations({ data: { clientId } }),
  });

  const hasNotes = (notesQ.data?.length ?? 0) > 0;
  const hasIndexedDocs = (docsQ.data ?? []).some((d) => !!(d as any).extracted_text);
  const hasContext = hasNotes || hasIndexedDocs;
  const prerequisitesMet = notesQ.isSuccess && docsQ.isSuccess;

  const gen = useMutation({
    mutationFn: () => generateAI({ data: { client_id: clientId, kind, extra_prompt: extra || undefined } }),
    onSuccess: (res) => {
      setLatest(res.output);
      setGenError(null);
      qc.invalidateQueries({ queryKey: ["ai", clientId] });
    },
    onError: (e: Error) => {
      setGenError(e.message);
      toast.error("Erro ao gerar análise");
    },
  });

  return (
    <div className="space-y-6">
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="pb-4 border-b bg-muted/40">
          <CardTitle className="text-base font-serif flex items-center gap-2.5">
            <span className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </span>
            Gerar com IA
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          {prerequisitesMet && !hasContext && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <Sparkles className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
              <div>
                <p className="font-medium">Sem contexto disponível</p>
                <p className="text-xs mt-0.5">
                  Para gerar análises, adicione ao menos uma nota na aba <strong>Notas & Contextos</strong> ou suba uma transcrição em <strong>Documentos</strong>.
                </p>
              </div>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Tipo de geração</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AI_KINDS.map((k) => (
                    <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Instruções adicionais (opcional)</Label>
              <Textarea
                rows={2}
                placeholder="Ex.: foco no comportamento com dívidas nos últimos 30 dias"
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                className="resize-none"
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/60 -mx-5 px-5 -mb-1">
            <p className="text-xs text-muted-foreground pt-4">
              Gemini 3.6 Flash · baseado em cadastro, notas e documentos indexados
            </p>
            <Button
              disabled={gen.isPending || (prerequisitesMet && !hasContext)}
              onClick={() => { setGenError(null); gen.mutate(); }}
              className="mt-3"
            >
              <Sparkles className="h-4 w-4 mr-1.5" />
              {gen.isPending ? "Gerando…" : "Gerar"}
            </Button>
          </div>

          {genError && (
            <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <span>{genError}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto py-0.5 text-destructive hover:text-destructive"
                onClick={() => { setGenError(null); gen.mutate(); }}
              >
                Tentar novamente
              </Button>
            </div>
          )}

          {gen.isPending && (
            <div className="space-y-2 pt-2">
              <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
              <div className="h-3 bg-muted animate-pulse rounded w-full" />
              <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {latest && (
          <Card className="border-primary/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-serif flex items-center gap-2 text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Última geração
              </CardTitle>
            </CardHeader>
            <CardContent><pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">{latest}</pre></CardContent>
          </Card>
        )}
        {historyQ.data?.length === 0 && !latest && (
          <div className="border border-dashed rounded-lg py-12 text-center">
            <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma geração ainda.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Escolha um tipo acima e clique em Gerar.</p>
          </div>
        )}
        {historyQ.data?.map((g) => (
          <Card key={g.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="rounded-full font-normal capitalize">{g.kind}</Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(g.created_at).toLocaleString("pt-BR")}
                </span>
              </div>
              <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">{g.output}</pre>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}


function EditPanel({
  client,
  categories,
  stages,
}: {
  client: NonNullable<Awaited<ReturnType<typeof getClient>>>;
  categories: { id: string; name: string; color: string }[];
  stages: { id: string; label: string; slug: string }[];
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: client.name,
    email: client.email ?? "",
    phone: client.phone ?? "",
    document: client.document ?? "",
    type: client.type,
    status: client.status,
    category_ids: (client.client_categories ?? []).map((cc: any) => cc.category_id),
    pipeline_stage: (client.pipeline_stage ?? "novo") as PipelineStage,
    source: (client.source ?? "outro") as "instagram" | "google_ads" | "landing_page" | "indicacao" | "outro",
    source_campaign: client.source_campaign ?? "",
    notes_bio: (client as unknown as { notes_bio?: string }).notes_bio ?? "",
    birthday: client.birthday ?? "",
    important_dates: (client.important_dates as ImportantDate[] | null) ?? [],
  });

  const save = useMutation({
    mutationFn: async () => {
      await updateClient({
        data: {
          id: client.id,
          name: form.name,
          email: form.email,
          phone: form.phone,
          document: form.document,
          type: form.type,
          status: form.status,
          pipeline_stage: form.pipeline_stage,
          source: form.source,
          source_campaign: form.source_campaign,
          birthday: form.birthday || null,
          important_dates: form.important_dates.length > 0 ? form.important_dates : null,
        },
      });
      await updateClientCategories({
        data: { clientId: client.id, categoryIds: form.category_ids },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client", client.id] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["pipeline"] });
      toast.success("Alterações salvas");
    },
    onError: (e: Error) => toast.error(parseError(e)),
  });

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">


          <div>
            <Label>Tipo</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as "PF" | "PJ" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PF">Pessoa Física</SelectItem>
                <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as typeof form.status })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="arquivado">Arquivado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Nome</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Email</Label>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>{form.type === "PF" ? "CPF" : "CNPJ"}</Label>
            <Input value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} />
          </div>
          <div>
            <Label>Categorias</Label>
            <CategoryMultiSelect
              categories={categories}
              selectedIds={form.category_ids}
              onChange={(ids) => setForm({ ...form, category_ids: ids })}
              placeholder="Sem categoria"
            />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Estágio no pipeline</Label>
            <Select
              value={form.pipeline_stage}
              onValueChange={(v) => setForm({ ...form, pipeline_stage: v as PipelineStage })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {stages.map((s) => (
                  <SelectItem key={s.slug} value={s.slug}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Origem</Label>
            <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v as typeof form.source })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="google_ads">Google Ads</SelectItem>
                <SelectItem value="landing_page">Landing Page</SelectItem>
                <SelectItem value="indicacao">Indicação</SelectItem>
                <SelectItem value="outro">Manual / Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Campanha / detalhe da origem</Label>
          <Input
            value={form.source_campaign}
            onChange={(e) => setForm({ ...form, source_campaign: e.target.value })}
            placeholder="Ex.: bio-instagram, ads-black-friday"
          />
        </div>

        {/* Datas especiais */}
        <div className="pt-2 border-t space-y-3">
          <p className="text-sm font-medium">Datas para a Donna acompanhar</p>
          <div>
            <Label>Aniversário</Label>
            <Input
              type="date"
              value={form.birthday}
              onChange={(e) => setForm({ ...form, birthday: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              A Donna avisará nos 7 dias anteriores ao aniversário.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Outras datas especiais</Label>
            {form.important_dates.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  className="flex-1"
                  placeholder="Ex.: Aniversário de casamento"
                  value={d.label}
                  onChange={(e) => {
                    const next = [...form.important_dates];
                    next[i] = { ...next[i], label: e.target.value };
                    setForm({ ...form, important_dates: next });
                  }}
                />
                <Input
                  type="number"
                  className="w-16"
                  placeholder="Dia"
                  min={1}
                  max={31}
                  value={d.day}
                  onChange={(e) => {
                    const next = [...form.important_dates];
                    next[i] = { ...next[i], day: Number(e.target.value) };
                    setForm({ ...form, important_dates: next });
                  }}
                />
                <span className="text-muted-foreground text-sm">/</span>
                <Input
                  type="number"
                  className="w-16"
                  placeholder="Mês"
                  min={1}
                  max={12}
                  value={d.month}
                  onChange={(e) => {
                    const next = [...form.important_dates];
                    next[i] = { ...next[i], month: Number(e.target.value) };
                    setForm({ ...form, important_dates: next });
                  }}
                />
                <Input
                  type="number"
                  className="w-20"
                  placeholder="Ano"
                  min={2000}
                  max={2100}
                  value={d.year ?? ""}
                  onChange={(e) => {
                    const next = [...form.important_dates];
                    next[i] = { ...next[i], year: e.target.value ? Number(e.target.value) : null };
                    setForm({ ...form, important_dates: next });
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    setForm({
                      ...form,
                      important_dates: form.important_dates.filter((_, j) => j !== i),
                    });
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Dia / Mês / Ano (opcional — sem ano = repete todo ano)
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() =>
                setForm({
                  ...form,
                  important_dates: [
                    ...form.important_dates,
                    { label: "", month: 1, day: 1, year: null },
                  ],
                })
              }
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar data
            </Button>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            <Save className="h-4 w-4 mr-1" /> Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

type DiagAnswer = { question: string; answer: string; value: number };

function DiagnosticPanel({ clientId }: { clientId: string }) {
  const q = useQuery({
    queryKey: ["diagnostics", clientId],
    queryFn: () => listClientDiagnostics({ data: { clientId } }),
  });
  const rows = q.data ?? [];
  if (q.isLoading) return <p className="text-sm text-muted-foreground p-4">Carregando…</p>;
  if (rows.length === 0) {
    return (
      <Card className="mt-4">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Este cliente ainda não respondeu o Raio-X do Sono Financeiro.
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-4 mt-4">
      {rows.map((d) => {
        const answers = Array.isArray(d.answers) ? (d.answers as unknown as DiagAnswer[]) : [];
        return (
          <Card key={d.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Raio-X do Sono Financeiro</p>
                  <CardTitle className="text-lg font-serif mt-1">{d.stage_label}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(d.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <Badge variant="secondary" className="text-sm">
                  {d.score} / {d.max_score}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {answers.map((a, i) => (
                <div key={i} className="border-l-2 border-primary/30 pl-3">
                  <p className="text-xs text-muted-foreground">{a.question}</p>
                  <p className="text-sm mt-0.5">
                    <span className="font-medium">{a.answer}</span>
                    <span className="text-xs text-muted-foreground ml-2">({a.value} pts)</span>
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
