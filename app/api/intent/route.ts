// app/api/intent/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userIntent, businessIntent, dos, donts, prompt } = body;

    const messages = [
      {
        role: "system" as const,
        content:
          "You are an assistant that normalizes campaign briefs into a compact JSON object called 'intent'. Do not write explanations. Only output valid JSON.",
      },
      {
        role: "user" as const,
        content: `
USER INTENT: ${userIntent}
BUSINESS INTENT: ${businessIntent}
DOS: ${dos}
DONTS: ${donts}

Combine this into:
{
  "userIntent": "...",
  "businessIntent": "...",
  "tone": "...",
  "visuals": "...",
  "constraints": ["..."],
  "goals": ["..."]
}
        `.trim(),
      },
    ];

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages,
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const intent = JSON.parse(content);

    return NextResponse.json(intent);
  } catch (err: any) {
    console.error("❌ /api/intent error", err);
    return NextResponse.json(
      {
        error: "Failed to generate intent",
        detail: String(err?.message ?? err),
      },
      { status: 500 }
    );
  }
}