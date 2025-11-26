// Mapping of icon names to emojis for backwards compatibility
// with tasks created using old icon-name based symbols
const ICON_TO_EMOJI: Record<string, string> = {
  // Morning routine
  sun: "\u{1F31E}",
  sparkles: "\u{2728}",
  shirt: "\u{1F455}",
  utensils: "\u{1F374}",
  backpack: "\u{1F392}",

  // Homework
  "book-open": "\u{1F4D6}",
  calculator: "\u{1F4F1}",
  pencil: "\u{270F}\u{FE0F}",

  // Bedtime
  bath: "\u{1F6C1}",
  moon: "\u{1F319}",
  book: "\u{1F4DA}",

  // Chores
  "bed-single": "\u{1F6CF}\u{FE0F}",
  "toy-brick": "\u{1F9F8}",

  // After school
  apple: "\u{1F34E}",
  "message-circle": "\u{1F4AC}",

  // Additional common icons
  star: "\u{2B50}",
  heart: "\u{2764}\u{FE0F}",
  check: "\u{2705}",
  clock: "\u{1F552}",
  home: "\u{1F3E0}",
  music: "\u{1F3B5}",
  game: "\u{1F3AE}",
  sports: "\u{26BD}",
  art: "\u{1F3A8}",
  science: "\u{1F52C}",
  plant: "\u{1F331}",
  pet: "\u{1F436}",
  food: "\u{1F35D}",
  water: "\u{1F4A7}",
  exercise: "\u{1F3C3}",
  sleep: "\u{1F634}",
  clean: "\u{1F9F9}",
  laundry: "\u{1F9FA}",
};

/**
 * Converts a symbol to an emoji.
 * - If already an emoji, returns as-is
 * - If it's an icon name, converts to the corresponding emoji
 * - Returns null if no valid symbol
 */
export function symbolToEmoji(symbol: string | null | undefined): string | null {
  if (!symbol) return null;

  // Check if it's already an emoji (starts with a high unicode character)
  // Emojis typically start at U+1F300 or higher, or are in certain other ranges
  const firstChar = symbol.codePointAt(0);
  if (firstChar && (firstChar > 0x1F00 || symbol.length > 2)) {
    // Likely already an emoji
    return symbol;
  }

  // Try to convert icon name to emoji
  const emoji = ICON_TO_EMOJI[symbol.toLowerCase()];
  if (emoji) {
    return emoji;
  }

  // If it's a short string that looks like an icon name but we don't have a mapping,
  // return null to indicate no valid symbol
  if (symbol.length < 20 && /^[a-z-]+$/.test(symbol)) {
    return null;
  }

  // Return as-is (might be a custom text symbol)
  return symbol;
}

/**
 * Get the display symbol - either emoji or fallback
 */
export function getDisplaySymbol(symbol: string | null | undefined, fallback = ""): string {
  return symbolToEmoji(symbol) || fallback;
}
