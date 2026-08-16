import { createLazyFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getCockpitOverview } from "@/lib/cockpit.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Gauge, TrendingUp, Users, Timer, Percent, CalendarDays, AlertCircle } from "lucide-react";
import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { CLIENT_SOURCES } from "@/lib/clients.functions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = (createLazyFileRoute as any)("/_authenticated/cockpit")({
  component: CockpitPage,
});

const SOURCE_COLORS: Record<string, string> = {
  instagram: "#C13584",
  landing_page: "#3B82F6",
  indicacao: "#10B981",
  outro: "#94A3B8",
};

function buildMonthShortcuts() {
  const now = new Date();
  const months: { key: string; label: string; from: string; to: string }[] = [];
  // current month
  const thisStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  months.push({
    key: "month-0",
    label: thisStart.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
    from: thisStart.toISOString(),
    to: thisEnd.toISOString(),
  });
  // previous 5 months
  for (let i = 1; i <= 5; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    months.push({
      key: `month-${i}`,
      label: start.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
      from: start.toISOString(),
      to: end.toISOString(),
    });
  }
  return months;
}

function toDateInputValue(isoString: string) {
  return isoString.slice(0, 10);
}

function CockpitPage() {
  const monthShortcuts = useMemo(buildMonthShortcuts, []);

  const [activeKey, setActiveKey] = useState<string>("month-0");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const { from, to } = useMemo(() => {
    if (showCustom && customFrom && customTo) {
      return {
        from: new Date(customFrom).toISOString(),
        to: new Date(customTo + "T23:59:59").toISOString(),
      };
    }
    const shortcut = monthShortcuts.find((m) => m.key === activeKey);
    if (shortcut) return { from: shortcut.from, to: shortcut.to };
    return { from: monthShortcuts[0].from, to: monthShortcuts[0].to };
  }, [activeKey, showCustom, customFrom, customTo, monthShortcuts]);

  const periodLabel = useMemo(() => {
    if (showCustom && customFrom && customTo) {
      const f = new Date(customFrom).toLocaleDateString("pt-BR");
      const t = new Date(customTo).toLocaleDateString("pt-BR");
      return `${f} → ${t}`;
    }
    const shortcut = monthShortcuts.find((m) => m.key === activeKey);
    return shortcut
      ? shortcut.label.charAt(0).toUpperCase() + shortcut.label.slice(1)
      : "";
  }, [activeKey, showCustom, customFrom, customTo, monthShortcuts]);

  const isFuture = useMemo(() => new Date(to) > new Date(), [to]);

  const queryKey = showCustom && customFrom && customTo
    ? ["cockpit", "custom", customFrom, customTo]
    : ["cockpit", activeKey];

  const q = useQuery({
    queryKey,
    queryFn: () => getCockpitOverview({ data: { from, to } }),
    enabled: showCustom ? !!(customFrom && customTo) : true,
  });

  const data = q.data;
  const isEmpty = data && data.kpis.totalLeads === 0;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Performance de leads</p>
          <h1 className="text-3xl font-serif flex items-center gap-2">
            <Gauge className="h-7 w-7 text-primary" /> Cockpit
          </h1>
          {periodLabel && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <CalendarDays className="h-3 w-3" /> {periodLabel}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 items-start md:items-end">
          {/* Month shortcuts */}
          <div className="flex gap-1 flex-wrap justify-start md:justify-end">
            {monthShortcuts.map((m) => (
              <Button
                key={m.key}
                size="sm"
                variant={!showCustom && activeKey === m.key ? "default" : "outline"}
                className="text-xs h-7 px-2 capitalize"
                onClick={() => { setActiveKey(m.key); setShowCustom(false); }}
              >
                {m.label}
              </Button>
            ))}
            <Button
              size="sm"
              variant={showCustom ? "default" : "outline"}
              className="text-xs h-7 px-2"
              onClick={() => setShowCustom((v) => !v)}
            >
              Personalizado
            </Button>
          </div>

          {/* Custom date range inputs */}
          {showCustom && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                className="h-7 text-xs w-36"
                value={customFrom}
                max={toDateInputValue(new Date().toISOString())}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
              <span className="text-xs text-muted-foreground">até</span>
              <Input
                type="date"
                className="h-7 text-xs w-36"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </div>
          )}
        </div>
      </header>

      {isFuture && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          O período selecionado inclui datas futuras — os dados parciais serão exibidos.
        </div>
      )}

      {showCustom && (!customFrom || !customTo) && (
        <p className="text-sm text-muted-foreground">
          Selecione as datas de início e fim para visualizar os dados.
        </p>
      )}

      {q.isLoading && <p className="text-sm text-muted-foreground">Carregando dados…</p>}
      {q.isError && <p className="text-sm text-destructive">Erro ao carregar cockpit.</p>}

      {isEmpty && !q.isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <Gauge className="h-10 w-10 text-muted-foreground/40" />
          <p className="font-medium text-muted-foreground">Nenhum dado no período selecionado</p>
          <p className="text-sm text-muted-foreground">Tente selecionar outro mês ou um intervalo diferente.</p>
        </div>
      )}

      {data && !isEmpty && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi icon={<Users />} label="Leads no período" value={data.kpis.totalLeads} />
            <Kpi icon={<TrendingUp />} label="Fecharam" value={data.kpis.totalClosed} />
            <Kpi
              icon={<Percent />}
              label="Conversão"
              value={`${Math.round(data.kpis.conversion * 100)}%`}
            />
            <Kpi
              icon={<Timer />}
              label="Tempo médio até fechar"
              value={
                data.kpis.avgDaysToClose == null
                  ? "—"
                  : `${data.kpis.avgDaysToClose.toFixed(1)} dias`
              }
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Leads por origem */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-serif">Leads por origem</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.byChannel} layout="vertical" margin={{ left: 20 }}>
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 12 }} />
                    <Tooltip cursor={{ fill: "hsl(var(--muted))" }} />
                    <Bar dataKey="leads" radius={[0, 6, 6, 0]}>
                      {data.byChannel.map((c) => (
                        <Bar key={c.source} dataKey="leads" fill={SOURCE_COLORS[c.source]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Timeseries */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-serif">Evolução diária</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.timeseries}>
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(d) => d.slice(5)}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={30} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {CLIENT_SOURCES.map((s) => (
                      <Line
                        key={s.key}
                        type="monotone"
                        dataKey={s.key}
                        name={s.label}
                        stroke={SOURCE_COLORS[s.key]}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Conversão por origem */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-serif">Conversão por origem</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Canal</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">Fecharam</TableHead>
                    <TableHead className="text-right">Conversão</TableHead>
                    <TableHead className="text-right">Tempo médio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byChannel.map((c) => (
                    <TableRow key={c.source}>
                      <TableCell>
                        <span
                          className="inline-block h-2 w-2 rounded-full mr-2 align-middle"
                          style={{ background: SOURCE_COLORS[c.source] }}
                        />
                        {c.label}
                      </TableCell>
                      <TableCell className="text-right">{c.leads}</TableCell>
                      <TableCell className="text-right">{c.closed}</TableCell>
                      <TableCell className="text-right">
                        {c.leads ? `${Math.round(c.conversion * 100)}%` : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {c.avgDaysToClose == null ? "—" : `${c.avgDaysToClose.toFixed(1)} d`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Funil por origem */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-serif">Funil por origem</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {data.funnel.filter((f) => f.stages.some((s) => s.count > 0)).map((f) => {
                const max = Math.max(...f.stages.map((s) => s.count), 1);
                return (
                  <div key={f.source}>
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: SOURCE_COLORS[f.source] }}
                      />
                      <span className="font-medium text-sm">{f.label}</span>
                    </div>
                    <div className="space-y-1.5">
                      {f.stages.map((s) => (
                        <div key={s.stage} className="flex items-center gap-3 text-sm">
                          <span className="w-24 sm:w-40 text-muted-foreground truncate">{s.label}</span>
                          <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                            <div
                              className="h-full transition-all"
                              style={{
                                width: `${(s.count / max) * 100}%`,
                                background: SOURCE_COLORS[f.source],
                                opacity: 0.85,
                              }}
                            />
                          </div>
                          <span className="w-8 text-right tabular-nums">{s.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {data.funnel.every((f) => f.stages.every((s) => s.count === 0)) && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhum lead no período.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Campanhas */}
          <Accordion type="single" collapsible>
            <AccordionItem value="campaigns">
              <AccordionTrigger className="text-sm">
                Detalhamento por campanha ({data.campaigns.length})
              </AccordionTrigger>
              <AccordionContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Canal</TableHead>
                      <TableHead>Campanha</TableHead>
                      <TableHead className="text-right">Leads</TableHead>
                      <TableHead className="text-right">Fecharam</TableHead>
                      <TableHead className="text-right">Conversão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.campaigns.map((c, i) => (
                      <TableRow key={`${c.source}-${c.campaign}-${i}`}>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {CLIENT_SOURCES.find((s) => s.key === c.source)?.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{c.campaign}</TableCell>
                        <TableCell className="text-right">{c.leads}</TableCell>
                        <TableCell className="text-right">{c.closed}</TableCell>
                        <TableCell className="text-right">
                          {c.leads ? `${Math.round(c.conversion * 100)}%` : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {data.campaigns.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-6">
                          Sem campanhas registradas
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </>
      )}
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
          <span className="[&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>
          {label}
        </div>
        <div className="text-2xl font-serif">{value}</div>
      </CardContent>
    </Card>
  );
}
