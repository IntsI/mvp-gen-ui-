"use client";
import { useState } from "react";
// ⬇️ type-only import so Zod never loads in the client bundle
import type { UiSpec } from "@/schemas/ui-spec";
import { RenderUi } from "@/ui/Renderer";

export default function Page() {
  const [prompt, setPrompt] = useState("Weekend espresso sale. Friendly tone.");
  const [dos, setDos] = useState("Mention free shipping over 300 kr;");
  const [donts, setDonts] = useState("No -50% claims; keep short;");
  const [bg, setBg] = useState("#FFFFFF");
  const [radius, setRadius] = useState<"sm" | "lg">("lg");
  const [spec, setSpec] = useState<UiSpec | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function generate() {
    try {
      setLoading(true);
      setErr(null);

      // 1) Extract intent
      const intentRes = await fetch("/api/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, dos, donts }),
      });
      const intent = await intentRes.json();
      if (!intentRes.ok) throw new Error("intent: " + JSON.stringify(intent));

      // 2) Generate spec (server validates with Zod)
      const specRes = await fetch("/api/spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent, style: { bg, radius } }),
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

        <label className="text-sm font-medium">Intent</label>
        <textarea
          className="border rounded-xl p-2 h-28"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">BG color (hex)</label>
            <input
              className="border rounded-xl p-2 w-full"
              value={bg}
              onChange={(e) => setBg(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Card radius</label>
            <select
              className="border rounded-xl p-2 w-full"
              value={radius}
              onChange={(e) => setRadius(e.target.value as "sm" | "lg")}
            >
              <option value="lg">lg</option>
              <option value="sm">sm</option>
            </select>
          </div>
        </div>

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