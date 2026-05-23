export type TargetType = "address" | "transaction" | "search";
export type SignalSeverity = "low" | "medium" | "high";

export interface NormalizedTarget {
  type: TargetType;
  value: string;
}

export interface RiskSignal {
  id: string;
  severity: SignalSeverity;
  title: string;
  evidence: string;
}

export interface RiskSnapshot {
  target: string;
  chain: string;
  transactionCount: number;
  failedTransactionCount: number;
  contractVerified: boolean | null;
  contractAgeDays: number | null;
  knownProtocol: string | null;
  labels: string[];
}

export interface ReportPromptInput {
  target: string;
  chain: string;
  targetType: TargetType;
  signals: RiskSignal[];
}

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const TX_HASH_RE = /^0x[a-fA-F0-9]{64}$/;

export function normalizeTargetInput(input: string): NormalizedTarget {
  const value = input.trim();

  if (ADDRESS_RE.test(value)) {
    return { type: "address", value };
  }

  if (TX_HASH_RE.test(value)) {
    return { type: "transaction", value };
  }

  return { type: "search", value };
}

export function buildRiskSignals(snapshot: RiskSnapshot): RiskSignal[] {
  const signals: RiskSignal[] = [];

  if (snapshot.contractVerified === false) {
    signals.push({
      id: "unverified-contract",
      severity: "high",
      title: "Contract source is not verified",
      evidence: `${snapshot.chain} explorer data indicates the contract source is not verified.`
    });
  }

  if (snapshot.transactionCount > 0) {
    const failedRatio = snapshot.failedTransactionCount / snapshot.transactionCount;
    if (failedRatio >= 0.3) {
      signals.push({
        id: "high-failure-rate",
        severity: "high",
        title: "High failed transaction ratio",
        evidence: `${snapshot.failedTransactionCount} of ${snapshot.transactionCount} observed transactions failed (${Math.round(
          failedRatio * 100
        )}%).`
      });
    } else if (failedRatio >= 0.1) {
      signals.push({
        id: "elevated-failure-rate",
        severity: "medium",
        title: "Elevated failed transaction ratio",
        evidence: `${Math.round(failedRatio * 100)}% of observed transactions failed.`
      });
    }
  }

  if (snapshot.contractAgeDays !== null && snapshot.contractAgeDays <= 7) {
    signals.push({
      id: "new-contract",
      severity: "medium",
      title: "Newly deployed contract",
      evidence: `Contract age is approximately ${snapshot.contractAgeDays} day(s), which leaves limited history to review.`
    });
  }

  if (snapshot.transactionCount > 0 && snapshot.transactionCount < 5) {
    signals.push({
      id: "low-activity",
      severity: "medium",
      title: "Limited activity sample",
      evidence: `Only ${snapshot.transactionCount} observed transaction(s) were available, so confidence is limited.`
    });
  }

  if (snapshot.knownProtocol) {
    signals.push({
      id: "known-protocol",
      severity: "low",
      title: "Known Mantle ecosystem label",
      evidence: `${snapshot.knownProtocol} is marked as a known protocol in the current label set.`
    });
  }

  if (signals.length === 0) {
    signals.push({
      id: "no-major-red-flags",
      severity: "low",
      title: "No major red flags in available data",
      evidence: "The available read-only indicators did not trigger high-severity rules."
    });
  }

  return signals;
}

export function scoreSignals(signals: RiskSignal[]): number {
  const penalty = signals.reduce((total, signal) => {
    if (signal.severity === "high") return total + 34;
    if (signal.severity === "medium") return total + 18;
    return total + 4;
  }, 0);

  return Math.max(0, Math.min(100, 100 - penalty));
}

export function buildReportPrompt(input: ReportPromptInput): string {
  const signalLines = input.signals
    .map((signal) => `- [${signal.severity}] ${signal.title}: ${signal.evidence}`)
    .join("\n");

  return [
    "You are an evidence-based Web3 risk analyst for a hackathon demo.",
    `Chain: ${input.chain}`,
    `Target type: ${input.targetType}`,
    `Target: ${input.target}`,
    "Explain the observed Mantle data in plain English.",
    "This is not financial advice.",
    "Do not invent facts, balances, partnerships, token prices, or audit status.",
    "If evidence is missing, say what is missing and how a reviewer can verify it.",
    "Signals:",
    signalLines
  ].join("\n");
}
