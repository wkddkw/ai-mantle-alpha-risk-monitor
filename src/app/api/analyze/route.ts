import { NextResponse } from "next/server";
import { buildMantleAnalysis } from "@/lib/mantle";
import { buildReportPrompt } from "@/lib/risk";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { target?: string };
  const target = typeof body.target === "string" ? body.target : "";

  const analysis = await buildMantleAnalysis(target);
  const aiSummary = await askDeepSeek(analysis).catch(() => analysis.aiSummary);

  return NextResponse.json({
    ...analysis,
    aiSummary
  });
}

async function askDeepSeek(analysis: Awaited<ReturnType<typeof buildMantleAnalysis>>) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return analysis.aiSummary;

  const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  const prompt = buildReportPrompt({
    target: analysis.target,
    chain: analysis.chain,
    targetType: analysis.targetType as "address" | "transaction" | "search",
    signals: analysis.signals
  });

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "Return a concise Web3 risk summary. Stay evidence-based. Do not provide financial advice."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.2
    })
  });

  if (!response.ok) return analysis.aiSummary;

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return data.choices?.[0]?.message?.content?.trim() || analysis.aiSummary;
}
