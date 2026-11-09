# SwiPex Pro v5

تطبيق ويب (PWA) لإدارة طرود التوصيل لعامل التوصيل الجزائري: استيراد ملصقات PDF، تتبع حالات الطرود، أرشيف يومي، مهام، وتواصل مع الزبائن. الواجهة عربية RTL أولاً، مع دعم لاحق للفرنسية والإنجليزية.

الحالة الحالية: **الخطوة 2** — الهيكل والقشرة المتجاوبة + نظام الترجمة (ar/fr/en) + الثيم (بدون Firebase بعد).

## أوامر التشغيل

```bash
npm install          # تثبيت الحزم
npm run dev          # خادم التطوير على http://localhost:5173
npm run build        # حواجز الجودة (i18n) + فحص الأنواع + البناء إلى dist/
npm run typecheck    # فحص الأنواع فقط
npm run check:i18n   # فحص النص العربي خارج src/i18n فقط
npm run preview      # معاينة نسخة البناء محلياً
```

## إعداد Cloudflare Pages

أنشئ مشروعاً من مستودع GitHub، ثم:

| الإعداد | القيمة |
|---|---|
| Build command | `npm run build` |
| Output directory | `dist` |

**لماذا `single-page-application`؟** التطبيق SPA على React Router: كل المسارات (`/settings`، `/tasks`...) تُخدم من ملف `index.html` واحد. بدون هذا الإعداد، فتح رابط مباشر أو تحديث الصفحة على مسار غير الجذر يعيد خطأ 404 من الخادم. الإعداد الموجود في `wrangler.jsonc` (`assets.not_found_handling`) يعيد `index.html` لكل مسار غير موجود، فتعمل الروابط المباشرة والتحديث دون أخطاء.

## بنية المشروع

```
src/
├── app/          قشرة التطبيق: التوجيه، القائمة الجانبية، الشريط السفلي
├── features/     الصفحات حسب الميزة (home, tasks, archive, settings, auth)
├── components/   مكونات مشتركة (لاحقاً)
├── domain/       منطق أعمال نقي قابل للاختبار بلا React/Firebase (لاحقاً)
├── lib/          تكامل Firebase والأدوات (لاحقاً)
└── i18n/         نظام الترجمة: meta / keys / locales / provider (ar, fr, en)
```

- `src/app/` — `App.tsx` (المسارات)، `AppShell.tsx` (القشرة)، `Sidebar.tsx`، `BottomNav.tsx`، `nav.tsx` (بيانات التنقل).
- `src/features/<feature>/` — كل ميزة مكوّناتها وhooks ومنطقها في مجلد مستقل.
- `src/lib/theme/` — الثيم (نهاري/ليلي/حسب الجهاز).

## التخطيط المتجاوب

الفاصل: **1024px** (`lg` في Tailwind).

| الجهاز | العرض | التنقل |
|---|---|---|
| هاتف / لوح صغير | < 1024px | شريط سفلي ثابت بأربع أيقونات |
| كمبيوتر | ≥ 1024px | قائمة جانبية ثابتة على اليمين (RTL) |

- في RTL تظهر القائمة الجانبية على اليمين تلقائياً عبر الخصائص المنطقية (`border-e`، `ms-/me-`).
- الشريط السفلي يحترم `safe-area-inset-bottom` لأجهزة iPhone.
- الوضع الليلي عبر `dark:` (class strategy) في كل المكوّنات.

## الترجمة (i18n)

**العربية هي المصدر**: مفاتيح ملف `src/i18n/locales/ar.ts` تحدّد النوع `TranslationKey`، وأي لغة أخرى تُكتب بنوع `Locale` فيُفشل `tsc` إن نقص مفتاح. ترتيب الاحتياط: اللغة الحالية ← العربية ← المفتاح نفسه.

**إضافة لغة جديدة = ملف واحد** في `src/i18n/locales/` (يُكتشف تلقائياً عبر `import.meta.glob`) بلا تعديل أي كود آخر:

1. انسخ `en.ts` إلى `de.ts`.
2. غيّر `meta`: `code: 'de'` و`nativeLabel` و`dir` و`intlLocale` و`order`.
3. ترجم كل مفتاح في `strings`.

ثم يظهر الاختيار في قائمة اللغات فوراً. الأرقام لاتينية (0-9) في كل اللغات عبر `intlLocale` (مثل `ar-DZ-u-nu-latn`).

الاستخدام في المكوّنات: `const { t, formatNumber, formatCurrency } = useI18n();` ثم `t('nav.home')`. النصوص المعاملة تستعمل {{placeholder}}: `t('key', { name: 'x' })`.

`setLang` هو **المدخل الوحيد** لتغيير اللغة؛ يُخزَّن حالياً في `localStorage` بالمفتاح `swipex_lang`، وستربطه الخطوة 5 بحقل `settings.language` في Firestore.

## الثيم

ثلاثة أوضاع: `light` (نهاري) و`dark` (ليلي) و`system` (حسب الجهاز، وهو الافتراضي). المفتاح في `localStorage`: `swipex_theme`. وضع `system` يتابع تغيير تفضيل النظام **لحظياً** عبر مستمع `prefers-color-scheme`.

سكربت مضمَّن في `<head>` من `index.html` يطبّق اللغة والثيم **قبل** رسم React، فيمنع وميض الخلفية عند التحميل أو إعادة التحميل.

التخزين:

| المفتاح | القيم | الملف |
|---|---|---|
| `swipex_lang` | `ar` / `fr` / `en` | `src/i18n/I18nProvider.tsx` |
| `swipex_theme` | `light` / `dark` / `system` | `src/lib/theme/theme.ts` |

## ملاحظات أمنية

`npm audit` يبلغ عن ثغرتين **متوسطة/عالية** تخصّان `esbuild` عبر `vite`، وهي **خاصّة بخادم التطوير `npm run dev` فقط** ولا تدخل ملفات الإنتاج (البناء يُنتج JavaScript ثابتاً بلا `esbuild`). لذلك:

- **لا ننفّذ `npm audit fix --force`** — ذلك يقفز بـ Vite إلى إصدار رئيسي بعيد ويغيّر البنية.
- تُعالَج لاحقاً في خطوة ترقية Vite مستقلة.
- ثغرة `react-router` (Open Redirect في `<Link>`/`useNavigate`) عولجت بترقية `react-router-dom` إلى الإصدار 7.

التحقق الحالي: `npm audit --omit=dev` ← **0 ثغرات** (حزم الإنتاج نظيفة).

## حواجز الجودة

سكربت `scripts/check-i18n.mjs` يُنفَّذ في بداية `npm run build` ويُفشل البناء إن وُجد نص عربي في ملف `.ts`/`.tsx` خارج `src/i18n`. هذا يُلزم قاعدة: نص الواجهة عبر `t()`، والتعليقات بالإنجليزية.
