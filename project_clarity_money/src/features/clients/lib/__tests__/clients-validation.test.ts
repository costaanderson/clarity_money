import { describe, it, expect } from "vitest";
import { clientSchema } from "../clients.functions";

describe("clientSchema — pipeline_stage", () => {
  it("aceita payload mínimo sem pipeline_stage (undefined → DB default 'novo')", () => {
    const result = clientSchema.safeParse({ type: "PF", name: "Ana Lima" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pipeline_stage).toBeUndefined();
    }
  });

  it("aceita pipeline_stage 'novo' explícito", () => {
    const result = clientSchema.safeParse({ type: "PF", name: "Ana Lima", pipeline_stage: "novo" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pipeline_stage).toBe("novo");
    }
  });

  it("aceita pipeline_stage 'reuniao_agendada' e preserva o valor", () => {
    const result = clientSchema.safeParse({
      type: "PJ",
      name: "Empresa X",
      pipeline_stage: "reuniao_agendada",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pipeline_stage).toBe("reuniao_agendada");
    }
  });

  it("aceita todos os estágios válidos do pipeline", () => {
    const stages = [
      "novo",
      "primeiro_contato",
      "reuniao_agendada",
      "reuniao_realizada",
      "fechamento",
      "contrato_enviado",
      "em_andamento",
    ] as const;

    for (const stage of stages) {
      const result = clientSchema.safeParse({ type: "PF", name: "Cliente", pipeline_stage: stage });
      expect(result.success, `stage '${stage}' deveria ser aceito`).toBe(true);
    }
  });

  it("rejeita pipeline_stage com valor inválido", () => {
    const result = clientSchema.safeParse({
      type: "PF",
      name: "Ana Lima",
      pipeline_stage: "etapa_invalida",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita payload sem campos obrigatórios (type e name)", () => {
    const result = clientSchema.safeParse({ pipeline_stage: "novo" });
    expect(result.success).toBe(false);
  });
});
