import { describe, expect, test } from "bun:test";

import { GROUP_LANG_ENUM } from "@/modules/group/group.model";
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
        language: GROUP_LANG_ENUM.EN,
      },
    });

    expect(parseLangCommand("/lang English")).toEqual({
      ok: true,
      command: {
        type: "set",
        language: GROUP_LANG_ENUM.EN,
      },
    });
  });

  test("parses Khmer language aliases", () => {
    expect(parseLangCommand("/lang kh")).toEqual({
      ok: true,
      command: {
        type: "set",
        language: GROUP_LANG_ENUM.KH,
      },
    });

    expect(parseLangCommand("/lang ខ្មែរ")).toEqual({
      ok: true,
      command: {
        type: "set",
        language: GROUP_LANG_ENUM.KH,
      },
    });
  });

  test("rejects unsupported language values", () => {
    expect(parseLangCommand("/lang fr")).toEqual({
      ok: false,
      reason: "supported",
    });
  });

  test("rejects non-lang commands", () => {
    expect(parseLangCommand("/language kh")).toEqual({
      ok: false,
      reason: "usage",
    });
  });
});
