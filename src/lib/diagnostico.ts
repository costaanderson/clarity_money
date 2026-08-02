// Perguntas, estágios e cálculo do Raio-X do Sono Financeiro.
// Compartilhado entre a LP pública e a exibição na ficha do cliente.

export const DIAGNOSTIC_TYPE = "sono_financeiro";

export type DiagnosticOption = { label: string; value: number };
export type DiagnosticQuestion = {
  eyebrow: string;
  text: string;
  options: DiagnosticOption[];
};

export const QUESTIONS: DiagnosticQuestion[] = [
  {
    eyebrow: "O pesadelo",
    text: "Nas últimas semanas, quantas vezes uma dívida ou conta te tirou o sono?",
    options: [
      { label: "Quase todas as noites", value: 0 },
      { label: "Algumas vezes por semana", value: 1 },
      { label: "Raramente", value: 2 },
      { label: "Nunca — durmo tranquilo", value: 3 },
    ],
  },
  {
    eyebrow: "O raio-x",
    text: "Se eu te acordasse agora e perguntasse quanto você deve hoje, somando tudo, você saberia responder na hora?",
    options: [
      { label: "Não, nem sei por onde começar a contar", value: 0 },
      { label: "Tenho uma ideia bem vaga", value: 1 },
      { label: "Sei mais ou menos", value: 2 },
      { label: "Sei exatamente, tenho tudo mapeado", value: 3 },
    ],
  },
  {
    eyebrow: "O que fica pra trás",
    text: "Você já disse “não” pra algum sonho — viagem, curso, decisão de vida — por causa de uma dívida ou insegurança financeira?",
    options: [
      { label: "Sim, isso trava minha vida o tempo todo", value: 0 },
      { label: "Sim, algumas vezes", value: 1 },
      { label: "Raramente", value: 2 },
      { label: "Não, minhas finanças não travam minhas decisões", value: 3 },
    ],
  },
  {
    eyebrow: "O reflexo",
    text: "Quando você lembra do seu extrato bancário, o que vem primeiro?",
    options: [
      { label: "Ansiedade — eu evito olhar", value: 0 },
      { label: "Um aperto no estômago", value: 1 },
      { label: "Curiosidade tranquila", value: 2 },
      { label: "Tranquilidade, sei o que vou encontrar", value: 3 },
    ],
  },
  {
    eyebrow: "O colchão de segurança",
    text: "Como está sua reserva de emergência hoje?",
    options: [
      { label: "Não tenho nenhuma", value: 0 },
      { label: "Tenho, mas é pequena demais pra me tranquilizar", value: 1 },
      { label: "Tenho uma reserva razoável", value: 2 },
      { label: "Tenho uma reserva sólida — durmo tranquilo com ela", value: 3 },
    ],
  },
  {
    eyebrow: "A rotina",
    text: "Hoje, como você organiza suas contas e dívidas no dia a dia?",
    options: [
      { label: "Não organizo, vou apagando incêndio", value: 0 },
      { label: "Tenho um controle só na cabeça, nada escrito", value: 1 },
      { label: "Uso planilha ou app, mas sem constância", value: 2 },
      { label: "Tenho um sistema e acompanho com frequência", value: 3 },
    ],
  },
  {
    eyebrow: "A noite passada",
    text: "Pensando nos últimos meses, como você classificaria suas noites quando o assunto é dinheiro?",
    options: [
      { label: "Insônia total", value: 0 },
      { label: "Sono leve — durmo, mas não descanso de verdade", value: 1 },
      { label: "Durmo bem na maioria das noites", value: 2 },
      { label: "Sono tranquilo — dinheiro não tira mais meu sono", value: 3 },
    ],
  },
];

export const MAX_SCORE = QUESTIONS.length * 3; // 21

export type DiagnosticStage = {
  key: string;
  max: number;
  icon: string;
  label: string;
  lede: string;
  insights: string[];
};

export const STAGES: DiagnosticStage[] = [
  {
    key: "insonia",
    max: 5,
    icon: "🌑",
    label: "Insônia Financeira",
    lede: "Suas noites estão sendo sequestradas pelas contas. Isso não é falta de esforço — é falta de direção.",
    insights: [
      "Você carrega o peso das dívidas sozinho(a), sem um mapa claro do tamanho real do problema.",
      "A falta de visão gera mais ansiedade do que a própria dívida.",
      "O primeiro passo não é “se esforçar mais”, é organizar o que já existe.",
    ],
  },
  {
    key: "sono_leve",
    max: 10,
    icon: "🌘",
    label: "Sono Leve",
    lede: "Você dorme, mas o corpo não descansa de verdade. Uma parte de você está sempre em alerta com o dinheiro.",
    insights: [
      "Você já tem algum controle, mas ele vive mais na cabeça do que no papel.",
      "Pequenas decisões financeiras ainda pesam mais do que deveriam no seu dia.",
      "Com a estrutura certa, esse alerta constante tende a baixar rápido.",
    ],
  },
  {
    key: "sono_interrompido",
    max: 16,
    icon: "🌗",
    label: "Sono Interrompido",
    lede: "Você já organizou boa parte da vida financeira — mas ainda acorda de vez em quando com aquela dúvida: “será que vai dar certo?”",
    insights: [
      "A base está construída; falta blindar essa base contra imprevistos.",
      "Você tem espaço pra tomar decisões maiores com mais segurança do que tem hoje.",
      "O que falta não é esforço — é um olhar de fora pra destravar o próximo nível.",
    ],
  },
  {
    key: "quase_la",
    max: MAX_SCORE,
    icon: "🌕",
    label: "Quase Lá",
    lede: "Você já dorme bem na maioria das noites. Falta pouco pra virar sono tranquilo em qualquer cenário.",
    insights: [
      "Sua relação com dinheiro já é mais saudável do que a da maioria.",
      "Esse é o momento certo de pensar em crescer com segurança, não só em não perder o que já tem.",
      "Um olhar especializado agora serve pra proteger e acelerar, não pra apagar incêndio.",
    ],
  },
];

export function getStage(score: number): DiagnosticStage {
  return STAGES.find((s) => score <= s.max) ?? STAGES[STAGES.length - 1];
}
