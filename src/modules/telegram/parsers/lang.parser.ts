import { GROUP_LANG_ENUM } from "@/modules/group/group.model";

export type LangCommand =
  | {
      readonly type: "show";
    }
  | {
      readonly type: "set";
      readonly language: GROUP_LANG_ENUM;
    };

export type LangCommandParseResult =
  | {
      readonly ok: true;
      readonly command: LangCommand;
    }
  | {
      readonly ok: false;
      readonly reason: "usage" | "supported";
    };

const langCommandRegex = /^\/lang(?:@\w+)?(?:\s+(.+))?$/i;

const languageByInput = new Map<string, GROUP_LANG_ENUM>([
  [GROUP_LANG_ENUM.EN, GROUP_LANG_ENUM.EN],
  ["english", GROUP_LANG_ENUM.EN],
  [GROUP_LANG_ENUM.KH, GROUP_LANG_ENUM.KH],
  ["khmer", GROUP_LANG_ENUM.KH],
  ["ខ្មែរ", GROUP_LANG_ENUM.KH],
]);

export const parseLangCommand = (text: string): LangCommandParseResult => {
  const langMatch = text.trim().match(langCommandRegex);

  if (!langMatch) {
    return {
      ok: false,
      reason: "usage",
    };
  }

  const rawLanguage = langMatch[1]?.trim();

  if (!rawLanguage) {
    return {
      ok: true,
      command: {
        type: "show",
      },
    };
  }

  const language = languageByInput.get(rawLanguage.toLowerCase());

  if (!language) {
    return {
      ok: false,
      reason: "supported",
    };
  }

  return {
    ok: true,
    command: {
      type: "set",
      language,
    },
  };
};
