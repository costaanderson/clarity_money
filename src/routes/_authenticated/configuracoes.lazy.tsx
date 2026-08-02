import { createLazyFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarClock, Sparkles, Shield, Link2, Copy, Trash2, Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listIntakeTokens,
  createIntakeToken,
  revokeIntakeToken,
} from "@/lib/cockpit.functions";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export const Route = (createLazyFileRoute as unknown as (p: string) => any)(
  "/_authenticated/configuracoes",
)({ component: SettingsPage });

function SettingsPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">Preferências</p>
        <h1 className="text-3xl font-serif">Configurações</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-serif flex items-center gap-2">
            <CalendarClock className="h-4 w-4" /> Google Agenda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Conecte sua conta Google para sincronização bidirecional.
          </p>
          <Button variant="outline" disabled>Conectar Google Agenda (em breve)</Button>
        </CardContent>
      </Card>

      <TrackingURLsCard />

      <IntakeTokensCard />

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-serif flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> IA (Gemini)
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          A IA da Bússola está ativa por padrão via Lovable AI Gateway (Gemini 2.5 Flash).
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-serif flex items-center gap-2">
            <Shield className="h-4 w-4" /> Privacidade
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Seus clientes, notas e documentos são privados por usuário (RLS ativo).
        </CardContent>
      </Card>
    </div>
  );
}

function IntakeTokensCard() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["intake-tokens"], queryFn: () => listIntakeTokens() });
  const [label, setLabel] = useState("");
  const [justCreated, setJustCreated] = useState<{ id: string; token: string } | null>(null);

  const create = useMutation({
    mutationFn: (label: string) => createIntakeToken({ data: { label } }),
    onSuccess: (row) => {
      setJustCreated({ id: row.id, token: row.token });
      setLabel("");
      qc.invalidateQueries({ queryKey: ["intake-tokens"] });
      toast.success("Token gerado. Copie agora — só será exibido uma vez.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => revokeIntakeToken({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["intake-tokens"] });
      toast.success("Token revogado");
    },
  });

  const endpoint = typeof window !== "undefined" ? `${window.location.origin}/api/public/leads` : "/api/public/leads";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-serif flex items-center gap-2">
          <Link2 className="h-4 w-4" /> Captura de leads (Landing Page)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          Gere um token para conectar sua LP à Bússola. Envie POST para <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{endpoint}</code> com o cabeçalho <code className="bg-muted px-1.5 py-0.5 rounded text-xs">X-Lead-Token</code> e um JSON com <code>name</code>, <code>email</code>, <code>phone</code>, <code>utm_campaign</code>, <code>landing_url</code>.
        </p>

        <div className="flex gap-2">
          <Input
            placeholder="Nome do token (ex: LP Reserva de Emergência)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <Button
            onClick={() => label.trim() && create.mutate(label.trim())}
            disabled={create.isPending || !label.trim()}
          >
            <Plus className="h-4 w-4 mr-1" /> Gerar
          </Button>
        </div>

        {justCreated && (
          <div className="rounded-md border border-primary/40 bg-primary/5 p-3 space-y-2">
            <p className="text-xs font-medium">Copie este token agora — não será exibido novamente:</p>
            <div className="flex gap-2">
              <Input readOnly value={justCreated.token} className="font-mono text-xs" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(justCreated.token);
                  toast.success("Copiado");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setJustCreated(null)}>Ok, já copiei</Button>
          </div>
        )}

        <div className="space-y-2">
          {q.data?.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhum token gerado.</p>
          )}
          {q.data?.map((t) => (
            <div key={t.id} className="flex items-center gap-3 border rounded-md p-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{t.label}</span>
                  {!t.active && <Badge variant="outline" className="text-[10px]">revogado</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  Criado em {new Date(t.created_at).toLocaleDateString("pt-BR")}
                  {t.last_used_at && ` • último uso ${new Date(t.last_used_at).toLocaleDateString("pt-BR")}`}
                </p>
              </div>
              {t.active && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => revoke.mutate(t.id)}
                  disabled={revoke.isPending}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TrackingURLsCard() {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://seu-dominio.com";
  const lp = `${origin}/diagnostico`;

  const links: { channel: string; url: string; hint: string }[] = [
    {
      channel: "Instagram — Bio",
      url: `${lp}?utm_source=instagram&utm_medium=bio&utm_campaign=raio_x_sono`,
      hint: "Cole no link da bio (ou no Linktree apontando pra cá).",
    },
    {
      channel: "Instagram — Stories",
      url: `${lp}?utm_source=instagram&utm_medium=stories&utm_campaign=raio_x_sono`,
      hint: "Use no sticker de link dos stories.",
    },
    {
      channel: "Instagram — Ads",
      url: `${lp}?utm_source=instagram&utm_medium=paid_social&utm_campaign=raio_x_sono&utm_content=criativo_1`,
      hint: "Troque utm_content por criativo para comparar.",
    },
    {
      channel: "Google Ads — Search",
      url: `${lp}?utm_source=google_ads&utm_medium=cpc&utm_campaign=raio_x_sono&utm_content={creative}`,
      hint: "{creative} e outras chaves são substituídas pelo Google automaticamente.",
    },
    {
      channel: "Google Ads — Display",
      url: `${lp}?utm_source=google_ads&utm_medium=display&utm_campaign=raio_x_sono`,
      hint: "Use uma variação por conjunto de anúncios se quiser.",
    },
  ];

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-serif flex items-center gap-2">
          <Link2 className="h-4 w-4" /> URLs de tracking (Instagram / Google Ads)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          Todos os cliques caem em <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{lp}</code>. Cada link abaixo já vem com UTMs
          para que o lead entre no CRM com a origem correta (Instagram, Google Ads ou LP direta) e apareça marcado no Pipeline e no Cockpit.
        </p>
        <div className="space-y-3">
          {links.map((l) => (
            <div key={l.channel} className="border rounded-lg p-3 space-y-1.5 bg-muted/20">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-medium">{l.channel}</span>
                <Button size="sm" variant="ghost" onClick={() => copy(l.url)}>
                  <Copy className="h-3 w-3 mr-1" /> Copiar
                </Button>
              </div>
              <Input readOnly value={l.url} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
              <p className="text-xs text-muted-foreground">{l.hint}</p>
            </div>
          ))}
        </div>
        <div className="text-xs text-muted-foreground border-t pt-3 space-y-1">
          <p><strong>Como funciona a origem:</strong></p>
          <p>• <code>utm_source=instagram</code> → cartão marcado como <strong>Instagram</strong>.</p>
          <p>• <code>utm_source=google_ads</code> (ou <code>google</code>, <code>adwords</code>) → marcado como <strong>Google Ads</strong>.</p>
          <p>• Sem <code>utm_source</code> → marcado como <strong>Landing Page</strong>.</p>
          <p>• Cadastros feitos manualmente no CRM aparecem como <strong>Manual</strong>.</p>
        </div>
      </CardContent>
    </Card>
  );
}
