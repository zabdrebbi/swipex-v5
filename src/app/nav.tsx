import { Archive, Home, ListChecks, UserCog, type LucideIcon } from 'lucide-react';
import type { TranslationKey } from '@/i18n';

export interface NavItem {
  to: string;
  labelKey: TranslationKey;
  icon: LucideIcon;
  end?: boolean;
}

const HOME: NavItem = { to: '/', labelKey: 'nav.home', icon: Home, end: true };
const TASKS: NavItem = { to: '/tasks', labelKey: 'nav.tasks', icon: ListChecks };
const ARCHIVE: NavItem = { to: '/archive', labelKey: 'nav.archive', icon: Archive };
const SETTINGS: NavItem = { to: '/settings', labelKey: 'nav.settings', icon: UserCog };

/** Sidebar order (desktop), top to bottom. */
export const NAV_DESKTOP: NavItem[] = [HOME, TASKS, ARCHIVE, SETTINGS];

/** Bottom bar order (mobile): same as the current app. */
export const NAV_MOBILE: NavItem[] = [SETTINGS, TASKS, HOME, ARCHIVE];
