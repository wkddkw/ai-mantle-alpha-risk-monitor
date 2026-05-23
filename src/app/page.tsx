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

const examples = [
  "mETH",
  "Merchant Moe",
  "0x0000000000000000000000000000000000000001"
];

export default function Home() {
  const [target, setTarget] = useState(examples[0]);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ target })
      });

      if (!response.ok) {
        throw new Error("Analysis request failed");
      }

      setAnalysis((await response.json()) as AnalysisResponse);
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

  return (
    <main className="shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">The Turing Test Hackathon 2026</p>
          <h1>AI Mantle Alpha & Risk Monitor</h1>
        </div>
        <span className="network">Mantle read-only demo</span>
      </section>

      <section className="workspace">
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
              {loading ? "Analyzing..." : "Analyze target"}
            </button>
          </form>

          <div className="samples">
            {examples.map((example) => (
              <button key={example} type="button" onClick={() => setTarget(example)}>
                {example}
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
              <p className="label">Risk score</p>
              <strong>{visibleAnalysis.score}</strong>
              <span>/100</span>
            </div>
            <a href={visibleAnalysis.explorerUrl} target="_blank" rel="noreferrer">
              Open explorer
            </a>
          </div>

          <div className="summary">
            <p>{visibleAnalysis.aiSummary}</p>
          </div>

          <div className="facts">
            <Fact label="Chain" value={visibleAnalysis.chain} />
            <Fact label="Target type" value={visibleAnalysis.targetType} />
            <Fact label="Source" value={visibleAnalysis.source} />
            <Fact label="Known label" value={visibleAnalysis.snapshot.knownProtocol || "N/A"} />
            <Fact label="Transactions" value={String(visibleAnalysis.snapshot.transactionCount)} />
            <Fact label="Failed tx" value={String(visibleAnalysis.snapshot.failedTransactionCount)} />
          </div>
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

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
