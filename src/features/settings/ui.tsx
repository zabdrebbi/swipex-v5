import type { ReactNode } from 'react';
import { Minus, Plus } from 'lucide-react';
import StatusIcon from '@/components/StatusIcon';

/** Shared class for every text/number/select control on the settings screen. */
export const inputClass =
  'min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:ring-gray-100';

export type ButtonVariant = 'primary' | 'soft' | 'danger';

/** Shared class for the action buttons of a group. */
export function buttonClass(variant: ButtonVariant = 'soft'): string {
  const base =
    'flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors disabled:opacity-60';
  if (variant === 'primary')
    return `${base} bg-gray-900 text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white`;
  if (variant === 'danger')
    return `${base} border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40`;
  return `${base} border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800`;
}

/** One settings group: title + a single card holding its rows. */
export function Group({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{title}</h2>
        {badge !== undefined && <span className="text-xs font-bold text-gray-400 dark:text-gray-500">{badge}</span>}
      </div>
      <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
        {children}
      </div>
    </section>
  );
}

/** Padded block inside a group (forms, editors, lists). */
export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`space-y-3 p-4 ${className}`}>{children}</div>;
}

/**
 * Titled block INSIDE a Group card (v4 workflow group holds statuses, tags
 * and favourites as three sub-sections of one list).
 */
export function SubSection({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 px-4 pb-1 pt-4">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h3>
        {badge !== undefined && <span className="text-xs font-bold text-gray-400 dark:text-gray-500">{badge}</span>}
      </div>
      <div className="space-y-3 px-4 pb-4">{children}</div>
    </div>
  );
}

/** Label + optional hint on the start, the control on the end (stacked on phones). */
export function Row({
  title,
  hint,
  children,
  htmlFor,
}: {
  title: string;
  hint?: string;
  children?: ReactNode;
  htmlFor?: string;
}) {
  const titleClass = 'block text-sm font-bold text-gray-900 dark:text-white';
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 sm:flex-1">
        {htmlFor === undefined ? (
          <span className={titleClass}>{title}</span>
        ) : (
          <label htmlFor={htmlFor} className={titleClass}>
            {title}
          </label>
        )}
        {hint !== undefined && (
          <p className="mt-0.5 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{hint}</p>
        )}
      </div>
      {children !== undefined && (
        <div className="flex w-full justify-start sm:w-80 sm:shrink-0 sm:justify-end">{children}</div>
      )}
    </div>
  );
}

/** On/off toggle (always laid out LTR so the knob slides the same way). */
export function Switch({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      dir="ltr"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      <span
        className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

/** Three-way (or more) choice used for theme, language and direction. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (next: T) => void;
  ariaLabel: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`flex min-h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-bold transition-colors ${
              active
                ? 'bg-white text-gray-900 shadow dark:bg-gray-600 dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** −/value/+ control for the delivery countdown (clamped to 1..max). */
export function Stepper({
  value,
  min,
  max,
  onChange,
  disabled = false,
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  const clamp = (next: number) => Math.max(min, Math.min(max, next));
  const stepClass = `flex size-10 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800`;
  return (
    <div role="group" aria-label={ariaLabel} className="flex items-center gap-2">
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - 1))}
        aria-label={`${ariaLabel} −`}
        className={stepClass}
      >
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(event) => onChange(clamp(Number(event.target.value) || min))}
        className="w-16 rounded-lg border border-gray-300 bg-transparent px-2 py-1.5 text-center text-sm font-bold outline-none disabled:opacity-60 dark:border-gray-700"
      />
      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={() => onChange(clamp(value + 1))}
        aria-label={`${ariaLabel} +`}
        className={stepClass}
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/** Palette dots (custom statuses and groups share it). */
export function Swatches({
  value,
  onChange,
  colors,
  ariaLabel,
}: {
  value: string;
  onChange: (color: string) => void;
  colors: readonly string[];
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={value === color}
          aria-label={color}
          onClick={() => onChange(color)}
          className={`size-9 rounded-full border-2 transition-transform ${
            value === color ? 'scale-110 border-white shadow dark:border-gray-900' : 'border-transparent'
          }`}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

/** Grid of lucide icon names for statuses and groups. */
export function IconPicker({
  value,
  onChange,
  names,
  ariaLabel,
}: {
  value: string;
  onChange: (icon: string) => void;
  names: readonly string[];
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {names.map((name) => (
        <button
          key={name}
          type="button"
          role="radio"
          aria-checked={value === name}
          aria-label={name}
          onClick={() => onChange(name)}
          className={`flex size-10 items-center justify-center rounded-lg border transition-colors ${
            value === name
              ? 'border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900'
              : 'border-gray-300 text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800'
          }`}
        >
          <StatusIcon name={name} className="size-4" />
        </button>
      ))}
    </div>
  );
}
