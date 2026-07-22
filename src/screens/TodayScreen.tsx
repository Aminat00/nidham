/**
 * Screen 2 — Today (ṣalāh + tesbihat). A prayer-anchored flow: prayers are fixed
 * timeline anchors joined by a single vertical spine; each prayer's window holds its
 * tesbihat, its ākhira readings (bulleted rows) and its dunya tasks (a card). The
 * current prayer is a NOW strip + open node. Tap a checkbox to mark done; long-press
 * a dunya task to push it to tomorrow. Layout matches Nidham.dc.html.
 */

import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Item } from '../types/item';
import { ProfileButton } from '../components/ProfileButton';
import { Badge, CheckBox, Dot, EnergyDot, TimelineNode } from '../components/primitives';
import { amiri, colors, ff, fs, space } from '../theme/tokens';
import { row, startSide, textStart, writingDirection } from '../theme/rtl';
import { useI18n } from '../i18n/I18nContext';
import { useStore } from '../state/store';
import { digits, t as fmt, WEEKDAYS } from '../i18n/strings';
import type { Lang } from '../i18n/strings';
import { USER_NAME, PRAYER_TIMES } from '../data/demo';
import { usePrayerTimes } from '../data/PrayerTimesContext';
import type { LivePrayerData } from '../data/prayerTimes';
import { useAuth } from '../state/auth';
import type { PrayerTimes } from '../agent/contract';

