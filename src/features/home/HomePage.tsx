import { useI18n } from '@/i18n';

export default function HomePage() {
  const { t } = useI18n();
  return <h1 className="text-xl font-bold">{t('nav.home')}</h1>;
}
