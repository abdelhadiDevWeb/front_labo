const TECHNICAL_PATTERNS = [
  /localhost/i,
  /127\.0\.0\.1/i,
  /failed to fetch/i,
  /network error/i,
  /econnrefused/i,
  /https?:\/\//i,
  /\/api\//i,
  /bun run dev/i,
  /NEXT_PUBLIC_/i,
  /stack/i,
  /TypeError/i,
  /Unexpected end of JSON/i,
  /Failed to execute ['"]json['"]/i,
  /is not valid JSON/i,
];

const isTechnicalMessage = (message: string): boolean =>
  TECHNICAL_PATTERNS.some((pattern) => pattern.test(message));

/** Return a safe user-facing error string (hides internals in production). */
export const toUserFacingError = (
  message: string | undefined | null,
  fallback = "Une erreur est survenue. Veuillez réessayer."
): string => {
  if (!message || !message.trim()) return fallback;
  if (process.env.NODE_ENV === "development") return message;
  if (isTechnicalMessage(message)) return fallback;
  return message;
};
