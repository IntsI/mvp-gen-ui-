// lib/media-catalog.ts

/**
 * Simple mapping from semantic ids (what the LLM outputs)
 * to actual image URLs.
 */
export const mediaCatalog: Record<string, string> = {
  "fold-flip-combo":
    "https://images.ctfassets.net/rg2zkwx3wrvd/1WpHzk0xIElDINjTeAb6aE/8718e51b0646399869137f1dbfbf23e0/galaxy_z_fold7__z_flip7_combo_kv_510x370mm_rgb_250516.jpg?w=1600",
  "monitor-paradigm":
    "https://images.ctfassets.net/rg2zkwx3wrvd/1fwEmuOkFYAi8EkEsy8djW/40843b430b299446b54afb5726da44b0/Paradigm_PA3-KV__MO.png?w=1600",
  "watch-ultra":
    "https://images.ctfassets.net/rg2zkwx3wrvd/420tI4gVfeN1L3xc9khxsk/e06fe01de6018ba5b7ecbb3b409531b9/Galaxy_Watch_Ultra_Product_KV_510x370_RGB.jpg?w=1600",
  "watch8-combo":
    "https://images.ctfassets.net/rg2zkwx3wrvd/21Nyf5mWowa0u7we0QQoFC/14d4a3a7664378bedd5120b84e3bdfbb/Galaxy_Watch8_Combo_ProductKV_510X370_RGB_a05.jpg?w=1600",
  "s24-fe-banner":
    "https://images.ctfassets.net/rg2zkwx3wrvd/731JyHNkyRq2Q519W66XyM/a776079f60837be48d6881ba7f1b409f/2024-Q3__S24_FE__Top_banner__PC___SE.jpg?w=800",
  "tab-s10-hero":
    "https://images.ctfassets.net/rg2zkwx3wrvd/17HgnFbLqyyCdbgq0O2kr2/f61de74719a4a1483b9202914534064c/Samsung_Galaxy_Tab_S10_Series__Galaxy_AI_now_in_Swedish__PC.jpg?w=800",
};

/**
 * Helper: resolve an id to URL, or undefined if unknown.
 */
export function resolveMediaUrl(id?: string): string | undefined {
  if (!id) return;
  return mediaCatalog[id];
}