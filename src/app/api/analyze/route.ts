import { NextResponse } from "next/server";
import { buildMantleAnalysis } from "@/lib/mantle";
import { buildReportPrompt } from "@/lib/risk";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { target?: string };
  const target = typeof body.target === "string" ? body.target : "";

  const analysis = await buildMantleAnalysis(target);
  const aiResult = await askDeepSeek(analysis);

  return NextResponse.json({
    ...analysis,
    aiSummary: aiResult.summary,
    aiProvider: aiResult.provider,
    aiStatus: aiResult.status
  });
}

async function askDeepSeek(analysis: Awaited<ReturnType<typeof buildMantleAnalysis>>) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return {
      provider: "fallback" as const,
      status: "DEEPSEEK_API_KEY is not configured",
      summary: analysis.aiSummary
    };
  }

  const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  const prompt = buildReportPrompt({
    target: analysis.target,
    chain: analysis.chain,
    targetType: analysis.targetType as "address" | "transaction" | "search",
    signals: analysis.signals
  });

  try {
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
            "You are a Mantle data analyst. Answer the user's natural-language query using only the provided Mantle signals. Return 3 concise bullets under 100 words total. Do not provide financial advice. Do not use Markdown headings."
        },
        { role: "user", content: prompt }
      ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      return {
        provider: "fallback" as const,
        status: `DeepSeek request failed with HTTP ${response.status}`,
        summary: analysis.aiSummary
      };
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const summary = data.choices?.[0]?.message?.content?.trim();

    if (!summary) {
      return {
        provider: "fallback" as const,
        status: "DeepSeek returned an empty response",
        summary: analysis.aiSummary
      };
    }

    return {
      provider: "deepseek" as const,
      status: "DeepSeek response generated",
      summary
    };
  } catch (error) {
    return {
      provider: "fallback" as const,
      status: error instanceof Error ? error.message : "DeepSeek request failed",
      summary: analysis.aiSummary
    };
  }
}
