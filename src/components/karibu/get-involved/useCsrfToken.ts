/**
 * useCsrfToken: fetches the CSRF token the Get involved forms send as the
 * `x-csrf-token` header. Exposes the token, a `failed` flag and `retry`. A
 * panel keeps its submit button disabled until `token` is non-empty, so a
 * failed fetch can never let a submit go out without a token; `failed` only
 * lets the panel say why and offer a retry.
 */

import { useCallback, useEffect, useState } from "react";

interface CsrfTokenState {
  token: string;
  failed: boolean;
  retry: () => void;
}

export function useCsrfToken(): CsrfTokenState {
  const [token, setToken] = useState("");
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/csrf-token")
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return;
        if (typeof data.csrfToken === "string" && data.csrfToken) setToken(data.csrfToken);
        else setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setFailed(false);
    setAttempt((count) => count + 1);
  }, []);

  return { token, failed, retry };
}
