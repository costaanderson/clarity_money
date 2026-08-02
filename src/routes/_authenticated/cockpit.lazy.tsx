import { createLazyFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getCockpitOverview } from "@/lib/cockpit.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Gauge, TrendingUp, Users, Timer, Percent } from "lucide-react";
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

const PRESETS = [
  { key: "7", label: "Últimos 7 dias", days: 7 },
  { key: "30", label: "Últimos 30 dias", days: 30 },
  { key: "90", label: "Últimos 90 dias", days: 90 },
  { key: "month", label: "Este mês", days: 0 },
] as const;

const SOURCE_COLORS: Record<string, string> = {
  instagram: "#C13584",
  landing_page: "#3B82F6",
  indicacao: "#10B981",
  outro: "#94A3B8",
};

function CockpitPage() {
  const [preset, setPreset] = useState<(typeof PRESETS)[number]["key"]>("30");

  const { from, to } = useMemo(() => {
    const now = new Date();
    const to = now.toISOString();
    let fromDate = new Date();
    if (preset === "month") {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      const days = PRESETS.find((p) => p.key === preset)!.days;
      fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    }
    return { from: fromDate.toISOString(), to };
  }, [preset]);

  const q = useQuery({
    queryKey: ["cockpit", preset],
    queryFn: () => getCockpitOverview({ data: { from, to } }),
  });

  const data = q.data;

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-muted-foreground">Performance de leads</p>
          <h1 className="text-3xl font-serif flex items-center gap-2">
            <Gauge className="h-7 w-7 text-primary" /> Cockpit
          </h1>
        </div>
        <div className="flex gap-1 rounded-lg border p-1 bg-muted/30">
          {PRESETS.map((p) => (
            <Button
              key={p.key}
              variant={preset === p.key ? "default" : "ghost"}
              size="sm"
              onClick={() => setPreset(p.key)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </header>

      {q.isLoading && <p className="text-sm text-muted-foreground">Carregando dados…</p>}
      {q.isError && <p className="text-sm text-destructive">Erro ao carregar cockpit.</p>}

      {data && (
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
            <CardContent>
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
                          <span className="w-40 text-muted-foreground truncate">{s.label}</span>
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
              <AccordionContent>
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
