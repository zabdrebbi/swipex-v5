import type { LocaleMeta } from '../meta';

/** Arabic is the source of truth: its keys define `TranslationKey`. */
const ar = {
  meta: {
    code: 'ar',
    dir: 'rtl',
    label: 'Arabic',
    nativeLabel: 'العربية',
    intlLocale: 'ar-DZ-u-nu-latn',
    order: 1,
  } satisfies LocaleMeta,
  strings: {
    'nav.home': 'الرئيسية',
    'nav.tasks': 'المهام',
    'nav.archive': 'الأرشيف',
    'nav.settings': 'الإعدادات',
    'auth.login_title': 'تسجيل الدخول',
    'settings.title': 'الإعدادات',
    'settings.language': 'اللغة',
    'settings.theme': 'المظهر',
    'settings.format_preview': 'معاينة التنسيق',
    'theme.light': 'نهاري',
    'theme.dark': 'ليلي',
    'theme.system': 'حسب الجهاز',
    'currency.dzd': 'دج',
  },
};

export default ar;
