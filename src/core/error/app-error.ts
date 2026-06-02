import { Cause, Effect } from "effect";

export const APP_ERROR_LOGGED_HEADER = "x-kit-luy-error-logged";

export const getErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallbackMessage;
};

export const getStringField = (error: unknown, field: string) => {
  if (typeof error !== "object" || error === null || !(field in error)) {
    return undefined;
  }

  const value = (error as Record<string, unknown>)[field];
  return typeof value === "string" ? value : undefined;
};

export const getErrorName = (error: unknown) =>
  getStringField(error, "_tag") ?? getStringField(error, "name") ?? "UNKNOWN";

export const getErrorCode = (error: unknown) =>
  getStringField(error, "code") ?? "UNKNOWN";

export const logAppError = (
  cause: Cause.Cause<unknown>,
  options?: {
    readonly message?: string;
    readonly annotations?: Record<string, string>;
  },
) => {
  const error = Cause.squash(cause);

  return Effect.logError(options?.message ?? "Unhandled app error").pipe(
    Effect.annotateLogs({
      message: getErrorMessage(error, "Unhandled app error."),
      code: getErrorCode(error),
      error: getErrorName(error),
      cause: Cause.pretty(cause),
      ...options?.annotations,
    }),
  );
};
