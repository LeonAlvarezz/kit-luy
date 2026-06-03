export const SUPPORTED_LANGUAGES = ["en", "kh"] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export type LangCommand =
  | {
      readonly type: "show";
    }
  | {
      readonly type: "set";
      readonly language: SupportedLanguage;
    };

export type LangCommandParseResult =
  | {
      readonly ok: true;
      readonly command: LangCommand;
    }
  | {
      readonly ok: false;
      readonly message: string;
    };

const langCommandRegex = /^\/lang(?:@\w+)?(?:\s+(.+))?$/i;
const languageByInput = new Map<string, SupportedLanguage>([
  ["en", "en"],
  ["english", "en"],
  ["kh", "kh"],
  ["khmer", "kh"],
  ["ខ្មែរ", "kh"],
]);

export const parseLangCommand = (text: string): LangCommandParseResult => {
  const langMatch = text.trim().match(langCommandRegex);

  if (!langMatch) {
    return {
      ok: false,
      message: "Use /lang, /lang en, or /lang kh.",
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
      message: "Supported languages are en and kh.",
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
