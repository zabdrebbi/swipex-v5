import { useI18n } from '@/i18n';

export default function LoginPage() {
  const { t } = useI18n();
  return <h1 className="text-xl font-bold">{t('auth.login_title')}</h1>;
}
