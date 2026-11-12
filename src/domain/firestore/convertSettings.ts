import type { LangCode } from '../localized';
import type { Settings, ThemeMode, DirectionMode, TagDef, FavoritePhone } from '../settings/types';
import type { CustomStatus, StatusRef, StatusGroup } from '../status/types';
import { createDefaultSettings } from '../settings/defaults';
import { BUILT_IN_STATUSES, customStatusRef, isBuiltInStatusKey, parseStatusRef } from '../status/statuses';
import { sanitizeRecord } from './serialize';

const THEME_MODES: readonly ThemeMode[] = ['light', 'dark', 'auto'];
const DIRECTIONS: readonly DirectionMode[] = ['auto', 'rtl', 'ltr'];
const LANGUAGES: readonly LangCode[] = ['ar', 'fr', 'en'];
const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/;

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function optStr(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function clampSeconds(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 30
    ? value
    : fallback;
}

function normalizeColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && HEX_COLOR.test(value) ? value : fallback;
}

/** Keeps only refs that are built-in keys or well-formed custom refs. */
function normalizeStatusOrder(value: unknown): StatusRef[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<StatusRef>();
  const order: StatusRef[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const ref = item as StatusRef;
    const parsed = parseStatusRef(ref);
    if (parsed.kind === 'custom' && !parsed.id.startsWith('cs_')) continue;
    if (parsed.kind === 'built-in' && !isBuiltInStatusKey(parsed.key)) continue;
    if (seen.has(ref)) continue;
    seen.add(ref);
    order.push(ref);
  }
  return order;
}

function normalizeLocalizedText(value: unknown): CustomStatus['name'] | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  const text = { ar: str(raw.ar), fr: str(raw.fr), en: str(raw.en) };
  return text.ar !== '' && text.fr !== '' && text.en !== '' ? text : null;
}

function normalizeCustomStatuses(value: unknown, existing: CustomStatus[]): CustomStatus[] {
  if (!Array.isArray(value)) return [];
  const out: CustomStatus[] = [];
  const seenIds = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'object' || item === null) continue;
    const raw = item as Record<string, unknown>;
    const id = str(raw.id);
    // Preserve the previous colour/icon if the stored copy lost them.
    const previous = existing.find((s) => s.id === id);
    const name = normalizeLocalizedText(raw.name) ?? previous?.name ?? null;
    if (!/^cs_[A-Za-z0-9_-]+$/.test(id) || name === null || seenIds.has(id)) continue;
    seenIds.add(id);
    out.push({
      id: id as CustomStatus['id'],
      name,
      color: normalizeColor(raw.color, previous?.color ?? '#8b5cf6'),
      icon: str(raw.icon, previous?.icon ?? 'Tag') || 'Tag',
    });
  }
  return out;
}

function normalizeStatusGroups(value: unknown, validRefs: Set<StatusRef>): StatusGroup[] {
  if (!Array.isArray(value)) return [];
  const out: StatusGroup[] = [];
  const seenIds = new Set<string>();
  const assigned = new Set<StatusRef>();
  for (const item of value) {
    if (typeof item !== 'object' || item === null) continue;
    const raw = item as Record<string, unknown>;
    const id = str(raw.id);
    const name = str(raw.name).trim();
    if (id === '' || name === '' || seenIds.has(id)) continue;
    seenIds.add(id);
    const statuses: StatusRef[] = [];
    if (Array.isArray(raw.statuses)) {
      for (const ref of raw.statuses) {
        // A status belongs to exactly one group (v4 rule).
        if (typeof ref !== 'string' || !validRefs.has(ref as StatusRef) || assigned.has(ref as StatusRef)) continue;
        assigned.add(ref as StatusRef);
        statuses.push(ref as StatusRef);
      }
    }
    out.push({
      id,
      name,
      color: normalizeColor(raw.color, '#6b7280'),
      icon: str(raw.icon, 'Layers') || 'Layers',
      layout: raw.layout === 'row' ? 'row' : 'column',
      statuses,
    });
  }
  return out;
}

function normalizeTags(value: unknown): TagDef[] {
  if (!Array.isArray(value)) return [];
  const out: TagDef[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'object' || item === null) continue;
    const raw = item as Record<string, unknown>;
    const name = str(raw.name).replace(/^@/, '').trim();
    if (name === '' || seen.has(name)) continue;
    seen.add(name);
    const scope = raw.scope === 'municipality' ? 'municipality' : 'global';
    const tag: TagDef = { name, color: normalizeColor(raw.color, '#8b5cf6'), scope };
    if (scope === 'municipality') {
      const municipality = optStr(raw.municipality);
      if (municipality === undefined) continue;
      tag.municipality = municipality;
    }
    out.push(tag);
  }
  return out;
}

function normalizeFavorites(value: unknown): FavoritePhone[] {
  if (!Array.isArray(value)) return [];
  const out: FavoritePhone[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'object' || item === null) continue;
    const raw = item as Record<string, unknown>;
    const phone = str(raw.phone).trim();
    if (phone === '' || seen.has(phone)) continue;
    seen.add(phone);
    const fav: FavoritePhone = { phone, name: str(raw.name) };
    const municipality = optStr(raw.municipality);
    if (municipality !== undefined) fav.municipality = municipality;
    out.push(fav);
  }
  return out;
}