/** Minutes since midnight for an "HH:mm" string. */
function toMin(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * The prayer whose window is active RIGHT NOW, from the real device clock: the
 * latest daily prayer whose time has passed. Before Fajr (night) it wraps to ʿIshāʾ,
 * whose window runs until Fajr.
 */
function currentPrayerKey(times: PrayerTimes): PrayerKey {
  const order: PrayerKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let current: PrayerKey = 'isha'; // night wrap
  for (const k of order) if (toMin(times[k as keyof PrayerTimes]) <= nowMin) current = k;
  return current;
}

/** How long Fajr stays "NOW" — after this it isn't the active prayer, only the window. */
const FAJR_ACTIVE_MIN = 40;

/**
 * What the NOW strip / timeline should highlight. Fajr is special: its window runs until
 * Dhuhr, but you can only pray it briefly, so after FAJR_ACTIVE_MIN it stops being "now"
 * and we point ahead to the next prayer (Dhuhr) instead. Every other prayer stays "now"
 * for its whole window.
 */
type ActiveState = { mode: 'now' | 'next'; key: PrayerKey };
function activePrayerState(times: PrayerTimes): ActiveState {
  const current = currentPrayerKey(times);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  if (current === 'fajr' && nowMin - toMin(times.fajr) > FAJR_ACTIVE_MIN) {
    return { mode: 'next', key: 'dhuhr' };
  }
  return { mode: 'now', key: current };
}
import { prayerKeyFromId, prayerName, prayerScript, tesbihatCardLabel, tesbihatScript } from '../utils/labels';
import { PrayerKey } from '../data/prayers';
import { dayDiff } from '../utils/dates';

/* ------------------------------------------------------------------ pieces --- */

function NowStrip({ prayer, time, mode }: { prayer: Item; time: string; mode: 'now' | 'next' }) {
  const { strings, lang, isRTL } = useI18n();
  const key = prayerKeyFromId(prayer.id);
  if (!key) return null;
  const script = prayerScript(key, lang);
  const isNow = mode === 'now';
  return (
    <View style={[styles.nowStrip, { flexDirection: row(isRTL) }]}>
      <View style={styles.timeBadge}>
        <Text style={styles.timeBadgeText}>{time}</Text>
      </View>
      <View style={styles.nowMid}>
        <View style={[styles.nameRow, { flexDirection: row(isRTL) }]}>
          <Text style={styles.nowPrayer}>{prayerName(key, lang)}</Text>
          {script && <Text style={styles.scriptSm}>{script}</Text>}
        </View>
        {isNow && (
          <Text style={[styles.nowSub, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]}>
            {fmt(strings.nowStripSub, { prayer: prayerName(key, lang) })}
          </Text>
        )}
      </View>
      <View style={styles.nowBadgeWrap}>
        <Badge label={isNow ? strings.now : strings.upNext} tone="nowStrip" />
      </View>
    </View>
  );
}

/* ------------------------------------------------------- timeline rows ------ */

function PrayerRow({ item, time, isCurrent, isNext }: { item: Item; time: string; isCurrent: boolean; isNext: boolean }) {
  const { strings, lang, isRTL } = useI18n();
  const key = prayerKeyFromId(item.id)!;
  const script = prayerScript(key, lang);
  const done = item.status === 'done';
  const now = !done && isCurrent;
  const next = !done && isNext;
  const status = done ? 'done' : now ? 'now' : 'upcoming';
  const nameColor = now ? colors.green : done ? colors.ink : colors.slate;
  return (
    <View style={[styles.prayerRow, { flexDirection: row(isRTL) }]}>
      <TimelineNode status={status} />
      <View style={[styles.prayerContent, { flexDirection: row(isRTL) }]}>
        <View style={[styles.nameRow, { flexDirection: row(isRTL) }]}>
          <Text style={[styles.prayerName, { color: nameColor }]}>{prayerName(key, lang)}</Text>
          {script && <Text style={styles.script}>{script}</Text>}
          {now && <Badge label={strings.now} tone="now" />}
          {next && <Badge label={strings.upNext} tone="deadline" />}
        </View>
        <Text style={styles.prayerTime}>{time}</Text>
      </View>
    </View>
  );
}

/** A secondary prayer (witr) rendered inside a prayer's block — indented, with a checkbox. */
function SubPrayerRow({ item, time }: { item: Item; time: string }) {
  const { lang, isRTL } = useI18n();
  const { toggleDone } = useStore();
  const key = prayerKeyFromId(item.id);
  const done = item.status === 'done';
  if (!key) return null;
  const script = prayerScript(key, lang);
  return (
    <View style={[styles.subPrayerRow, { flexDirection: row(isRTL) }]}>
      <View style={styles.gutter}>
        <CheckBox checked={done} onPress={() => toggleDone(item.id)} size={17} />
      </View>
      <View style={[styles.subPrayerContent, { flexDirection: row(isRTL) }]}>
        <View style={[styles.nameRow, { flexDirection: row(isRTL) }]}>
          <Text style={[styles.subPrayerName, done && styles.mutedStrike]}>{prayerName(key, lang)}</Text>
          {script && <Text style={styles.script}>{script}</Text>}
        </View>
        <Text style={styles.prayerTime}>{time}</Text>
      </View>
    </View>
  );
}

/** Live prayer time for a key, or null when running on the pinned demo values. */
function liveTimeFor(key: PrayerKey, live: LivePrayerData | null): string | null {
  if (!live) return null;
  switch (key) {
    case 'tahajjud':
      return live.tahajjud;
    case 'fajr':
      return live.times.fajr;
    case 'dhuhr':
      return live.times.dhuhr;
    case 'asr':
      return live.times.asr;
    case 'maghrib':
      return live.times.maghrib;
    case 'isha':
      return live.times.isha;
    case 'witr':
      return live.witr;
  }
}

/**
 * Real, dynamic date line — the actual current day in the Hijri (Umm al-Qurā) calendar,
 * from the device clock. Uses Intl so it's correct without any network call. Falls back to
 * the pinned string only if the Islamic calendar isn't available in the runtime.
 */
function dateLineText(lang: Lang, fallback: string): string {
  try {
    const loc = lang === 'ar' ? 'ar-SA' : lang === 'tr' ? 'tr-TR' : 'en-US';
    const fmtParts = new Intl.DateTimeFormat(`${loc}-u-ca-islamic-umalqura`, {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).formatToParts(new Date());
    const p: Record<string, string> = {};
    for (const part of fmtParts) p[part.type] = part.value;
    if (!p.year) return fallback;
    return `${p.weekday} · ${digits(p.day, lang)} ${p.month} ${digits(p.year, lang)}`;
  } catch {
    return fallback;
  }
}

function TesbihatCard({ item }: { item: Item }) {
  const { lang, isRTL } = useI18n();
  const { toggleDone } = useStore();
  const key = prayerKeyFromId(item.id) as PrayerKey;
  const script = tesbihatScript(lang);
  const done = item.status === 'done';
  return (
    <View style={[styles.tesCard, indentStart(isRTL), { flexDirection: row(isRTL) }]}>
      <CheckBox checked={done} onPress={() => toggleDone(item.id)} size={19} />
      <Text style={[styles.tesLabel, done && styles.mutedStrike, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]}>
        {tesbihatCardLabel(key, lang)}
      </Text>
      {script && <Text style={styles.scriptLg}>{script}</Text>}
    </View>
  );
}

/** Ākhira reading row — checkbox gutter + bullet + title/meta + time. */
function AkhiraRow({ item }: { item: Item }) {
  const { lang, isRTL } = useI18n();
  const { toggleDone } = useStore();
  const done = item.status === 'done';
  return (
    <View style={[styles.akhiraRow, { flexDirection: row(isRTL) }]}>
      <View style={styles.gutter}>
        <CheckBox checked={done} onPress={() => toggleDone(item.id)} size={17} />
      </View>
      <View style={styles.akhiraContent}>
        <View style={[styles.akhiraTop, { flexDirection: row(isRTL) }]}>
          <Dot color={colors.green} />
          <Text style={[styles.akhiraTitle, done && styles.mutedStrike, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.akhiraTime}>{digits(item.sortTime, lang)}</Text>
        </View>
        {item.note && <Text style={[styles.akhiraMeta, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]}>{item.note}</Text>}
      </View>
    </View>
  );
}

function deadlineLabel(item: Item, lang: Lang, today: string): string | null {
  if (!item.dueDate) return null;
  const diff = dayDiff(today, item.dueDate);
  if (diff >= 10) return { en: '~2 wks', tr: '~2 hf', ar: '~أسبوعان' }[lang];
  return { en: 'due Fri', tr: 'Cuma', ar: 'الجمعة' }[lang];
}

/** Dunya task card — grouped rows with checkbox, energy dot, urgent/deadline. */
function DunyaCard({ items, onPush, onOpenTask, nextStepTitles }: { items: Item[]; onPush: (id: string) => void; onOpenTask: (id: string) => void; nextStepTitles: Record<string, string> }) {
  const { strings, lang, isRTL, today } = useDunya();
  const { toggleDone } = useStore();
  return (
    <View style={[styles.dunyaCard, indentStart(isRTL)]}>
      {items.map((item, i) => {
        const done = item.status === 'done';
        const urgent = item.urgency === 'now' && !done;
        const deadline = deadlineLabel(item, lang, today);
        return (
          <Pressable
            key={item.id}
            onPress={() => onOpenTask(item.id)}
            onLongPress={() => onPush(item.id)}
            delayLongPress={320}
            style={[styles.dunyaRow, { flexDirection: row(isRTL) }, i > 0 && styles.dunyaDivider]}
            accessibilityHint={strings.pushToTomorrow}
          >
            <CheckBox checked={done} onPress={() => toggleDone(item.id)} size={18} />
            <EnergyDot deep={item.energy === 'deep'} />
            <View style={styles.dunyaMain}>
              <View style={[styles.dunyaTitleRow, { flexDirection: row(isRTL) }]}>
                <Text style={[styles.dunyaTitle, done && styles.mutedStrike, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]} numberOfLines={1}>
                  {item.title}
                </Text>
                {urgent && <Badge label={strings.urgent} tone="urgent" />}
              </View>
              <View style={[styles.dunyaMetaRow, { flexDirection: row(isRTL) }]}>
                {nextStepTitles[item.id] ? (
                  <Text style={styles.nextTag} numberOfLines={1}>{strings.upNext} · {nextStepTitles[item.id]}</Text>
                ) : item.note ? (
                  <Text style={styles.dunyaMeta}>{item.note}</Text>
                ) : null}
                {deadline && !done && <Badge label={deadline} tone="deadline" />}
              </View>
            </View>
            <Text style={styles.dunyaTime}>{digits(item.sortTime, lang)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Small hook to pass today into DunyaCard without prop drilling.
function useDunya() {
  const i18n = useI18n();
  const { today } = useStore();
  return { ...i18n, today };
}

/* ------------------------------------------------------------------ screen --- */

const PLANNED = new Set<Item['category']>(['wird', 'task', 'errand', 'project', 'step']);
/** Worldly work (excludes spiritual wird) — what the load numbers + cap are about. */
const DUNYA = new Set<Item['category']>(['task', 'errand', 'project', 'step']);
/** Gentle daily ceiling on deep-focus tasks. Past it → a factual over-capacity mark. */
const DEEP_CAP = 3;

/** Minutes parsed from a free-text estimate ("~2h", "90 min", "1.5h", "30 dk"); 0 if none. */
function estimateMin(text?: string | null): number {
  if (!text) return 0;
  const h = text.match(/(\d+(?:\.\d+)?)\s*h/i);
  if (h) return Math.round(parseFloat(h[1]) * 60);
  const m = text.match(/(\d+)\s*(?:min|dk|دقيقة|دقائق)/i);
  if (m) return parseInt(m[1], 10);
  return 0;
}

/** Compact duration: "45m" under an hour, else "~2.5h" (half-hour rounded). */
function fmtDur(min: number, lang: Lang): string {
  if (min < 60) return `${digits(min, lang)}m`;
  const h = Math.round((min / 60) * 2) / 2;
  return `${digits(h, lang)}h`;
}

export function TodayScreen({ onOpenProfile, onOpenTask }: { onOpenProfile: () => void; onOpenTask: (id: string) => void }) {
  const { strings, lang, isRTL } = useI18n();
  const store = useStore();
  const { live } = usePrayerTimes();
  const { user } = useAuth();
  const { today, itemsForDay } = store;

  const dayItems = itemsForDay(today);
  // Witr is grouped inside the ʿIshāʾ block (below), not a separate timeline anchor.
  const prayers = useMemo(() => dayItems.filter((i) => i.category === 'prayer' && i.id !== 'p_witr'), [dayItems]);
  const witr = useMemo(() => dayItems.find((i) => i.id === 'p_witr'), [dayItems]);

  // Which prayer's window is active now — from the real clock + live/seed times.
  const active = activePrayerState(live?.times ?? PRAYER_TIMES);
  const nowPrayer = prayers.find((p) => prayerKeyFromId(p.id) === active.key);

  // Greeting uses the signed-in name (first name), else the demo name.
  const displayName = (user?.user_metadata?.display_name as string | undefined) ?? user?.email?.split('@')[0];
  const greeting = fmt(strings.greeting, { name: (displayName ?? USER_NAME).split(/\s+/)[0] });

  // Prayer display time: live value when available, else the seeded (demo) time.
  const timeOf = (item: Item): string => {
    const key = prayerKeyFromId(item.id);
    const t = key ? liveTimeFor(key, live) : null;
    return digits(t ?? item.sortTime, lang);
  };
  const dateLine = dateLineText(lang, strings.dateLine);

  const plannedTasks = dayItems.filter((i) => PLANNED.has(i.category));
  const doneCount = plannedTasks.filter((t) => t.status === 'done').length;

  // Real, computed day load — worldly tasks only, no sentiment.
  const dunyaToday = plannedTasks.filter((t) => DUNYA.has(t.category));
  const openDunya = dunyaToday.filter((t) => t.status !== 'done');
  const deepPending = openDunya.filter((t) => t.energy === 'deep').length;
  const totalMin = openDunya.reduce((n, t) => n + estimateMin(t.note), 0);
  const overCap = deepPending > DEEP_CAP;

  const dayLoad: string[] = [`${digits(doneCount, lang)} / ${digits(plannedTasks.length, lang)}${strings.done}`];
  if (deepPending > 0) dayLoad.push(`${digits(deepPending, lang)} ${strings.deepLabel}`);
  if (totalMin > 0) dayLoad.push(`~${fmtDur(totalMin, lang)}`);

  // The one thing that matters from projects: each project's current "start here" step,
  // when it's actually scheduled today. Maps that step's id → its project title.
  const nextStepTitles: Record<string, string> = {};
  for (const p of store.projects) {
    const cur = store.currentStepOf(p.id);
    if (cur && cur.day === today) nextStepTitles[cur.id] = p.title;
  }

  const childrenFor = (p: Item) => (p.id === `p_${p.window}` ? dayItems.filter((i) => i.category !== 'prayer' && i.window === p.window) : []);

  const handlePush = (id: string) => store.pushToTomorrow(id);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.headerRow, { flexDirection: row(isRTL) }]}>
          <View style={styles.headerLeft}>
            <Text style={[styles.dateLine, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]}>{dateLine}</Text>
            <Text style={[styles.greeting, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]}>{greeting}</Text>
          </View>
          <ProfileButton onPress={onOpenProfile} />
        </View>

        {nowPrayer && <NowStrip prayer={nowPrayer} time={timeOf(nowPrayer)} mode={active.mode} />}

        {/* Flow header — the real, computed day load (or "Only prayers today"). */}
        <View style={[styles.flowHeader, { flexDirection: row(isRTL) }]}>
          <Text style={styles.flowTitle}>{strings.flowTitle}</Text>
          {dunyaToday.length === 0 ? (
            <Text style={styles.flowCount}>{strings.onlyPrayers}</Text>
          ) : (
            <View style={[styles.loadRow, { flexDirection: row(isRTL) }]}>
              <Text style={styles.flowCount}>{dayLoad.join(' · ')}</Text>
              {overCap && <Text style={styles.overCap}>· {strings.overCapacity}</Text>}
            </View>
          )}
        </View>

        {/* Timeline */}
        <View style={styles.timeline}>
          <View style={[styles.spine, { [startSide(isRTL)]: 14 }]} pointerEvents="none" />
          {prayers.map((p) => {
            const children = childrenFor(p);
            const tesbihat = children.find((c) => c.category === 'tesbihat');
            const akhira = children.filter((c) => c.category === 'wird');
            const dunya = children.filter((c) => c.category === 'task' || c.category === 'errand' || c.category === 'project' || c.category === 'step');
            return (
              <View key={p.id}>
                <PrayerRow item={p} time={timeOf(p)} isCurrent={active.mode === 'now' && prayerKeyFromId(p.id) === active.key} isNext={active.mode === 'next' && prayerKeyFromId(p.id) === active.key} />
                {prayerKeyFromId(p.id) === 'isha' && witr && <SubPrayerRow item={witr} time={timeOf(witr)} />}
                {tesbihat && <TesbihatCard item={tesbihat} />}
                {akhira.map((a) => (
                  <AkhiraRow key={a.id} item={a} />
                ))}
                {dunya.length > 0 && <DunyaCard items={dunya} onPush={handlePush} onOpenTask={onOpenTask} nextStepTitles={nextStepTitles} />}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {store.canUndoPush && (
        <View style={[styles.toast, { flexDirection: row(isRTL) }]}>
          <Text style={styles.toastText}>{strings.pushedToast}</Text>
          <Text style={styles.toastAction} onPress={store.undoLastPush}>{strings.undo}</Text>
        </View>
      )}
    </View>
  );
}

/** Start-side indent (41px) for tesbihat / dunya cards, RTL-aware. */
function indentStart(isRTL: boolean) {
  return isRTL ? { marginRight: 41 } : { marginLeft: 41 };
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: space.screen, paddingTop: 8, paddingBottom: 40 },

  headerRow: { justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 2 },
  headerLeft: { gap: 3 },
  headerRight: { alignItems: 'center', gap: 10 },
  dateLine: { fontSize: fs(12), fontFamily: ff('500'), color: colors.muted, letterSpacing: 0.4 },
  greeting: { fontSize: fs(21), fontFamily: ff('700'), color: colors.ink, letterSpacing: -0.2 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontFamily: amiri(), fontSize: fs(18) },

  nowStrip: { alignItems: 'center', gap: 12, marginTop: 16, paddingVertical: 11, paddingHorizontal: 13, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border2, borderRadius: 16 },
  timeBadge: { width: 46, height: 46, borderRadius: 13, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  timeBadgeText: { fontSize: fs(14), fontFamily: ff('700'), color: colors.green },
  nowMid: { flex: 1, gap: 1, justifyContent: 'center' },
  nowBadgeWrap: { alignSelf: 'center', justifyContent: 'center' },
  nameRow: { alignItems: 'baseline', gap: 7 },
  nowPrayer: { fontSize: fs(14.5), fontFamily: ff('700'), color: colors.ink },
  nowSub: { fontSize: fs(12), fontFamily: ff('500'), color: colors.muted },
  scriptSm: { fontFamily: amiri(), fontSize: fs(14), color: colors.muted },

  flowHeader: { justifyContent: 'space-between', alignItems: 'baseline', marginTop: 22, marginBottom: 10, paddingHorizontal: 2 },
  flowTitle: { fontSize: fs(15), fontFamily: ff('700'), color: colors.ink },
  flowCount: { fontSize: fs(12), fontFamily: ff('500'), color: colors.muted },
  loadRow: { alignItems: 'baseline', gap: 5 },
  overCap: { fontSize: fs(12), fontFamily: ff('700'), color: colors.rust },

  timeline: { position: 'relative' },
  spine: { position: 'absolute', top: 16, bottom: 14, width: 2, backgroundColor: colors.timeline, borderRadius: 2 },

  prayerRow: { alignItems: 'center', gap: 11, marginVertical: 3 },
  prayerContent: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  prayerName: { fontSize: fs(14.5), fontFamily: ff('700') },
  prayerTime: { fontSize: fs(12), fontFamily: ff('600'), color: colors.muted },
  script: { fontFamily: amiri(), fontSize: fs(14), color: colors.faint },
  scriptLg: { fontFamily: amiri(), fontSize: fs(15), color: colors.faint },

  tesCard: { alignItems: 'center', gap: 11, marginBottom: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.tesBorder, borderRadius: 15, paddingVertical: 12, paddingHorizontal: 14 },
  tesLabel: { flex: 1, fontSize: fs(13), fontFamily: ff('600'), color: colors.ink },

  subPrayerRow: { alignItems: 'center', gap: 11 },
  subPrayerContent: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  subPrayerName: { fontSize: fs(13.5), fontFamily: ff('700'), color: colors.slate },

  akhiraRow: { alignItems: 'flex-start', gap: 11 },
  gutter: { width: 30, alignItems: 'center', paddingTop: 9 },
  akhiraContent: { flex: 1, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  akhiraTop: { alignItems: 'center', gap: 8 },
  akhiraTitle: { flex: 1, fontSize: fs(13), fontFamily: ff('600'), color: colors.ink },
  akhiraTime: { fontSize: fs(10.5), fontFamily: ff('600'), color: colors.muted2 },
  akhiraMeta: { fontSize: fs(11), fontFamily: ff('500'), color: colors.faint, marginStart: 13, marginTop: 1 },

  dunyaCard: { marginTop: 8, marginBottom: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 2 },
  dunyaRow: { alignItems: 'center', gap: 11, paddingVertical: 10 },
  dunyaDivider: { borderTopWidth: 1, borderTopColor: colors.hairline2 },
  dunyaMain: { flex: 1, gap: 2 },
  dunyaTitleRow: { alignItems: 'center', gap: 6 },
  dunyaTitle: { flexShrink: 1, fontSize: fs(13), fontFamily: ff('600'), color: colors.ink },
  dunyaMetaRow: { alignItems: 'center', gap: 7 },
  dunyaMeta: { fontSize: fs(11), fontFamily: ff('500'), color: colors.muted2 },
  nextTag: { fontSize: fs(11), fontFamily: ff('700'), color: colors.green },
  dunyaTime: { fontSize: fs(11), fontFamily: ff('700'), color: colors.muted },

  mutedStrike: { color: colors.faint, textDecorationLine: 'line-through' },

  toast: { position: 'absolute', left: space.screen, right: space.screen, bottom: 90, backgroundColor: colors.green, borderRadius: 13, paddingHorizontal: 16, paddingVertical: 13, alignItems: 'center', justifyContent: 'space-between' },
  toastText: { color: colors.white, fontSize: fs(13), fontFamily: ff('600') },
  toastAction: { color: colors.white, fontSize: fs(13), fontFamily: ff('700'), textDecorationLine: 'underline' },
});
