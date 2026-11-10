import { Loader2 } from 'lucide-react';
import { useI18n } from '@/i18n';

export default function FullScreenLoader() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 text-gray-500 dark:text-gray-400" role="status" aria-busy="true">
      <Loader2 className="size-8 animate-spin" aria-hidden="true" />
      <span className="text-sm font-bold">{t('auth.loading')}</span>
    </div>
  );
}
