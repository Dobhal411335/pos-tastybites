"use client";

/**
 * Shared offline / API-failure panel with Try Again.
 * Retries the provided callback — does not reload the whole app.
 */
export default function NetworkErrorPanel({
  title = "Unable to load",
  message = "Check your connection and try again.",
  onRetry,
  retryLabel = "Try again",
  className = "",
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-8 text-center ${className}`}
      role="alert"
    >
      <p className="text-base font-bold text-red-700">{title}</p>
      {message ? (
        <p className="max-w-md text-sm font-medium text-zinc-600">{message}</p>
      ) : null}
      {typeof onRetry === "function" ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-600"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
