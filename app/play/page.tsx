"use client";
import { useState } from "react";
// ⬇️ type-only import so Zod never loads in the client bundle
import type { UiSpec } from "@/schemas/ui-spec";
import { RenderUi } from "@/ui/Renderer";

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

      // Combined prompt for backward compatibility
      const combinedPrompt =
        `USER INTENT: ${userIntent}\n` +
        `BUSINESS INTENT: ${businessIntent}\n` +
        `DOS: ${dos}\n` +
        `DONTS: ${donts}`;

      // 1) Extract intent
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
      const intent = await intentRes.json();
      if (!intentRes.ok) throw new Error("intent: " + JSON.stringify(intent));

      // 2) Generate spec (server validates with Zod)
      const specRes = await fetch("/api/spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent }),
      });

      const specText = await specRes.text();
      if (!specRes.ok) throw new Error(specText || `spec: HTTP ${specRes.status}`);

      // 3) Just parse JSON; trust server-side validation
      const specJson = JSON.parse(specText) as UiSpec;

      // Minimal guard so UI doesn't crash if server returns something odd
      if (!specJson || !Array.isArray((specJson as any).components)) {
        throw new Error("Spec format invalid");
      }

      setSpec(specJson);
    } catch (e: any) {
      console.error("❌ Error generating UI:", e);
      setErr(e.message ?? String(e));
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

        {err && <p className="text-sm text-red-600">{err}</p>}
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