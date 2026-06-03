import { i18nObject } from "./i18n-util";
import { loadLocale } from "./i18n-util.sync";
import { GROUP_LANG_ENUM } from "@/modules/group/group.model";

export const getLocale = (locale: GROUP_LANG_ENUM) => {
  loadLocale(locale);
  return i18nObject(locale);
};
