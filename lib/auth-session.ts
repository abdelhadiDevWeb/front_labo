let sessionActive = false;

export const markSessionActive = (): void => {
  sessionActive = true;
  if (typeof window !== "undefined") {
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
  }
};

export const markSessionInactive = (): void => {
  sessionActive = false;
  if (typeof window !== "undefined") {
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
  }
};

/** Optimistic client hint — HttpOnly cookie is the source of truth */
export const hasAuthSessionHint = (): boolean => sessionActive;
