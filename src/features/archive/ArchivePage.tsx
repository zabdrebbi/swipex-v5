import { useI18n } from '@/i18n';

export default function ArchivePage() {
  const { t } = useI18n();
  return <h1 className="text-xl font-bold">{t('nav.archive')}</h1>;
}
