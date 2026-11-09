export function makeFormatters(intlLocale: string) {
  const numberFormat = new Intl.NumberFormat(intlLocale);
  return {
    formatNumber: (n: number) => numberFormat.format(n),
    formatDate: (
      value: Date | number | string,
      options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
    ) => new Intl.DateTimeFormat(intlLocale, options).format(new Date(value)),
  };
}
