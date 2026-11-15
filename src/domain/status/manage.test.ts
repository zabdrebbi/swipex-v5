import { describe, expect, it } from 'vitest';
import type { CustomStatus, StatusGroup, StatusRef } from './types';
import {
  allStatusRefs,
  layoutStatuses,
  newCustomStatusId,
  newStatusGroupId,
  orderedStatusRefs,
  planCustomStatusRemoval,
} from './manage';

const CUSTOM_A: CustomStatus = {
  id: 'cs_alpha',
  name: { ar: 'Alpha', fr: 'Alpha', en: 'Alpha' },
  color: '#8b5cf6',
  icon: 'Tag',
};
const CUSTOM_B: CustomStatus = {
  id: 'cs_beta',
  name: { ar: 'Beta', fr: 'Beta', en: 'Beta' },
  color: '#06b6d4',
  icon: 'Flag',
};
const REF_A: StatusRef = 'custom:cs_alpha';
const REF_B: StatusRef = 'custom:cs_beta';

function group(overrides: Partial<StatusGroup> = {}): StatusGroup {
  return {
    id: 'sg_1',
    name: 'Urgent',
    color: '#6b7280',
    icon: 'Layers',
    layout: 'column',
    statuses: [],
    ...overrides,
  };
}

describe('orderedStatusRefs', () => {
  it('keeps the default order when statusOrder is empty', () => {
    const ordered = orderedStatusRefs([], []);
    expect(ordered).toEqual([
      'no_action',
      'waiting',
      'delivered',
      'closed',
      'no_answer',
      'wrong_number',
      'postponed',
      'cancelled',
    ]);
  });

  it('applies the stored order and appends what it does not mention', () => {
    const ordered = orderedStatusRefs([CUSTOM_A], ['delivered', REF_A, 'no_action']);
    expect(ordered[0]).toBe('delivered');
    expect(ordered[1]).toBe(REF_A);
    expect(ordered[2]).toBe('no_action');
    expect(ordered).toHaveLength(9);
  });

  it('drops unknown refs and duplicates from the stored order', () => {
    const ordered = orderedStatusRefs([CUSTOM_A], ['delivered', 'delivered', 'custom:cs_gone']);
    expect(ordered.filter((ref) => ref === 'delivered')).toHaveLength(1);
    expect(ordered).not.toContain('custom:cs_gone');
    expect(ordered).toHaveLength(9);
  });

  it('lists built-ins before customs when nothing is ordered', () => {
    const ordered = allStatusRefs([CUSTOM_A, CUSTOM_B]);
    expect(ordered.slice(-2)).toEqual([REF_A, REF_B]);
  });
});

describe('layoutStatuses', () => {
  it('puts grouped statuses in their group and the rest in display order', () => {
    const layout = layoutStatuses(
      [CUSTOM_A],
      [],
      [group({ statuses: ['waiting', REF_A] })],
    );
    expect(layout.groups).toHaveLength(1);
    expect(layout.groups[0].refs).toEqual(['waiting', REF_A]);
    expect(layout.loose[0]).toBe('no_action');
    expect(layout.loose).not.toContain('waiting');
    expect(layout.loose).not.toContain(REF_A);
  });

  it('ignores stale refs and assigns a status to the first group only', () => {
    const layout = layoutStatuses(
      [CUSTOM_A],
      [],
      [
        group({ id: 'sg_1', statuses: ['delivered', 'custom:cs_gone'] }),
        group({ id: 'sg_2', statuses: ['delivered'] }),
      ],
    );
    expect(layout.groups[0].refs).toEqual(['delivered']);
    expect(layout.groups[1].refs).toEqual([]);
    expect(layout.loose).not.toContain('delivered');
  });
});

describe('planCustomStatusRemoval', () => {
  const state = {
    customStatuses: [CUSTOM_A, CUSTOM_B],
    statusOrder: ['delivered', REF_A, REF_B] as StatusRef[],
    statusGroups: [group({ statuses: [REF_A, 'waiting'] })],
    statusActionEnabled: { [REF_A]: true, [REF_B]: false } as Record<string, boolean>,
  };

  it('returns null for an unknown status', () => {
    expect(planCustomStatusRemoval(state, 'cs_missing')).toBeNull();
  });

  it('removes the status from every settings field in one patch', () => {
    const plan = planCustomStatusRemoval(state, 'cs_alpha');
    expect(plan).not.toBeNull();
    expect(plan?.removedRef).toBe(REF_A);
    expect(plan?.patch.customStatuses).toEqual([CUSTOM_B]);
    expect(plan?.patch.statusOrder).toEqual(['delivered', REF_B]);
    expect(plan?.patch.statusGroups[0].statuses).toEqual(['waiting']);
    expect(plan?.patch.statusActionEnabled).toEqual({ [REF_B]: false });
  });

  it('leaves the original state untouched', () => {
    planCustomStatusRemoval(state, 'cs_alpha');
    expect(state.customStatuses).toHaveLength(2);
    expect(state.statusOrder).toHaveLength(3);
    expect(state.statusGroups[0].statuses).toEqual([REF_A, 'waiting']);
  });
});

describe('id generators', () => {
  it('produces ids accepted by the settings normaliser', () => {
    expect(newCustomStatusId()).toMatch(/^cs_[A-Za-z0-9_-]+$/);
    expect(newStatusGroupId()).toMatch(/^sg_[A-Za-z0-9_-]+$/);
    expect(newCustomStatusId()).not.toBe(newCustomStatusId());
  });
});
