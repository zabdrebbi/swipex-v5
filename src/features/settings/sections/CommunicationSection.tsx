import { useState } from 'react';
import { MessageSquare, PenLine, RotateCcw } from 'lucide-react';
import { useI18n, type TranslationKey } from '@/i18n';
import { useSettings } from '../SettingsProvider';
import { useStatusDisplay } from '@/features/parcels/useStatusDisplay';
import StatusIcon from '@/components/StatusIcon';
import { Group, Panel, Row, Switch, buttonClass } from '../ui';
import SmsEditorModal, { type SmsTemplateKey } from './SmsEditorModal';

const DEFAULT_KEYS: Record<SmsTemplateKey, TranslationKey> = {
  smsTemplate: 'sms.default_status',
  whatsappTemplate: 'sms.default_status',
  smsStatusTemplate: 'sms.default_status',
  smsWrongNumberTemplate: 'sms.default_wrong_number',
};

interface StatusToggle {
  settingKey: 'smsOnStatusClosed' | 'smsOnStatusNoAnswer' | 'smsOnStatusWrongNumber';
  statusRef: 'closed' | 'no_answer' | 'wrong_number';
  /** Which template that status edits (wrong number messages the sender). */
  templateKey: SmsTemplateKey;
}

const STATUS_TOGGLES: StatusToggle[] = [
  { settingKey: 'smsOnStatusClosed', statusRef: 'closed', templateKey: 'smsStatusTemplate' },
  { settingKey: 'smsOnStatusNoAnswer', statusRef: 'no_answer', templateKey: 'smsStatusTemplate' },
  { settingKey: 'smsOnStatusWrongNumber', statusRef: 'wrong_number', templateKey: 'smsWrongNumberTemplate' },
];

/**
 * Communication group (v4 group 3): the delivery/WhatsApp template editors,
 * the three per-status SMS toggles with conditional editors, and the
 * "message saving" switch that only makes sense when one of them is on.
 * `bulkSmsEnabled` intentionally has no control (step 11 decision).
 */
export default function CommunicationSection() {
  const { t } = useI18n();
  const { settings, updateSettings } = useSettings();
  const { statusLabel, statusColor, statusIcon } = useStatusDisplay();
  const [editing, setEditing] = useState<SmsTemplateKey | null>(null);

  const anyStatusSms =
    settings.smsOnStatusClosed || settings.smsOnStatusNoAnswer || settings.smsOnStatusWrongNumber;

  function saveTemplate(key: SmsTemplateKey, next: string | null) {
    // Explicit branches: a computed union key would widen to an index signature.
    if (key === 'smsTemplate') updateSettings({ smsTemplate: next });
    else if (key === 'whatsappTemplate') updateSettings({ whatsappTemplate: next });
    else if (key === 'smsStatusTemplate') updateSettings({ smsStatusTemplate: next });
    else updateSettings({ smsWrongNumberTemplate: next });
  }

  function setToggle(key: StatusToggle['settingKey'], next: boolean) {
    if (key === 'smsOnStatusClosed') updateSettings({ smsOnStatusClosed: next });
    else if (key === 'smsOnStatusNoAnswer') updateSettings({ smsOnStatusNoAnswer: next });
    else updateSettings({ smsOnStatusWrongNumber: next });
  }

  const editor = (
    <>
      {editing !== null && (
        <SmsEditorModal
          templateKey={editing}
          value={settings[editing]}
          contentLength={settings.smsContentLength}
          defaultFor={(key) => t(DEFAULT_KEYS[key])}
          onSave={saveTemplate}
          onContentLengthChange={(smsContentLength) => updateSettings({ smsContentLength })}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );

  return (
    <Group title={t('settings.group_communication')}>
      <Panel>
        {/* --- the two always-editable templates, each with a reset-to-default --- */}
        <div className="space-y-2">
          {(['smsTemplate', 'whatsappTemplate'] as const).map((key) => (
            <div key={key} className="flex items-center gap-2 rounded-xl border border-gray-200 p-2.5 dark:border-gray-800">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <MessageSquare className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1 text-sm font-bold">
                {t(key === 'smsTemplate' ? 'settings.sms_template' : 'settings.sms_whatsapp')}
              </span>
              <button
                type="button"
                onClick={() => setEditing(key)}
                className="flex min-h-9 items-center gap-1.5 rounded-lg border border-gray-300 px-3 text-xs font-bold hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                <PenLine className="size-3.5" aria-hidden="true" />
                {t('settings.sms_edit')}
              </button>
              <button
                type="button"
                onClick={() => saveTemplate(key, null)}
                title={t('settings.sms_reset_default')}
                aria-label={`${t('settings.sms_reset_default')} — ${t(
                  key === 'smsTemplate' ? 'settings.sms_template' : 'settings.sms_whatsapp',
                )}`}
                className="flex size-9 items-center justify-center rounded-lg text-gray-400 hover:text-red-500"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>

        {/* --- SMS on status change: one switch per status (v4) --- */}
        <div className="space-y-2 border-t border-gray-100 pt-3 dark:border-gray-800">
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {t('settings.sms_on_status_change')}
            </p>
            <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              {t('settings.sms_per_status_hint')}
            </p>
          </div>

          {STATUS_TOGGLES.map(({ settingKey, statusRef, templateKey }) => (
            <div
              key={settingKey}
              className="rounded-xl border border-gray-200 p-2.5 dark:border-gray-800"
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: statusColor(statusRef) }}
                >
                  <StatusIcon name={statusIcon(statusRef)} className="size-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold">
                  {statusLabel(statusRef)}
                </span>
                <Switch
                  checked={settings[settingKey]}
                  onChange={(next) => setToggle(settingKey, next)}
                  label={`${t('settings.sms_on_status_change')} — ${statusLabel(statusRef)}`}
                />
              </div>
              {settings[settingKey] && (
                <button
                  type="button"
                  onClick={() => setEditing(templateKey)}
                  className={`${buttonClass('soft')} mt-2 w-full`}
                >
                  <PenLine className="size-3.5" aria-hidden="true" />
                  {t('settings.sms_edit')}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* --- message saving: only relevant when a status SMS is enabled --- */}
        {anyStatusSms && (
          <Row title={t('settings.sms_saving')} hint={t('settings.sms_saving_desc')}>
            <Switch
              checked={settings.smsSaving}
              onChange={(smsSaving) => updateSettings({ smsSaving })}
              label={t('settings.sms_saving')}
            />
          </Row>
        )}
      </Panel>

      {editor}
    </Group>
  );
}
