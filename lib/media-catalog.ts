// lib/media-catalog.ts

export type MediaItem = {
    id: string;      // ID referenced from UiSpec
    url: string;     // public / remote URL
    tags: string[];  // optional: for intent-based selection
  };
  
  export const MEDIA_CATALOG: MediaItem[] = [
    {
      id: "fold-flip-combo",
      url: "https://images.ctfassets.net/rg2zkwx3wrvd/1WpHzk0xIElDINjTeAb6aE/8718e51b0646399869137f1dbfbf23e0/galaxy_z_fold7__z_flip7_combo_kv_510x370mm_rgb_250516.jpg?w=1600",
      tags: ["phone", "foldable", "z fold", "z flip", "hero"],
    },
    {
      id: "monitor-paradigm",
      url: "https://images.ctfassets.net/rg2zkwx3wrvd/1fwEmuOkFYAi8EkEsy8djW/40843b430b299446b54afb5726da44b0/Paradigm_PA3-KV__MO.png?w=1600",
      tags: ["monitor", "display", "work", "setup"],
    },
    {
      id: "watch-ultra",
      url: "https://images.ctfassets.net/rg2zkwx3wrvd/420tI4gVfeN1L3xc9khxsk/e06fe01de6018ba5b7ecbb3b409531b9/Galaxy_Watch_Ultra_Product_KV_510x370_RGB.jpg?w=1600",
      tags: ["watch", "ultra", "fitness", "outdoor"],
    },
    {
      id: "watch8-combo",
      url: "https://images.ctfassets.net/rg2zkwx3wrvd/21Nyf5mWowa0u7we0QQoFC/14d4a3a7664378bedd5120b84e3bdfbb/Galaxy_Watch8_Combo_ProductKV_510X370_RGB_a05.jpg?w=1600",
      tags: ["watch", "galaxy watch8", "lifestyle"],
    },
    {
      id: "s24-fe-banner",
      url: "https://images.ctfassets.net/rg2zkwx3wrvd/731JyHNkyRq2Q519W66XyM/a776079f60837be48d6881ba7f1b409f/2024-Q3__S24_FE__Top_banner__PC___SE.jpg?w=800",
      tags: ["s24", "fe", "phone", "banner"],
    },
    {
      id: "tab-s10-hero",
      url: "https://images.ctfassets.net/rg2zkwx3wrvd/17HgnFbLqyyCdbgq0O2kr2/f61de74719a4a1483b9202914534064c/Samsung_Galaxy_Tab_S10_Series__Galaxy_AI_now_in_Swedish__PC.jpg?w=800",
      tags: ["tab s10", "tablet", "ai"],
    },
  ];