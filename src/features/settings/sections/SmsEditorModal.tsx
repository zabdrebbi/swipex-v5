import { useEffect, useRef, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { useI18n, type TranslationKey } from '@/i18n';
import { SMS_PLACEHOLDERS } from '@/domain/parcel/sms';

/** The four editable templates (settings field names). */
export type SmsTemplateKey =
  | 'smsTemplate'
  | 'whatsappTemplate'
  | 'smsStatusTemplate'
  | 'smsWrongNumberTemplate';

interface SmsEditorModalProps {
  templateKey: SmsTemplateKey;
  /** Current stored value (null = the built-in i18n default is shown). */
  value: string | null;
  /** Current `{content}` truncation length (v4 counter lives in this modal). */
  contentLength: number;
  /** Resolves the translated default for the textarea and the reset button. */
  defaultFor: (key: SmsTemplateKey) => string;
  onSave: (key: SmsTemplateKey, next: string | null) => void;
  /** −5/+5 step of the content counter (min 1), persisted immediately. */
  onContentLengthChange: (next: number) => void;
  onClose: () => void;
}

const TITLE_KEYS: Record<SmsTemplateKey, TranslationKey> = {
  smsTemplate: 'sms_editor.title_delivery',
  whatsappTemplate: 'sms_editor.title_whatsapp',
  smsStatusTemplate: 'sms_editor.title_status',
  smsWrongNumberTemplate: 'sms_editor.title_wrong',
};

/**
 * Template editor (v4 `showSmsEditor`): textarea + seven ASCII placeholder
 * chips inserted at the cursor, the `{content}` −5/+5 length counter, cancel
 * and save. Saving the exact default stores `null` so a future default
 * change still applies (empty text also stores null).
 */
export default function SmsEditorModal({
  templateKey,
  value,
  contentLength,
  defaultFor,
  onSave,
  onContentLengthChange,
  onClose,
}: SmsEditorModalProps) {
  const { t } = useI18n();
  const fallback = defaultFor(templateKey);
  const [text, setText] = useState(value ?? fallback);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  function insertPlaceholder(placeholder: string) {
    const tag = `{${placeholder}}`;
    const textarea = textareaRef.current;
    if (textarea === null) {
      setText((current) => current + tag);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    setText(text.slice(0, start) + tag + text.slice(end));
    const pos = start + tag.length;
    // Restore the caret after React re-renders the new value.
    requestAnimationFrame(() => {
      textarea.setSelectionRange(pos, pos);
      textarea.focus();
    });
  }

  function handleSave() {
    const trimmed = text.trim();
    onSave(templateKey, trimmed === '' || trimmed === fallback.trim() ? null : text);
    onClose();
  }

  const stepClass =
    'flex size-8 items-center justify-center rounded-lg bg-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t(TITLE_KEYS[templateKey])}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{t(TITLE_KEYS[templateKey])}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex size-11 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={6}
            aria-label={t(TITLE_KEYS[templateKey])}
            className="w-full resize-y rounded-xl border border-gray-300 bg-white p-3 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:ring-gray-100"
          />

          <div>
            <p className="mb-2 text-xs font-bold text-gray-500 dark:text-gray-400">
              {t('sms_editor.insert_tag')}
            </p>
            <div className="flex flex-wrap gap-2">
              {SMS_PLACEHOLDERS.map((placeholder) => (
                <button
                  key={placeholder}
                  type="button"
                  onClick={() => insertPlaceholder(placeholder)}
                  dir="ltr"
                  className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
                >
                  {placeholder}
                </button>
              ))}
            </div>
          </div>

          {/* v4: the {content} truncation length, stepped by fives. */}
          <div className="flex items-center justify-between rounded-xl bg-gray-100 p-3 dark:bg-gray-800">
            <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
              {t('sms_editor.content_length')}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={contentLength <= 1}
                onClick={() => onContentLengthChange(Math.max(1, contentLength - 5))}
                aria-label={`${t('sms_editor.content_length')} −`}
                className={stepClass}
              >
                −
              </button>
              <span className="w-8 text-center text-sm font-bold text-gray-800 dark:text-gray-200" dir="ltr">
                {contentLength}
              </span>
              <button
                type="button"
                onClick={() => onContentLengthChange(contentLength + 5)}
                aria-label={`${t('sms_editor.content_length')} +`}
                className={stepClass}
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
          <button
            type="button"
            onClick={() => setText(fallback)}
            title={t('sms_editor.reset')}
            aria-label={t('sms_editor.reset')}
            className="flex min-h-11 w-12 items-center justify-center rounded-xl border border-gray-300 text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 flex-1 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {t('common.cancel')}
          </button>
          <button type="button" onClick={handleSave} className="min-h-11 flex-1 rounded-xl bg-gray-900 text-sm font-bold text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900">
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
