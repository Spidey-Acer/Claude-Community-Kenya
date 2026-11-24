/**
 * CsrfRetry: the message and "Try again" button a form shows when its CSRF
 * token could not be fetched. Without a token the submit button stays
 * disabled, so this explains why and offers a retry. It never enables a submit.
 */

import { AlertTriangle } from "lucide-react";
import { BTN_OUTLINE } from "@/components/karibu/kit";

export function CsrfRetry({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 rounded-lg border border-error/30 bg-error/10 p-4 font-inter text-sm text-error"
    >
      <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span>We could not get the form ready, so it cannot be sent yet.</span>
      <button type="button" onClick={onRetry} className={`${BTN_OUTLINE} min-h-11 px-4 py-2`}>
        Try again
      </button>
    </div>
  );
}
