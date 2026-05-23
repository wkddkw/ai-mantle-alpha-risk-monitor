"use client";

import { FormEvent, useMemo, useState } from "react";

interface Signal {
  id: string;
  severity: "low" | "medium" | "high";
  title: string;
  evidence: string;
}

interface AnalysisResponse {
  target: string;
  targetType: string;
  chain: string;
  score: number;
  aiSummary: string;
  aiProvider: string;
  aiStatus?: string;
  source: string;
  explorerUrl: string;
  snapshot: {
    transactionCount: number;
    failedTransactionCount: number;
    contractVerified: boolean | null;
    contractAgeDays: number | null;
    knownProtocol: string | null;
    labels: string[];
  };
  signals: Signal[];
}

interface WatchEvent {
  id: string;
  title: string;
  target: string;
  protocol: string;
  severity: "low" | "medium" | "high";
  kind: string;
  amount: string;
  time: string;
  score: number;
  evidence: string;
}

const examples = [
  { label: "mETH", value: "mETH" },
  { label: "Merchant Moe", value: "Merchant Moe" },
  {
    label: formatTargetLabel("0x0000000000000000000000000000000000000001"),
    value: "0x0000000000000000000000000000000000000001"
  }
];

const watchEvents: WatchEvent[] = [
  {
    id: "evt-1",
    title: "New unverified contract with failed calls",
    target: "0x0000000000000000000000000000000000000001",
    protocol: "Unknown contract",
    severity: "high",
    kind: "Contract anomaly",
    amount: "10 tx / 40% failed",
    time: "8m ago",
    score: 14,
    evidence: "Unverified source, 4 failed transactions, and only 3 days of history."
  },
  {
    id: "evt-2",
    title: "Smart money entered mETH pool",
    target: "mETH",
    protocol: "mETH",
    severity: "low",
    kind: "Smart money",
    amount: "$2.4M inflow",
    time: "22m ago",
    score: 96,
    evidence: "Known Mantle ecosystem label and low observed failure rate."
  },
  {
    id: "evt-3",
    title: "DEX route shows elevated failed swaps",
    target: "Merchant Moe",
    protocol: "Merchant Moe",
    severity: "medium",
    kind: "Execution quality",
    amount: "96 failed / 820 tx",
    time: "41m ago",
    score: 78,
    evidence: "Known protocol, but 12% observed transaction failure ratio."
  },
  {
    id: "evt-4",
    title: "Low history target added to review queue",
    target: "0x1111111111111111111111111111111111111111",
    protocol: "Manual watchlist",
    severity: "medium",
    kind: "Low history",
    amount: "6 tx sample",
    time: "1h ago",
    score: 64,
    evidence: "Small transaction sample limits confidence until more activity appears."
  }
];

const smartMoneyRows = [
  { label: "mETH accumulator", flow: "+$2.4M", confidence: "High", tag: "Liquid staking" },
  { label: "DEX arbitrage cluster", flow: "+$760K", confidence: "Medium", tag: "Route activity" },
  { label: "New contract deployer", flow: "-$180K", confidence: "Review", tag: "Failure spike" }
];

function getRiskBand(score: number) {
  if (score >= 80) return "low";
  if (score >= 55) return "medium";
  return "high";
}

