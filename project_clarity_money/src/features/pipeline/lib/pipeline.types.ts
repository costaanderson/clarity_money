export const PIPELINE_STAGES = [
  { key: "novo", label: "Novo" },
  { key: "primeiro_contato", label: "Primeiro contato" },
  { key: "reuniao_agendada", label: "Reunião agendada" },
  { key: "reuniao_realizada", label: "Reunião realizada" },
  { key: "fechamento", label: "Fechamento" },
  { key: "contrato_enviado", label: "Contrato enviado" },
  { key: "em_andamento", label: "Em andamento" },
] as const;

export const PIPELINE_STAGE_FINALIZADO = { key: "finalizado", label: "Finalizado" } as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number]["key"] | "finalizado";
