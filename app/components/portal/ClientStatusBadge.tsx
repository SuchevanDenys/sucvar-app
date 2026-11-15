// app/components/portal/ClientStatusBadge.tsx — starea aprobării clientului, monocrom.
// Ierarhie fără culoare: aprobat = plin (cerneală), modificări = contur accentuat, în așteptare = contur discret.
import React from 'react';
import { Check, Clock, PencilLine } from 'lucide-react';
import type { ClientStatus } from '@/app/lib/database.types';
import { EYEBROW } from '@/app/lib/theme/skin';

export const CLIENT_STATUS_LABELS: Record<ClientStatus, { ro: string; en: string }> = {
  pending: { ro: 'În așteptare', en: 'Pending' },
  approved: { ro: 'Aprobat de client', en: 'Approved by client' },
  changes_requested: { ro: 'Modificări solicitate', en: 'Changes requested' },
};

export default function ClientStatusBadge({
  status,
  isDark,
  isRo,
  className = '',
}: {
  status: ClientStatus;
  isDark: boolean;
  isRo: boolean;
  className?: string;
}) {
  const tone =
    status === 'approved'
      ? isDark ? 'bg-[#F5F5F5] text-[#111111] border-[#F5F5F5]' : 'bg-[#111111] text-white border-[#111111]'
      : status === 'changes_requested'
        ? isDark ? 'text-[#F5F5F5] border-[#F5F5F5]' : 'text-[#111111] border-[#111111]'
        : isDark ? 'border-[#262629] text-[#A1A1AA]' : 'border-[#E5E5E5] text-[#666666]';
  const Icon = status === 'approved' ? Check : status === 'changes_requested' ? PencilLine : Clock;
  const label = CLIENT_STATUS_LABELS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-full border ${EYEBROW} tracking-[0.14em] ${tone} ${className}`}>
      <Icon className="w-3 h-3" aria-hidden />
      {isRo ? label.ro : label.en}
    </span>
  );
}
