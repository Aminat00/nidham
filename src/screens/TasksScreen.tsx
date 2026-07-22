/**
 * Screen 3 — Tasks. The full task view so nothing goes out of sight:
 *   • a category filter bar (All + each life area present)
 *   • SCHEDULED — dated tasks grouped by time (Overdue · Today · Tomorrow · This week · Later)
 *   • BACKLOG — undated tasks grouped by life area (each has "Do today")
 *   • PROJECTS — goals with progress + next action
 * Category shows as a colored chip on each scheduled row; time is the primary axis.
 */

import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { ProfileButton } from '../components/ProfileButton';
import { WindowPicker } from '../components/WindowPicker';
import { amiri, colors, ff, fs, radius, space } from '../theme/tokens';
import { row, textStart, writingDirection } from '../theme/rtl';
import { useI18n } from '../i18n/I18nContext';
import { useStore } from '../state/store';
import type { TimeBucket } from '../state/store';
import { AREA_LABEL, AREA_COLOR, WEEKDAYS, WINDOW_WORD, t as fmt, digits, type Lang } from '../i18n/strings';
import { weekdayIndex } from '../utils/dates';
import { prayerName, PrayerKey } from '../data/prayers';
import type { Area, Item, Window } from '../types/item';

const PRAYER_WINDOWS = new Set<Window>(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']);

export function TasksScreen({ onOpenProfile, onOpenProject, onOpenTask }: { onOpenProfile: () => void; onOpenProject: (id: string) => void; onOpenTask: (id: string) => void }) {
  const { strings, isRTL, lang } = useI18n();
  const { projects, backlogByArea, datedTasksByHorizon, progressOf, currentStepOf, scheduleToday } = useStore();
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [filter, setFilter] = useState<Area | 'all'>('all');

  // Areas present anywhere (dated + backlog) → the filter chips.
  const areas = useMemo(() => {
    const set = new Set<Area>();
    datedTasksByHorizon.forEach((g) => g.items.forEach((it) => it.area && set.add(it.area)));
    backlogByArea.forEach((g) => set.add(g.area));
    const ORDER: Area[] = ['chore', 'admin', 'personal', 'self-dev', 'spiritual', 'errand'];
    return ORDER.filter((a) => set.has(a));
  }, [datedTasksByHorizon, backlogByArea]);

  const bucketLabel = (b: TimeBucket): string =>
    ({ overdue: strings.overdue, today: strings.today, tomorrow: strings.tomorrow, week: strings.thisWeek, later: strings.later }[b]);

  const whenLabel = (it: Item): string => {
    const wd = it.day ? WEEKDAYS[lang][weekdayIndex(it.day)] : '';
    const w = PRAYER_WINDOWS.has(it.window)
      ? prayerName(it.window as PrayerKey, lang)
      : WINDOW_WORD[lang][it.window as 'morning' | 'afternoon' | 'evening' | 'anytime'] ?? '';
    const time = it.time ? ` · ${digits(it.time, lang)}` : '';
    return `${wd} · ${w}${time}`;
  };

  const keep = (it: Item) => filter === 'all' || it.area === filter;
  const dated = datedTasksByHorizon
    .map((g) => ({ bucket: g.bucket, items: g.items.filter(keep) }))
    .filter((g) => g.items.length > 0);
  const backlog = backlogByArea.filter((g) => filter === 'all' || g.area === filter);
  const schedCount = dated.reduce((n, g) => n + g.items.length, 0);
  const backCount = backlog.reduce((n, g) => n + g.items.length, 0);

  const empty = projects.length === 0 && backlogByArea.length === 0 && datedTasksByHorizon.length === 0;

  const pick = (w: Window) => {
    if (pickerFor) scheduleToday(pickerFor, w);
    setPickerFor(null);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerBlock}>
        <View style={[styles.headerRow, { flexDirection: row(isRTL) }]}>
          <View style={[styles.titleRow, { flexDirection: row(isRTL) }]}>
            <Text style={styles.title}>{strings.tasksTitle}</Text>
            <Text style={styles.titleScript}>مهام</Text>
          </View>
          <ProfileButton onPress={onOpenProfile} />
        </View>
        <Text style={[styles.intro, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]}>{strings.tasksIntro}</Text>
      </View>

      {empty && <Text style={[styles.empty, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]}>{strings.emptyTasks}</Text>}

      {/* Category filter bar */}
      {areas.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filterBar, { flexDirection: row(isRTL) }]}>
          <FilterChip label={strings.allAreas} active={filter === 'all'} onPress={() => setFilter('all')} />
          {areas.map((a) => (
            <FilterChip key={a} label={AREA_LABEL[lang][a]} color={AREA_COLOR[a]} active={filter === a} onPress={() => setFilter(filter === a ? 'all' : a)} />
          ))}
        </ScrollView>
      )}

      {/* SCHEDULED — the act-now zone, by time horizon */}
      {dated.length > 0 && (
        <View style={styles.zone}>
          <ZoneHeader tone="loud" title={strings.schedZoneTitle} subtitle={strings.schedZoneSub} count={schedCount} isRTL={isRTL} lang={lang} />
          {dated.map((g) => (
            <View key={g.bucket} style={styles.section}>
              <Text style={[styles.bucketLabel, { textAlign: textStart(isRTL) }]}>{bucketLabel(g.bucket)}</Text>
              <View style={styles.group}>
                {g.items.map((it) => (
                  <Pressable key={it.id} style={[styles.datedRow]} onPress={() => onOpenTask(it.id)} accessibilityRole="button" accessibilityLabel={it.title}>
                    <Text style={[styles.taskTitle, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]} numberOfLines={2}>{it.title}</Text>
                    <View style={[styles.metaRow, { flexDirection: row(isRTL) }]}>
                      {it.area ? (
                        <View style={[styles.chip, { flexDirection: row(isRTL) }]}>
                          <View style={[styles.chipDot, { backgroundColor: AREA_COLOR[it.area] }]} />
                          <Text style={styles.chipText}>{AREA_LABEL[lang][it.area]}</Text>
                        </View>
                      ) : null}
                      <Text style={[styles.whenText, { textAlign: textStart(isRTL) }]}>{whenLabel(it)}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* PROJECTS — goals in motion; hidden when a life-area filter is active (cross-area) */}
      {filter === 'all' && projects.length > 0 && (
        <View style={styles.zone}>
          <ZoneHeader tone="medium" title={strings.projZoneTitle} subtitle={strings.projZoneSub} count={projects.length} isRTL={isRTL} lang={lang} />
          <View style={styles.group}>
            {projects.map((p) => {
              const prog = progressOf(p.id);
              const next = currentStepOf(p.id);
              const meta =
                fmt(strings.stepsOfLabel, { done: digits(prog.done, lang), total: digits(prog.total, lang) }) +
                (prog.milestoneTitle ? ` · ${fmt(strings.onMilestone, { name: prog.milestoneTitle })}` : '');
              return (
                <Pressable key={p.id} style={styles.projectCard} onPress={() => onOpenProject(p.id)} accessibilityRole="button">
                  <Text style={[styles.projectTitle, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]}>{p.title}</Text>
                  <Text style={[styles.projectMeta, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]}>{meta}</Text>
                  {next ? (
                    <View style={[styles.nextRow, { flexDirection: row(isRTL) }]}>
                      <Text style={styles.startHereTag}>{strings.startHere}</Text>
                      <Text style={[styles.nextText, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]} numberOfLines={1}>{next.title}</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* BACKLOG — parked, undated, by area. Deliberately last + quiet. */}
      {backlog.length > 0 && (
        <View style={styles.zone}>
          <ZoneHeader tone="quiet" title={strings.backZoneTitle} subtitle={strings.backZoneSub} count={backCount} isRTL={isRTL} lang={lang} />
          {backlog.map((group) => (
            <View key={group.area} style={styles.section}>
              <Text style={[styles.bucketLabel, { textAlign: textStart(isRTL) }]}>{AREA_LABEL[lang][group.area]}</Text>
              <View style={styles.group}>
                {group.items.map((it) => (
                  <View key={it.id} style={[styles.taskRow, { flexDirection: row(isRTL) }]}>
                    <Pressable style={styles.taskTitleBtn} onPress={() => onOpenTask(it.id)} accessibilityRole="button" accessibilityLabel={it.title}>
                      <Text style={[styles.taskTitle, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]} numberOfLines={2}>{it.title}</Text>
                    </Pressable>
                    <Pressable style={styles.doToday} onPress={() => setPickerFor(it.id)} accessibilityRole="button">
                      <Text style={styles.doTodayText}>{strings.doToday}</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      <WindowPicker visible={pickerFor !== null} onSelect={pick} onClose={() => setPickerFor(null)} />
    </ScrollView>
  );
}

function FilterChip({ label, active, color, onPress }: { label: string; active: boolean; color?: string; onPress: () => void }) {
  return (
    <Pressable style={[styles.filterChip, active && styles.filterChipOn]} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }}>
      {color ? <View style={[styles.chipDot, { backgroundColor: color }]} /> : null}
      <Text style={[styles.filterChipText, active && styles.filterChipTextOn]}>{label}</Text>
    </Pressable>
  );
}

type ZoneTone = 'loud' | 'medium' | 'quiet';

/** A zone's identity: accent dot + title + count chip + one-line purpose. Weight varies by tone. */
function ZoneHeader({ tone, title, subtitle, count, isRTL, lang }: { tone: ZoneTone; title: string; subtitle: string; count: number; isRTL: boolean; lang: Lang }) {
  const quiet = tone === 'quiet';
  return (
    <View style={styles.zoneHeader}>
      <View style={[styles.zoneTitleRow, { flexDirection: row(isRTL) }]}>
        <View style={[styles.zoneDot, tone === 'loud' && styles.zoneDotLoud, tone === 'medium' && styles.zoneDotMedium, quiet && styles.zoneDotQuiet]} />
        <Text style={[quiet ? styles.zoneTitleQuiet : styles.zoneTitle, { textAlign: textStart(isRTL) }]}>{title}</Text>
        <View style={[styles.countChip, quiet && styles.countChipQuiet]}>
          <Text style={[styles.countChipText, quiet && styles.countChipTextQuiet]}>{digits(count, lang)}</Text>
        </View>
      </View>
      <Text style={[styles.zoneSub, { textAlign: textStart(isRTL) }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: space.screen, paddingTop: 8, paddingBottom: 40, gap: 18 },
  headerBlock: { gap: 3, paddingHorizontal: 2 },
  headerRow: { alignItems: 'center', justifyContent: 'space-between' },
  titleRow: { alignItems: 'baseline', gap: 9 },
  title: { fontSize: fs(22), fontFamily: ff('700'), color: colors.ink, letterSpacing: -0.3 },
  titleScript: { fontFamily: amiri(), fontSize: fs(19), color: colors.green },
  intro: { fontSize: fs(12.5), fontFamily: ff('500'), color: colors.muted, lineHeight: 19, maxWidth: 320 },
  empty: { fontSize: fs(13.5), fontFamily: ff('500'), color: colors.muted, lineHeight: 20, paddingHorizontal: 2 },

  filterBar: { gap: 8, paddingHorizontal: 2, paddingVertical: 1 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.card },
  filterChipOn: { backgroundColor: colors.tint, borderColor: colors.green },
  filterChipText: { fontSize: fs(12), fontFamily: ff('600'), color: colors.muted },
  filterChipTextOn: { color: colors.green, fontFamily: ff('700') },

  zone: { gap: 12 },

  zoneHeader: { gap: 2, paddingHorizontal: 2 },
  zoneTitleRow: { alignItems: 'center', gap: 8 },
  zoneDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.muted2 },
  zoneDotLoud: { backgroundColor: colors.green },
  zoneDotMedium: { backgroundColor: colors.green, opacity: 0.55 },
  zoneDotQuiet: { backgroundColor: 'transparent', borderWidth: 1.4, borderColor: colors.muted2 },
  zoneTitle: { fontSize: fs(16), fontFamily: ff('800'), color: colors.ink, letterSpacing: -0.2 },
  zoneTitleQuiet: { fontSize: fs(13.5), fontFamily: ff('700'), color: colors.muted },
  countChip: { minWidth: 20, alignItems: 'center', backgroundColor: colors.tint, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 1 },
  countChipQuiet: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  countChipText: { fontSize: fs(11), fontFamily: ff('700'), color: colors.green },
  countChipTextQuiet: { color: colors.muted2 },
  zoneSub: { fontSize: fs(11.5), fontFamily: ff('500'), color: colors.faint },
  section: { gap: 8 },
  bucketLabel: { fontSize: fs(12.5), fontFamily: ff('700'), color: colors.ink, paddingHorizontal: 2 },
  group: { gap: 9 },

  datedRow: { gap: 7, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, paddingHorizontal: 14, paddingVertical: 12 },
  metaRow: { alignItems: 'center', gap: 9 },
  chip: { alignItems: 'center', gap: 6, backgroundColor: colors.cream, borderRadius: radius.chip, paddingHorizontal: 8, paddingVertical: 3 },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontSize: fs(10.5), fontFamily: ff('700'), color: colors.muted, letterSpacing: 0.2 },
  whenText: { flex: 1, fontSize: fs(11.5), fontFamily: ff('600'), color: colors.muted2 },

  taskRow: { alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, paddingHorizontal: 14, paddingVertical: 13 },
  taskTitleBtn: { flex: 1 },
  taskTitle: { fontSize: fs(14.5), fontFamily: ff('500'), color: colors.ink },
  doToday: { borderWidth: 1, borderColor: colors.green, borderRadius: radius.inner, paddingHorizontal: 12, paddingVertical: 7 },
  doTodayText: { fontSize: fs(12), fontFamily: ff('700'), color: colors.green },

  projectCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.cardLg, paddingHorizontal: 15, paddingVertical: 14, gap: 6 },
  projectTitle: { fontSize: fs(16), fontFamily: ff('700'), color: colors.ink, letterSpacing: -0.2 },
  projectMeta: { fontSize: fs(12), fontFamily: ff('500'), color: colors.muted },
  nextRow: { alignItems: 'center', gap: 8, marginTop: 2 },
  startHereTag: { fontSize: fs(10), fontFamily: ff('700'), color: colors.white, backgroundColor: colors.green, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
  nextText: { flex: 1, fontSize: fs(13.5), fontFamily: ff('600'), color: colors.ink },
});
