import type { DailyHistoryEntry } from '@/lib/storage';

export type HistoryRange = 7 | 30 | 90;

export type WeeklyPastGroup = {
  weekStart: string;
  entries: DailyHistoryEntry[];
  weeklyPercent: number;
};

export function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function dateFromIso(dateIso: string): Date {
  const [year, month, day] = dateIso.split('-').map(Number);
  return new Date(year || 1970, (month || 1) - 1, day || 1);
}

function isoFromDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDateLabel(dateIso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(dateFromIso(dateIso));
}

export function getWeekStartMonday(dateIso: string): string {
  const date = dateFromIso(dateIso);
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + offset);
  return isoFromDate(date);
}

export function formatWeekRangeLabel(weekStartIso: string): string {
  const weekStart = dateFromIso(weekStartIso);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const sameYear = weekStart.getFullYear() === weekEnd.getFullYear();
  if (sameMonth && sameYear) {
    const month = new Intl.DateTimeFormat(undefined, { month: 'short' }).format(weekStart);
    return `${month} ${weekStart.getDate()}-${weekEnd.getDate()}`;
  }

  const left = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(weekStart);
  const right = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(weekEnd);
  return `${left} - ${right}`;
}

function formatAxisTickLabel(dateIso: string, range: HistoryRange): string {
  const date = dateFromIso(dateIso);
  if (range === 30) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}`;
  }
  if (range === 90) {
    return new Intl.DateTimeFormat(undefined, { month: 'short' }).format(date);
  }
  return new Intl.DateTimeFormat(undefined, { day: 'numeric' }).format(date);
}

function pickLabelMeta(index: number, groupCount: number): { showLabel: boolean; labelAlign: 'left' | 'center' | 'right' } {
  const middleIndex = Math.floor((groupCount - 1) / 2);
  if (index === 0) return { showLabel: true, labelAlign: 'left' };
  if (index === middleIndex) return { showLabel: true, labelAlign: 'center' };
  if (index === groupCount - 1) return { showLabel: true, labelAlign: 'right' };
  return { showLabel: false, labelAlign: 'left' };
}

export function aggregateChartEntries(
  history: DailyHistoryEntry[],
  range: HistoryRange,
): {
  id: string;
  intakeMl: number;
  label: string;
  showLabel: boolean;
  labelAlign: 'left' | 'center' | 'right';
}[] {
  const chronological = history.slice(0, range).reverse();
  if (chronological.length === 0) return [];

  if (range === 7) {
    return chronological.map((item) => ({
      id: item.date,
      intakeMl: item.intakeMl,
      label: new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(dateFromIso(item.date)),
      showLabel: true,
      labelAlign: 'center',
    }));
  }

  const groupSize = range === 30 ? 2 : 7;
  const groups: DailyHistoryEntry[][] = [];
  for (let i = 0; i < chronological.length; i += groupSize) {
    groups.push(chronological.slice(i, i + groupSize));
  }

  return groups.map((group, index) => {
    const startDate = group[0]?.date ?? '';
    const endDate = group[group.length - 1]?.date ?? startDate;
    const avgMl = Math.round(
      group.reduce((sum, entry) => sum + entry.intakeMl, 0) / Math.max(1, group.length),
    );
    const { showLabel, labelAlign } = pickLabelMeta(index, groups.length);
    return {
      id: `${startDate}_${endDate}`,
      intakeMl: avgMl,
      label: formatAxisTickLabel(endDate, range),
      showLabel,
      labelAlign,
    };
  });
}

export function generateFakeHistory(days: number, goalMl: number): DailyHistoryEntry[] {
  const now = new Date();
  const safeGoal = Math.max(100, goalMl);
  const generated: DailyHistoryEntry[] = [];

  for (let index = 0; index < Math.max(1, Math.round(days)); index += 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - index);
    const dateIso = isoFromDate(date);
    const trend = 0.75 + 0.2 * Math.sin(index / 6);
    const variance = 0.6 + Math.random() * 0.8;
    const dropout = Math.random() < 0.08;
    const intakeMl = dropout ? 0 : Math.round((safeGoal * trend * variance) / 10) * 10;
    generated.push({ date: dateIso, intakeMl });
  }

  return generated;
}

export function groupPastEntriesByWeek(pastEntries: DailyHistoryEntry[], goalMl: number): WeeklyPastGroup[] {
  const groups: WeeklyPastGroup[] = [];
  for (const item of pastEntries) {
    const weekStart = getWeekStartMonday(item.date);
    const lastGroup = groups[groups.length - 1];
    if (!lastGroup || lastGroup.weekStart !== weekStart) {
      groups.push({ weekStart, entries: [item], weeklyPercent: 0 });
    } else {
      lastGroup.entries.push(item);
    }
  }

  return groups.map((group) => {
    const totalMl = group.entries.reduce((sum, entry) => sum + entry.intakeMl, 0);
    const totalGoalMl = goalMl > 0 ? goalMl * group.entries.length : 0;
    const weeklyPercent = totalGoalMl > 0 ? Math.round((totalMl / totalGoalMl) * 100) : 0;
    return { ...group, weeklyPercent };
  });
}
