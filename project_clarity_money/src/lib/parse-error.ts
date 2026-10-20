/**
 * Converte mensagens de erro técnicas (Supabase, PostgreSQL, APIs externas)
 * em mensagens amigáveis em português para exibição ao usuário.
 */

const KNOWN_PATTERNS: [RegExp, string][] = [
  // PostgreSQL / Supabase DB
  [/duplicate key value violates unique constraint/i, "Este registro já existe."],
  [/null value in column .+ violates not-null constraint/i, "Preencha todos os campos obrigatórios."],
  [/violates foreign key constraint/i, "Este item está vinculado a outros registros e não pode ser removido."],
  [/violates check constraint/i, "Valor inválido para este campo."],
  [/permission denied for/i, "Você não tem permissão para realizar esta ação."],
  [/relation .+ does not exist/i, "Não foi possível concluir a ação. Tente novamente."],
  [/value too long for type/i, "Um dos campos excede o tamanho máximo permitido."],

  // Supabase Auth
  [/invalid login credentials/i, "Email ou senha incorretos."],
  [/email not confirmed/i, "Confirme seu email antes de entrar."],
  [/user already registered/i, "Este email já está cadastrado."],
  [/password should be at least/i, "A senha deve ter pelo menos 6 caracteres."],
  [/for security purposes.+only request this/i, "Muitas tentativas. Aguarde alguns minutos e tente novamente."],
  [/email rate limit exceeded/i, "Muitas tentativas. Aguarde alguns minutos e tente novamente."],

  // Sessão / token
  [/JWT expired/i, "Sessão expirada. Faça login novamente."],
  [/invalid_grant/i, "Sessão expirada. Faça login novamente."],
  [/Unauthorized:/i, "Sessão expirada. Faça login novamente."],
  [/Invalid token/i, "Sessão expirada. Faça login novamente."],

  // Google / Drive
  [/Google token exchange failed/i, "Falha ao conectar com o Google. Tente reconectar nas Configurações."],
  [/Drive API list error/i, "Não foi possível acessar o Google Drive. Tente novamente."],
];

// Padrões que indicam erro técnico sem mapeamento explícito
const TECHNICAL_PATTERNS: RegExp[] = [
  /violates/i,
  /\bconstraint\b/i,
  /\bERROR:\b/,
  /\bFATAL:\b/,
  /does not exist/i,
  /^Could not /,
  /^Failed to fetch/,
  /^NetworkError/,
  /PGRST/,
];

export function isSessionError(message: string): boolean {
  return (
    /Unauthorized:/i.test(message) ||
    /JWT expired/i.test(message) ||
    /Invalid token/i.test(message) ||
    /invalid_grant/i.test(message)
  );
}

export function parseError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  for (const [pattern, friendly] of KNOWN_PATTERNS) {
    if (pattern.test(message)) return friendly;
  }

  for (const pattern of TECHNICAL_PATTERNS) {
    if (pattern.test(message)) return "Não foi possível concluir a ação. Tente novamente.";
  }

  return message;
}
