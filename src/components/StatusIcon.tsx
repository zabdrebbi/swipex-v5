import {
  AlertTriangle,
  ArrowLeftRight,
  Ban,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock,
  Flag,
  FolderOpen,
  Hand,
  Hourglass,
  Layers,
  MapPin,
  PauseCircle,
  PhoneMissed,
  PhoneOff,
  RotateCcw,
  Star,
  Tag,
  UserX,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

/**
 * Every lucide icon a status or a group may reference (built-in defaults, the
 * custom-status palette and the group palette). Stored names resolve through
 * this map; an unknown/legacy name falls back to a neutral dot instead of
 * crashing the card.
 */
const ICONS: Record<string, LucideIcon> = {
  Hourglass,
  Clock,
  CheckCircle2,
  PhoneOff,
  PhoneMissed,
  AlertTriangle,
  CalendarDays,
  XCircle,
  Tag,
  Flag,
  Star,
  Ban,
  RotateCcw,
  MapPin,
  UserX,
  Hand,
  ArrowLeftRight,
  PauseCircle,
  Layers,
  FolderOpen,
  Bell,
};

interface StatusIconProps {
  /** Stored icon name (`CustomStatus.icon` / `StatusGroup.icon`). */
  name: string;
  className?: string;
}

/** Resolves a stored icon name to a lucide component (never throws). */
export default function StatusIcon({ name, className = 'size-4' }: StatusIconProps) {
  const Icon = ICONS[name] ?? Clock;
  return <Icon className={className} aria-hidden="true" />;
}
