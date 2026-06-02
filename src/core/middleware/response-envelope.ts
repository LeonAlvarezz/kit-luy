import {
  HttpApp,
  HttpServerRequest,
  HttpServerResponse,
} from "@effect/platform";
import { Effect } from "effect";

import {
  APP_ERROR_LOGGED_HEADER,
  logAppError,
} from "@/core/error/app-error";

const statusMessage = (status: number) => {
  switch (status) {
    case 400:
      return "Bad request";
    case 401:
      return "Unauthorized";
    case 403:
      return "Forbidden";
    case 404:
      return "Not found";
    case 409:
      return "Conflict";
    case 500:
      return "Internal server error";
    default:
      return status >= 400 ? "Request failed" : "OK";
  }
};

const statusCode = (status: number) => {
  switch (status) {
    case 400:
      return "BAD_REQUEST";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 500:
      return "INTERNAL_SERVER_ERROR";
    default:
      return status >= 500 ? "INTERNAL_SERVER_ERROR" : "REQUEST_FAILED";
  }
};

const parseBody = (response: HttpServerResponse.HttpServerResponse) => {
  const body = response.body as any;

  switch (body._tag) {
    case "Empty":
      return {};
    case "Raw":
      return body.body;
    case "Uint8Array": {
      const text = new TextDecoder().decode(body.body);
      if (!text) return {};

      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
    default:
      return {};
  }
};

const errorBody = (
  response: HttpServerResponse.HttpServerResponse,
  payload: unknown,
) => {
  const body = payload && typeof payload === "object" ? (payload as any) : {};
  const isEmptyResponse = response.body._tag === "Empty";
  const isEndpointNotFound = response.status === 404 && isEmptyResponse;
  const isInvalidJsonBody = response.status === 400 && isEmptyResponse;

  return {
    success: false,
    error: {
      message: isEndpointNotFound
        ? "Endpoint not found"
        : isInvalidJsonBody
          ? "Invalid JSON request body"
          : (body.message ?? statusMessage(response.status)),
      status: response.status,
      code: isEndpointNotFound
        ? "ENDPOINT_NOT_FOUND"
        : body._tag === "HttpApiDecodeError"
          ? "BAD_REQUEST"
          : body.code ?? statusCode(response.status),
    },
  };
};

const responseEnvelopeExcludedPaths = new Set(["/docs", "/openapi.json"]);

const hasLoggedAppError = (
  response: HttpServerResponse.HttpServerResponse,
) => response.headers[APP_ERROR_LOGGED_HEADER] === "true";

const getPathname = (url: string) => {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return new URL(url).pathname;
  }

  return url.split("?")[0] ?? url;
};

const withHttpErrorBoundary = (app: HttpApp.Default) =>
  app.pipe(
    Effect.catchAllCause((cause) =>
      Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest;

        yield* logAppError(cause, {
          message: "Unhandled HTTP error",
          annotations: {
            method: request.method,
            url: request.url,
          },
        });

        return HttpServerResponse.unsafeJson(
          {
            message: "Internal server error",
            code: "INTERNAL_SERVER_ERROR",
          },
          {
            status: 500,
            headers: {
              [APP_ERROR_LOGGED_HEADER]: "true",
            },
          },
        );
      }),
    ),
  );

export const withResponseEnvelope = (app: HttpApp.Default) =>
  HttpApp.withPreResponseHandler(
    withHttpErrorBoundary(app),
    (request, response) => {
      const pathname = getPathname(request.url);

      if (responseEnvelopeExcludedPaths.has(pathname)) {
        return Effect.succeed(response);
      }

      const payload = parseBody(response);

      if (response.status >= 200 && response.status < 300) {
        return Effect.succeed(
          HttpServerResponse.unsafeJson(
            {
              success: true,
              data: payload,
            },
            { status: response.status },
          ),
        );
      }

      const body =
        payload && typeof payload === "object" ? (payload as any) : {};
      const envelope = errorBody(response, payload);
      const envelopeResponse = HttpServerResponse.unsafeJson(envelope, {
        status: response.status,
      });

      if (hasLoggedAppError(response)) {
        return Effect.succeed(envelopeResponse);
      }

      const log = response.status >= 500 ? Effect.logError : Effect.logWarning;

      return log(envelope.error.message).pipe(
        Effect.annotateLogs({
          status: response.status,
          code: envelope.error.code,
          error: body.code ?? body._tag ?? envelope.error.code,
        }),
        Effect.as(envelopeResponse),
      );
    },
  );
