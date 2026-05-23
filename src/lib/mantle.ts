import { createPublicClient, http, isAddress } from "viem";
import { mantle } from "viem/chains";
import { buildRiskSignals, normalizeTargetInput, scoreSignals, type RiskSnapshot } from "./risk";

export interface AnalysisResult {
  target: string;
  targetType: string;
  chain: string;
  snapshot: RiskSnapshot;
  signals: ReturnType<typeof buildRiskSignals>;
  score: number;
  aiSummary: string;
  aiProvider: "fallback";
  source: "live-rpc" | "demo-fallback";
  explorerUrl: string;
}

const demoSnapshots = new Map<string, RiskSnapshot>([
  [
    "meth",
    {
      target: "mETH",
      chain: "Mantle",
      transactionCount: 5000,
      failedTransactionCount: 2,
      contractVerified: true,
      contractAgeDays: 300,
      knownProtocol: "mETH",
      labels: ["liquid staking", "Mantle ecosystem"]
    }
  ],
  [
    "merchant moe",
    {
      target: "Merchant Moe",
      chain: "Mantle",
      transactionCount: 820,
      failedTransactionCount: 96,
      contractVerified: true,
      contractAgeDays: 45,
      knownProtocol: "Merchant Moe",
      labels: ["dex", "Mantle ecosystem"]
    }
  ],
  [
    "0x0000000000000000000000000000000000000001",
    {
      target: "0x0000000000000000000000000000000000000001",
      chain: "Mantle",
      transactionCount: 10,
      failedTransactionCount: 4,
      contractVerified: false,
      contractAgeDays: 3,
      knownProtocol: null,
      labels: ["demo high-risk contract"]
    }
  ]
]);

export async function buildMantleAnalysis(targetInput: string): Promise<AnalysisResult> {
  const normalized = normalizeTargetInput(targetInput || "mETH");
  const chain = "Mantle";
  const explorerBase = process.env.MANTLE_EXPLORER_URL || "https://explorer.mantle.xyz";
  let snapshot: RiskSnapshot;
  let source: AnalysisResult["source"] = "demo-fallback";

  const demoSnapshot = demoSnapshots.get(normalized.value.toLowerCase());

  if (demoSnapshot) {
    snapshot = demoSnapshot;
  } else if (normalized.type === "address" && isAddress(normalized.value)) {
    const client = createPublicClient({
      chain: mantle,
      transport: http(process.env.MANTLE_RPC_URL || "https://rpc.mantle.xyz")
    });

    const [transactionCount, bytecode] = await Promise.all([
      client.getTransactionCount({ address: normalized.value }),
      client.getBytecode({ address: normalized.value })
    ]);

    snapshot = {
      target: normalized.value,
      chain,
      transactionCount,
      failedTransactionCount: 0,
      contractVerified: bytecode ? null : true,
      contractAgeDays: null,
      knownProtocol: null,
      labels: bytecode ? ["contract"] : ["externally owned account"]
    };
    source = "live-rpc";
  } else {
    snapshot = {
      target: normalized.value,
      chain,
      transactionCount: 6,
      failedTransactionCount: 1,
      contractVerified: null,
      contractAgeDays: null,
      knownProtocol: null,
      labels: ["manual research target"]
    };
  }

  const signals = buildRiskSignals(snapshot);
  const score = scoreSignals(signals);

  return {
    target: normalized.value,
    targetType: normalized.type,
    chain,
    snapshot,
    signals,
    score,
    aiSummary: buildFallbackSummary(score, signals),
    aiProvider: "fallback",
    source,
    explorerUrl: buildExplorerUrl(explorerBase, normalized.value, normalized.type)
  };
}

function buildFallbackSummary(score: number, signals: AnalysisResult["signals"]): string {
  const highCount = signals.filter((signal) => signal.severity === "high").length;
  const mediumCount = signals.filter((signal) => signal.severity === "medium").length;

  if (highCount > 0) {
    return `Risk score ${score}/100. The available Mantle evidence includes ${highCount} high-severity signal(s). Treat this as a review queue item, not as investment advice.`;
  }

  if (mediumCount > 0) {
    return `Risk score ${score}/100. The target has review points but no high-severity rule fired in the current read-only sample.`;
  }

  return `Risk score ${score}/100. No major rule-based red flags appeared in the current read-only Mantle data sample.`;
}

function buildExplorerUrl(base: string, value: string, type: string): string {
  if (type === "address") return `${base.replace(/\/$/, "")}/address/${value}`;
  if (type === "transaction") return `${base.replace(/\/$/, "")}/tx/${value}`;
  return base;
}
