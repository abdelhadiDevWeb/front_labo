const SESSION_HINT_KEY = "ml_session_hint";

let sessionActive = false;

export const markSessionActive = (): void => {
  sessionActive = true;
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_HINT_KEY, "1");
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
  }
};

export const markSessionInactive = (): void => {
  sessionActive = false;
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_HINT_KEY);
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
  }
};

/**
 * Optimistic client hint — HttpOnly cookie is the source of truth.
 * Persisted across full reloads so /home can retry session after login redirect.
 */
export const hasAuthSessionHint = (): boolean => {
  if (sessionActive) return true;
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SESSION_HINT_KEY) === "1";
};
