import { describe, expect, test } from "bun:test";

import { GROUP_LANG_ENUM } from "@/modules/group/group.model";
import { getLocale } from "./get";

describe("getLocale", () => {
  test("loads English translations before returning translation functions", () => {
    const t = getLocale(GROUP_LANG_ENUM.EN);

    expect(String(t.lang.current({ language: GROUP_LANG_ENUM.EN }))).toBe(
      "Current language: en.",
    );
  });

  test("loads Khmer translations before returning translation functions", () => {
    const t = getLocale(GROUP_LANG_ENUM.KH);

    expect(String(t.lang.current({ language: GROUP_LANG_ENUM.KH }))).toBe(
      "ភាសាបច្ចុប្បន្ន៖ kh។",
    );
  });
});
