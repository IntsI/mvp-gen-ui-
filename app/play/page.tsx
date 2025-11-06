"use client";
import { useState } from "react";
import type { UiSpec } from "@/schemas/ui-spec";
import { RenderUi } from "@/ui/Renderer";

/** Robust fetch helpers */
async function readJsonOrThrow(res: Response, label: string) {
  const ct = res.headers.get("content-type") || "";
  const text = await res.text(); // read once
  if (!res.ok) {
    // server sent an error; show body if present
    let msg = text || `${label}: HTTP ${res.status}`;
    try {
      const j = JSON.parse(text);
      msg = `${label}: ${JSON.stringify(j)}`;
    } catch {
      // keep text as-is
    }
    throw new Error(msg);
  }
  if (!ct.includes("application/json")) {
    // not json; include first 200 chars to help debugging
    throw new Error(`${label}: non-JSON response\n${text.slice(0, 200)}`);
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`${label}: JSON parse failed\n${text.slice(0, 200)}`);
  }
}

export default function Page() {
  const [userIntent, setUserIntent] = useState("Weekend espresso sale. Friendly tone.");
  const [businessIntent, setBusinessIntent] = useState("Highlight new subscription plan and collect emails.");
  const [dos, setDos] = useState("Mention free shipping over 300 kr;");
  const [donts, setDonts] = useState("No -50% claims; keep short;");
  const [spec, setSpec] = useState<UiSpec | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function generate() {
    try {
      setLoading(true);
      setErr(null);

      const combinedPrompt =
        `USER INTENT: ${userIntent}\n` +
        `BUSINESS INTENT: ${businessIntent}\n` +
        `DOS: ${dos}\n` +
        `DONTS: ${donts}`;

      // 1) /api/intent
      const intentRes = await fetch("/api/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIntent,
          businessIntent,
          dos,
          donts,
          prompt: combinedPrompt,
        }),
      });
      const intent = await readJsonOrThrow(intentRes, "intent");

      // 2) /api/spec
      const specRes = await fetch("/api/spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent }),
      });
      const specJson = (await readJsonOrThrow(specRes, "spec")) as UiSpec;

      if (!specJson || !Array.isArray((specJson as any).components)) {
        throw new Error("spec: format invalid (missing components)");
      }

      setSpec(specJson);
    } catch (e: any) {
      console.error("❌ Generate error:", e);
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-50 p-6 grid gap-6 md:grid-cols-2">
      {/* INPUTS */}
      <section className="bg-white border rounded-2xl p-4 shadow-sm flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Inputs</h2>

        <label className="text-sm font-medium">User Intent</label>
        <textarea
          className="border rounded-xl p-2 h-24"
          value={userIntent}
          onChange={(e) => setUserIntent(e.target.value)}
        />

        <label className="text-sm font-medium">Business Intent</label>
        <textarea
          className="border rounded-xl p-2 h-24"
          value={businessIntent}
          onChange={(e) => setBusinessIntent(e.target.value)}
        />

        <label className="text-sm font-medium">Dos</label>
        <textarea
          className="border rounded-xl p-2 h-16"
          value={dos}
          onChange={(e) => setDos(e.target.value)}
        />

        <label className="text-sm font-medium">Don’ts</label>
        <textarea
          className="border rounded-xl p-2 h-16"
          value={donts}
          onChange={(e) => setDonts(e.target.value)}
        />

        <button
          onClick={generate}
          disabled={loading}
          className="mt-2 px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 transition"
        >
          {loading ? "Generating…" : "Generate with ChatGPT"}
        </button>

        {err && <p className="text-sm text-red-600 whitespace-pre-wrap">{err}</p>}
      </section>

      {/* PREVIEW */}
      <section className="bg-white border rounded-2xl p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Preview (400×400)</h2>
        {spec ? (
          <RenderUi spec={spec} />
        ) : (
          <div className="text-sm text-gray-500">No spec yet. Click Generate.</div>
        )}
      </section>
    </main>
  );
}