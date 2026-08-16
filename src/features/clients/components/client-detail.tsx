import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  archiveClient,
  getClient,
  markContact,
  restoreClient,
  updateClient,
  PIPELINE_STAGES,
  type PipelineStage,
} from "@/features/clients/lib/clients.functions";
import { createNote, deleteNote, listNotes } from "@/features/clients/lib/notes.functions";
import {
  createSignedUpload,
  deleteDocument,
  getDocumentUrl,
  listDocuments,
  registerDocument,
} from "@/features/clients/lib/documents.functions";
import { generateAI, listAIGenerations } from "@/features/ai/lib/ai.functions";
import { listCategories } from "@/features/settings/lib/categories.functions";
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
  Download,
  FileText,
  MessageSquare,
  Mail,
  Moon,
  Phone,
  Save,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function ClientDetail({ id }: { id: string }) {
  const qc = useQueryClient();

  const clientQ = useQuery({ queryKey: ["client", id], queryFn: () => getClient({ data: { id } }) });
  const catsQ = useQuery({ queryKey: ["categories"], queryFn: () => listCategories() });

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
  const updateCategory = useMutation({
    mutationFn: (categoryId: string | null) =>
      updateClient({ data: { id, category_id: categoryId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client", id] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["pipeline"] });
      toast.success("Categoria atualizada");
    },
    onError: (e: Error) => toast.error(e.message),
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
              {c.categories && (
                <span
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full border font-medium"
                  style={{ borderColor: c.categories.color, color: c.categories.color }}
                >
                  {c.categories.name}
                </span>
              )}
              <Select
                value={c.category_id ?? "none"}
                onValueChange={(v) => updateCategory.mutate(v === "none" ? null : v)}
              >
                <SelectTrigger className="h-6 px-2 py-0 text-xs rounded-full w-auto gap-1 border-dashed text-muted-foreground">
                  <SelectValue placeholder={c.categories ? "Trocar tag" : "+ tag"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {(catsQ.data ?? []).map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => markC.mutate()}
            title="Registra a data do último contato com este cliente. Use para manter o histórico de interações atualizado."
          >
            Registrar contato
          </Button>
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
            { value: "notas", label: "Notas & Contextos", icon: MessageSquare },
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

        <TabsContent value="dados" className="mt-6"><EditPanel client={c} categories={catsQ.data ?? []} /></TabsContent>
        <TabsContent value="notas" className="mt-6"><NotesPanel clientId={id} /></TabsContent>
        <TabsContent value="documentos" className="mt-6"><DocumentsPanel clientId={id} /></TabsContent>
        <TabsContent value="diagnostico" className="mt-6"><DiagnosticPanel clientId={id} /></TabsContent>
        <TabsContent value="ia" className="mt-6"><AIPanel clientId={id} /></TabsContent>
      </Tabs>
    </div>
  );
}


const NOTE_MAX = 4000;

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
    onError: (e: Error) => toast.error(e.message),
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
            <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nota">Nota de contato</SelectItem>
                <SelectItem value="contexto">Contexto comportamental</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1.5">
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
            {nearLimit && (
              <p className={`text-xs mt-1 text-right ${remaining <= 0 ? "text-destructive font-medium" : "text-amber-600"}`}>
                {remaining <= 0 ? "Limite atingido" : `${remaining} caracteres restantes`}
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
      await registerDocument({
        data: { client_id: clientId, name: file.name, mime: file.type, size: file.size, path },
      });
      toast.success("Documento anexado");
      qc.invalidateQueries({ queryKey: ["documents", clientId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no upload");
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
              Gemini 2.5 Flash · baseado em cadastro, notas e documentos indexados
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
}: {
  client: NonNullable<Awaited<ReturnType<typeof getClient>>>;
  categories: { id: string; name: string; color: string }[];
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: client.name,
    email: client.email ?? "",
    phone: client.phone ?? "",
    document: client.document ?? "",
    type: client.type,
    status: client.status,
    category_id: client.category_id ?? "none",
    pipeline_stage: (client.pipeline_stage ?? "novo") as PipelineStage,
    source: (client.source ?? "outro") as "instagram" | "google_ads" | "landing_page" | "indicacao" | "outro",
    source_campaign: client.source_campaign ?? "",
    notes_bio: (client as unknown as { notes_bio?: string }).notes_bio ?? "",
  });

  const save = useMutation({
    mutationFn: () =>
      updateClient({
        data: {
          id: client.id,
          name: form.name,
          email: form.email,
          phone: form.phone,
          document: form.document,
          type: form.type,
          status: form.status,
          category_id: form.category_id === "none" ? null : form.category_id,
          pipeline_stage: form.pipeline_stage,
          source: form.source,
          source_campaign: form.source_campaign,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client", client.id] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["pipeline"] });
      toast.success("Alterações salvas");
    },
    onError: (e: Error) => toast.error(e.message),
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
            <Label>Categoria</Label>
            <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem categoria</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                {PIPELINE_STAGES.map((s) => (
                  <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
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
