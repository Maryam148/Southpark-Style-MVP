/* ──────────────────────────────────────────────────────────
   Placeholder colours for testing without real PNGs.
   The AnimationEngine and generate API fall back to these
   when asset URLs are empty / not found.
   ────────────────────────────────────────────────────────── */

export interface PlaceholderCharacter {
    body: string;
    head: string;
    eyes: string;
    mouth: string;
    label: string;
}

/** Character name → fallback colours (case-insensitive lookup via toUpperCase) */
export const PLACEHOLDER_COLORS: Record<string, PlaceholderCharacter> = {
    JAX: { body: "#4A90D9", head: "#F5CBA7", eyes: "#FFFFFF", mouth: "#C0392B", label: "JAX" },
    TYRELL: { body: "#E74C3C", head: "#F0A500", eyes: "#FFFFFF", mouth: "#922B21", label: "TYRELL" },
    LEO: { body: "#27AE60", head: "#F5CBA7", eyes: "#FFFFFF", mouth: "#C0392B", label: "LEO" },
    EMILY: { body: "#9B59B6", head: "#F5CBA7", eyes: "#FFFFFF", mouth: "#C0392B", label: "EMILY" },
    MS_PEPPER: { body: "#E67E22", head: "#F5CBA7", eyes: "#FFFFFF", mouth: "#C0392B", label: "MS PEPPER" },
    MRS_GRUBBS: { body: "#7F8C8D", head: "#F5CBA7", eyes: "#FFFFFF", mouth: "#C0392B", label: "MRS GRUBBS" },
};

/** Default palette for unknown characters (cycles by index) */
export const DEFAULT_CHAR_COLORS: PlaceholderCharacter[] = [
    { body: "#E74C3C", head: "#F5CBA7", eyes: "#FFF", mouth: "#922B21", label: "?" },
    { body: "#3498DB", head: "#F5CBA7", eyes: "#FFF", mouth: "#C0392B", label: "?" },
    { body: "#2ECC71", head: "#F5CBA7", eyes: "#FFF", mouth: "#C0392B", label: "?" },
    { body: "#F39C12", head: "#F5CBA7", eyes: "#FFF", mouth: "#C0392B", label: "?" },
    { body: "#9B59B6", head: "#F5CBA7", eyes: "#FFF", mouth: "#C0392B", label: "?" },
    { body: "#1ABC9C", head: "#F5CBA7", eyes: "#FFF", mouth: "#C0392B", label: "?" },
];

/** Scene background name → fallback colour */
export const BACKGROUND_COLORS: Record<string, string> = {
    "Main Street – Morning": "#87CEEB",
    "Skunk Creek Elementary – Classroom": "#F0E68C",
    "Hallway Outside Classroom": "#D3D3D3",
    "Diner – After School": "#FFD700",
    default: "#2C3E50",
};

/** Look up a character's placeholder colours by name */
export function getCharPlaceholder(name: string, index: number): PlaceholderCharacter {
    // Try exact key (spaces → underscores, uppercase)
    const key = name.toUpperCase().replace(/[\s.-]+/g, "_");
    if (PLACEHOLDER_COLORS[key]) return PLACEHOLDER_COLORS[key];
    // Try just uppercase name
    if (PLACEHOLDER_COLORS[name.toUpperCase()]) return PLACEHOLDER_COLORS[name.toUpperCase()];
    // Fallback to palette cycling
    return DEFAULT_CHAR_COLORS[index % DEFAULT_CHAR_COLORS.length];
}

/** Look up a background placeholder colour by scene/background name */
export function getBgPlaceholder(bgName: string): string {
    return BACKGROUND_COLORS[bgName] ?? BACKGROUND_COLORS.default;
}

/**
 * Generate a solid-colour SVG data URL. Used when real PNGs aren't available.
 * These work as valid `src` for HTMLImageElement / next/image.
 */
export function colorSvgDataUrl(
    color: string,
    w = 200,
    h = 300,
    rounded = true
): string {
    const rx = rounded ? ' rx="12" ry="12"' : "";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect fill="${color}" width="${w}" height="${h}"${rx}/></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
