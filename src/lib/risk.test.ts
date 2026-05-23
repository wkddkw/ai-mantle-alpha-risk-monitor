import { describe, expect, test } from "vitest";
import { buildRiskSignals, buildReportPrompt, normalizeTargetInput } from "./risk";

describe("normalizeTargetInput", () => {
  test("classifies EVM addresses, transaction hashes, and unknown text", () => {
    expect(normalizeTargetInput("0x0000000000000000000000000000000000000001")).toEqual({
      type: "address",
      value: "0x0000000000000000000000000000000000000001"
    });

    expect(
      normalizeTargetInput("0x" + "a".repeat(64))
    ).toEqual({
      type: "transaction",
      value: "0x" + "a".repeat(64)
    });

    expect(normalizeTargetInput("Merchant Moe")).toEqual({
      type: "search",
      value: "Merchant Moe"
    });
  });
});

describe("buildRiskSignals", () => {
  test("flags missing contract verification and high failed transaction ratio", () => {
    const signals = buildRiskSignals({
      target: "0x0000000000000000000000000000000000000001",
      chain: "Mantle",
      transactionCount: 10,
      failedTransactionCount: 4,
      contractVerified: false,
      contractAgeDays: 3,
      knownProtocol: null,
      labels: []
    });

    expect(signals.map((signal) => signal.id)).toContain("unverified-contract");
    expect(signals.map((signal) => signal.id)).toContain("high-failure-rate");
    expect(signals.map((signal) => signal.id)).toContain("new-contract");
    expect(signals.some((signal) => signal.severity === "high")).toBe(true);
  });

  test("keeps known established protocols lower risk", () => {
    const signals = buildRiskSignals({
      target: "mETH",
      chain: "Mantle",
      transactionCount: 5000,
      failedTransactionCount: 2,
      contractVerified: true,
      contractAgeDays: 300,
      knownProtocol: "mETH",
      labels: ["RWA", "yield"]
    });

    expect(signals.map((signal) => signal.id)).toContain("known-protocol");
    expect(signals.filter((signal) => signal.severity === "high")).toHaveLength(0);
  });
});

describe("buildReportPrompt", () => {
  test("forces evidence-based, non-financial-advice output", () => {
    const prompt = buildReportPrompt({
      target: "0x0000000000000000000000000000000000000001",
      chain: "Mantle",
      targetType: "address",
      signals: [
        {
          id: "sample",
          severity: "medium",
          title: "Sample signal",
          evidence: "Observed from Mantle explorer data."
        }
      ]
    });

    expect(prompt).toContain("Mantle");
    expect(prompt).toContain("not financial advice");
    expect(prompt).toContain("Do not invent facts");
    expect(prompt).toContain("Sample signal");
  });
});
