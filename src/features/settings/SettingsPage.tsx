import { useI18n } from '@/i18n';
import SignOutButton from '@/components/SignOutButton';
import { useSettings } from './SettingsProvider';
import { Group } from './ui';
import ProfileCard from './sections/ProfileCard';
import AccountSection from './sections/AccountSection';
import PreferencesSection from './sections/PreferencesSection';
import StatusesSection from './sections/StatusesSection';
import TagsSection from './sections/TagsSection';
import FavoritesSection from './sections/FavoritesSection';
import CommunicationSection from './sections/CommunicationSection';
import DataSection from './sections/DataSection';
import pkg from '../../../package.json';

/**
 * Settings shell (v4 settings.html): profile card + the five groups
 * (account, preferences, workflow = statuses/tags/favourites, communication,
 * data & app) + the sign-out/version footer. Every group is a child section;
 * the real editing lives in `sections/`.
 */
export default function SettingsPage() {
  const { t } = useI18n();
  const { status, retryLoad } = useSettings();

  return (
    <div className="space-y-6 pb-10">
      <h1 className="text-xl font-bold">{t('settings.title')}</h1>

      {status === 'error' && (
        <div
          role="alert"
          className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
        >
          <p>{t('settings.load_error')}</p>
          <button
            type="button"
            onClick={retryLoad}
            className="mt-2 min-h-11 rounded-xl bg-red-600 px-4 text-white hover:bg-red-700"
          >
            {t('settings.load_retry')}
          </button>
        </div>
      )}

      <ProfileCard />

      <AccountSection />
      <PreferencesSection />

      <Group title={t('settings.group_workflow')}>
        <StatusesSection />
        <TagsSection />
        <FavoritesSection />
      </Group>

      <CommunicationSection />
      <DataSection />

      <footer className="space-y-3 pt-2">
        <SignOutButton />
        <p className="text-center text-xs text-gray-400 dark:text-gray-500" dir="ltr">
          SwiPex Pro v{pkg.version} © 2026
        </p>
      </footer>
    </div>
  );
}