function normalizeTagOrder(value: unknown, tags: TagDef[]): string[] {
  if (!Array.isArray(value)) return [];
  const known = new Set(tags.map((t) => t.name));
  const order: string[] = [];
  for (const item of value) {
    if (typeof item === 'string' && known.has(item) && !order.includes(item)) order.push(item);
  }
  return order;
}

/** A day is stored as `YYYY-MM-DD`; otherwise keep the default. */
function normalizeSessionDate(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

/**
 * Merges a stored settings document over the defaults: missing or malformed
 * fields fall back to defaults, so an old/partial document never breaks the app.
 */
export function settingsFromDoc(data: Record<string, unknown>, today: string): Settings {
  const defaults = createDefaultSettings(today);
  const customStatuses = normalizeCustomStatuses(data.customStatuses, defaults.customStatuses);
  const statusOrder = normalizeStatusOrder(data.statusOrder);
  const validRefs = new Set<StatusRef>([
    ...BUILT_IN_STATUSES.map((s) => s.key),
    ...customStatuses.map((s) => customStatusRef(s.id)),
  ]);
  const tags = normalizeTags(data.tags);
  const settings: Settings = {
    ...defaults,
    themeMode: THEME_MODES.includes(data.themeMode as ThemeMode) ? (data.themeMode as ThemeMode) : defaults.themeMode,
    language: LANGUAGES.includes(data.language as LangCode) ? (data.language as LangCode) : defaults.language,
    direction: DIRECTIONS.includes(data.direction as DirectionMode) ? (data.direction as DirectionMode) : defaults.direction,
    showDuplicates: bool(data.showDuplicates, defaults.showDuplicates),
    customStatuses,
    statusOrder,
    statusGroups: normalizeStatusGroups(data.statusGroups, validRefs),
    deliveryConfirmEnabled: bool(data.deliveryConfirmEnabled, defaults.deliveryConfirmEnabled),
    deliveryConfirmSeconds: clampSeconds(data.deliveryConfirmSeconds, defaults.deliveryConfirmSeconds),
    statusActionEnabled: normalizeStatusAction(data.statusActionEnabled, validRefs),
    tagsEnabled: bool(data.tagsEnabled, defaults.tagsEnabled),
    tags,
    tagOrder: normalizeTagOrder(data.tagOrder, tags),
    smartTagSortingEnabled: bool(data.smartTagSortingEnabled, defaults.smartTagSortingEnabled),
    cardTrackingEnabled: bool(data.cardTrackingEnabled, defaults.cardTrackingEnabled),
    favoritePhonesEnabled: bool(data.favoritePhonesEnabled, defaults.favoritePhonesEnabled),
    favoritePhones: normalizeFavorites(data.favoritePhones),
    smsTemplate: optStr(data.smsTemplate) ?? null,
    whatsappTemplate: optStr(data.whatsappTemplate) ?? null,
    smsStatusTemplate: optStr(data.smsStatusTemplate) ?? null,
    smsWrongNumberTemplate: optStr(data.smsWrongNumberTemplate) ?? null,
    smsContentLength:
      typeof data.smsContentLength === 'number' && data.smsContentLength >= 0 && data.smsContentLength <= 200
        ? Math.round(data.smsContentLength)
        : defaults.smsContentLength,
    smsOnStatusClosed: bool(data.smsOnStatusClosed, defaults.smsOnStatusClosed),
    smsOnStatusNoAnswer: bool(data.smsOnStatusNoAnswer, defaults.smsOnStatusNoAnswer),
    smsOnStatusWrongNumber: bool(data.smsOnStatusWrongNumber, defaults.smsOnStatusWrongNumber),
    smsSaving: bool(data.smsSaving, defaults.smsSaving),
    bulkSmsEnabled: bool(data.bulkSmsEnabled, defaults.bulkSmsEnabled),
    archiveSyncEnabled: bool(data.archiveSyncEnabled, defaults.archiveSyncEnabled),
    deliveryCueEnabled: bool(data.deliveryCueEnabled, defaults.deliveryCueEnabled),
    sessionDate: normalizeSessionDate(data.sessionDate, defaults.sessionDate),
  };
  return settings;
}

function normalizeStatusAction(value: unknown, validRefs: Set<StatusRef>): Record<string, boolean> {
  if (typeof value !== 'object' || value === null) return {};
  const out: Record<string, boolean> = {};
  for (const [key, flag] of Object.entries(value as Record<string, unknown>)) {
    if (typeof flag === 'boolean' && validRefs.has(key as StatusRef)) out[key] = flag;
  }
  return out;
}

/** Domain settings -> sanitised document body (never write the whole doc blindly: sync layer sends changed keys only). */
export function settingsToDoc(settings: Settings): Record<string, unknown> {
  return sanitizeRecord(settings as unknown as Record<string, unknown>) as Record<string, unknown>;
}
