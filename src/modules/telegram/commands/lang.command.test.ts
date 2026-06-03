import { describe, expect, test } from "bun:test";

import { parseLangCommand } from "../parsers/lang.parser";

describe("parseLangCommand", () => {
  test("parses a language status command", () => {
    expect(parseLangCommand("/lang")).toEqual({
      ok: true,
      command: {
        type: "show",
      },
    });
  });

  test("parses English language aliases", () => {
    expect(parseLangCommand("/lang en")).toEqual({
      ok: true,
      command: {
        type: "set",
        language: "en",
      },
    });

    expect(parseLangCommand("/lang English")).toEqual({
      ok: true,
      command: {
        type: "set",
        language: "en",
      },
    });
  });

  test("parses Khmer language aliases", () => {
    expect(parseLangCommand("/lang kh")).toEqual({
      ok: true,
      command: {
        type: "set",
        language: "kh",
      },
    });

    expect(parseLangCommand("/lang ខ្មែរ")).toEqual({
      ok: true,
      command: {
        type: "set",
        language: "kh",
      },
    });
  });

  test("rejects unsupported language values", () => {
    expect(parseLangCommand("/lang fr")).toEqual({
      ok: false,
      message: "Supported languages are en and kh.",
    });
  });

  test("rejects non-lang commands", () => {
    expect(parseLangCommand("/language kh")).toEqual({
      ok: false,
      message: "Use /lang, /lang en, or /lang kh.",
    });
  });
});
