import { describe, it, expect } from "vitest";
import { createTaskSchema, updateTaskSchema } from "../task-schemas";
import { toIsoOrNull } from "../task-date";

// ─── createTaskSchema ────────────────────────────────────────────────────────

describe("createTaskSchema", () => {
  it("aceita payload mínimo válido (somente título)", () => {
    const result = createTaskSchema.safeParse({ title: "Ligar para cliente" });
    expect(result.success).toBe(true);
  });

  it("aceita payload completo com data futura", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = createTaskSchema.safeParse({
      title: "Reunião de planejamento",
      description: "Preparar pauta",
      due_at: tomorrow.toISOString(),
      client_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    });

    expect(result.success).toBe(true);
  });

  it("aceita description: null (correção do bug do dashboard)", () => {
    const result = createTaskSchema.safeParse({
      title: "Tarefa via dashboard",
      description: null,
      due_at: null,
      client_id: null,
    });
    expect(result.success).toBe(true);
  });

  it("aceita description: undefined", () => {
    const result = createTaskSchema.safeParse({ title: "Tarefa sem descrição" });
    expect(result.success).toBe(true);
  });

  it("aceita description string vazia", () => {
    const result = createTaskSchema.safeParse({ title: "Tarefa", description: "" });
    expect(result.success).toBe(true);
  });

  it("rejeita título vazio", () => {
    const result = createTaskSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("rejeita título acima de 200 caracteres", () => {
    const result = createTaskSchema.safeParse({ title: "x".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("rejeita client_id com formato inválido (não-UUID)", () => {
    const result = createTaskSchema.safeParse({
      title: "Tarefa",
      client_id: "nao-e-um-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("aceita client_id: null", () => {
    const result = createTaskSchema.safeParse({ title: "Tarefa", client_id: null });
    expect(result.success).toBe(true);
  });
});

// ─── updateTaskSchema ────────────────────────────────────────────────────────

describe("updateTaskSchema", () => {
  it("aceita atualização válida com id e título", () => {
    const result = updateTaskSchema.safeParse({
      id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      title: "Novo título",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita id inválido (não-UUID)", () => {
    const result = updateTaskSchema.safeParse({
      id: "nao-e-uuid",
      title: "Título",
    });
    expect(result.success).toBe(false);
  });

  it("aceita description: null na atualização", () => {
    const result = updateTaskSchema.safeParse({
      id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      description: null,
    });
    expect(result.success).toBe(true);
  });
});

// ─── toIsoOrNull ─────────────────────────────────────────────────────────────

describe("toIsoOrNull", () => {
  it("retorna null para string vazia", () => {
    expect(toIsoOrNull("")).toBeNull();
  });

  it("retorna null para string inválida", () => {
    expect(toIsoOrNull("nao-e-data")).toBeNull();
  });

  it("converte data futura válida para ISO string", () => {
    const result = toIsoOrNull("2030-06-15T10:30");
    expect(result).not.toBeNull();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("converte data no formato datetime-local (sem fuso) para ISO string", () => {
    const result = toIsoOrNull("2025-12-31T23:59");
    expect(result).not.toBeNull();
    // Deve ser uma ISO string válida
    expect(() => new Date(result!).toISOString()).not.toThrow();
  });

  it("retorna null para data com mês inválido", () => {
    expect(toIsoOrNull("2025-13-01T10:00")).toBeNull();
  });
});
