import { Archive, Home, ListChecks, UserCog, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const HOME: NavItem = { to: '/', label: 'الرئيسية', icon: Home, end: true };
const TASKS: NavItem = { to: '/tasks', label: 'المهام', icon: ListChecks };
const ARCHIVE: NavItem = { to: '/archive', label: 'الأرشيف', icon: Archive };
const SETTINGS: NavItem = { to: '/settings', label: 'الإعدادات', icon: UserCog };

/** ترتيب القائمة الجانبية (كمبيوتر): من الأعلى إلى الأسفل */
export const NAV_DESKTOP: NavItem[] = [HOME, TASKS, ARCHIVE, SETTINGS];

/** ترتيب الشريط السفلي (هاتف): كما في التطبيق الحالي */
export const NAV_MOBILE: NavItem[] = [SETTINGS, TASKS, HOME, ARCHIVE];