export default function Home() {
  const [target, setTarget] = useState(examples[0].value);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<WatchEvent>(watchEvents[0]);
  const [recentTargets, setRecentTargets] = useState(examples);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const requestedTarget = target.trim();
    if (!requestedTarget) {
      setError("Enter a target first.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ target: requestedTarget })
      });

      if (!response.ok) {
        throw new Error("Analysis request failed");
      }

      const nextAnalysis = (await response.json()) as AnalysisResponse;
      setAnalysis(nextAnalysis);
      setRecentTargets((items) => {
        const nextItem = {
          label: formatTargetLabel(requestedTarget),
          value: requestedTarget
        };
        const deduped = items.filter(
          (item) => item.value.toLowerCase() !== requestedTarget.toLowerCase()
        );
        return [nextItem, ...deduped].slice(0, 5);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const visibleAnalysis = useMemo(
    () =>
      analysis || {
        target: "mETH",
        targetType: "search",
        chain: "Mantle",
        score: 96,
        aiSummary:
          "Risk score 96/100. No major rule-based red flags appeared in the current read-only Mantle data sample.",
        aiProvider: "fallback",
        aiStatus: "DEEPSEEK_API_KEY is not configured",
        source: "demo-fallback",
        explorerUrl: "https://explorer.mantle.xyz",
        snapshot: {
          transactionCount: 5000,
          failedTransactionCount: 2,
          contractVerified: true,
          contractAgeDays: 300,
          knownProtocol: "mETH",
          labels: ["liquid staking", "Mantle ecosystem"]
        },
        signals: [
          {
            id: "known-protocol",
            severity: "low" as const,
            title: "Known Mantle ecosystem label",
            evidence: "mETH is marked as a known protocol in the current label set."
          }
        ]
      },
    [analysis]
  );
  const riskBand = getRiskBand(visibleAnalysis.score);

  return (
    <main className="shell" data-risk={riskBand}>
      <section className="topbar">
        <div>
          <p className="eyebrow">The Turing Test Hackathon 2026</p>
          <h1>Mantle Alpha Watchtower</h1>
        </div>
        <span className="network">AI anomaly watchlist</span>
      </section>

      <section className="metrics">
        <Metric label="Open anomalies" value="4" tone="high" />
        <Metric label="Smart money inflow" value="$3.16M" tone="low" />
        <Metric label="Failed tx spike" value="40%" tone="high" />
        <Metric label="AI status" value={visibleAnalysis.aiProvider} tone="low" />
      </section>

      <section className="workspace watchtower">
        <aside className="panel controls">
          <form onSubmit={submit}>
            <label htmlFor="target">Target</label>
            <input
              id="target"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              placeholder="Protocol name, address, or transaction hash"
            />
            <button type="submit" disabled={loading}>
              {loading ? "Analyzing target..." : "Analyze target"}
            </button>
          </form>

          {loading ? <p className="loadingLine">Reading Mantle signals and AI verdict...</p> : null}

          <div className="samples">
            {recentTargets.map((example) => (
              <button
                key={example.value}
                type="button"
                onClick={() => setTarget(example.value)}
                title={example.value}
              >
                <span>{example.label}</span>
              </button>
            ))}
          </div>

          <div className="notice">
            <strong>Safety boundary</strong>
            <p>No wallet connection, no custody, no private keys, no trading, no local node.</p>
          </div>

          {error ? <p className="error">{error}</p> : null}
        </aside>

        <section className="panel report">
          <div className="scoreRow">
            <div>
              <p className="label">Selected event risk</p>
              <strong className="scoreValue">{analysis ? visibleAnalysis.score : selectedEvent.score}</strong>
              <span>/100</span>
              <em>{analysis ? riskBand : selectedEvent.severity} risk</em>
            </div>
            <a href={visibleAnalysis.explorerUrl} target="_blank" rel="noreferrer">
              Open explorer
            </a>
          </div>

          <div className="facts">
            <Fact label="Chain" value={visibleAnalysis.chain} />
            <Fact label="Target type" value={visibleAnalysis.targetType} />
            <Fact label="Source" value={visibleAnalysis.source} />
            <Fact label="AI provider" value={visibleAnalysis.aiProvider} />
            <Fact label="Known label" value={visibleAnalysis.snapshot.knownProtocol || "N/A"} />
            <Fact label="Transactions" value={String(visibleAnalysis.snapshot.transactionCount)} />
            <Fact label="Failed tx" value={String(visibleAnalysis.snapshot.failedTransactionCount)} />
          </div>
          {visibleAnalysis.aiStatus ? (
            <p className="statusLine">AI status: {visibleAnalysis.aiStatus}</p>
          ) : null}
        </section>
      </section>

      <section className="monitorGrid">
        <section className="panel feed">
          <div className="sectionHead">
            <p className="label">Live anomaly feed</p>
            <strong>Priority queue</strong>
          </div>
          {watchEvents.map((event) => (
            <button
              className="eventRow"
              data-severity={event.severity}
              key={event.id}
              type="button"
              onClick={() => {
                setSelectedEvent(event);
                setTarget(event.target);
                setAnalysis(null);
              }}
            >
              <span>{event.time}</span>
              <strong>{event.title}</strong>
              <em>{event.protocol}</em>
              <b>{event.amount}</b>
            </button>
          ))}
        </section>

        <section className="panel smartMoney">
          <div className="sectionHead">
            <p className="label">Smart money</p>
            <strong>Wallet clusters</strong>
          </div>
          {smartMoneyRows.map((row) => (
            <div className="moneyRow" key={row.label}>
              <strong>{row.label}</strong>
              <span>{row.tag}</span>
              <b>{row.flow}</b>
              <em>{row.confidence}</em>
            </div>
          ))}
        </section>
      </section>

      <section className="signals">
        {visibleAnalysis.signals.map((signal) => (
          <article className="signal" data-severity={signal.severity} key={signal.id}>
            <span>{signal.severity}</span>
            <h2>{signal.title}</h2>
            <p>{signal.evidence}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="metric" data-tone={tone}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatTargetLabel(value: string) {
  if (/^0x[a-fA-F0-9]{40}$/.test(value)) {
    return `${value.slice(0, 6)}...${value.slice(22, 28)}...${value.slice(-4)}`;
  }

  if (/^0x[a-fA-F0-9]{64}$/.test(value)) {
    return `${value.slice(0, 8)}...${value.slice(32, 40)}...${value.slice(-6)}`;
  }

  return value;
}
