// Tipo de uma etapa vinda do banco (pipeline_stages)
export type PipelineStageRow = {
  id: string;
  label: string;
  slug: string;
  position: number;
  is_won: boolean;
};

// Slug armazenado em clients.pipeline_stage — agora é texto livre
export type PipelineStage = string;

// Etapas padrão usadas como fallback enquanto o fetch não carrega
export const DEFAULT_PIPELINE_STAGES: PipelineStageRow[] = [
  { id: "novo",               slug: "novo",               label: "Novo",               position: 0, is_won: false },
  { id: "primeiro_contato",   slug: "primeiro_contato",   label: "Primeiro contato",   position: 1, is_won: false },
  { id: "reuniao_agendada",   slug: "reuniao_agendada",   label: "Reunião agendada",   position: 2, is_won: false },
  { id: "reuniao_realizada",  slug: "reuniao_realizada",  label: "Reunião realizada",  position: 3, is_won: false },
  { id: "fechamento",         slug: "fechamento",          label: "Fechamento",          position: 4, is_won: false },
  { id: "contrato_enviado",   slug: "contrato_enviado",   label: "Contrato enviado",   position: 5, is_won: false },
  { id: "em_andamento",       slug: "em_andamento",       label: "Em andamento",       position: 6, is_won: false },
  { id: "finalizado",         slug: "finalizado",          label: "Finalizado",          position: 7, is_won: true  },
];
