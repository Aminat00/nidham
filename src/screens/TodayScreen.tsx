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
import { prayerKeyFromId, prayerName, prayerScript, tesbihatCardLabel, tesbihatScript } from '../utils/labels';
import { PrayerKey } from '../data/prayers';
import { dayDiff } from '../utils/dates';

/* ------------------------------------------------------------------ pieces --- */

function NowStrip({ prayer, time }: { prayer: Item; time: string }) {
  const { strings, lang, isRTL } = useI18n();
  const key = prayerKeyFromId(prayer.id);
  if (!key) return null;
  const script = prayerScript(key, lang);
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
        <Text style={[styles.nowSub, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]}>
          {fmt(strings.nowStripSub, { prayer: prayerName(key, lang) })}
        </Text>
      </View>
      <Badge label={strings.now} tone="nowStrip" />
    </View>
  );
}

/* ------------------------------------------------------- timeline rows ------ */

function PrayerRow({ item, time, isCurrent }: { item: Item; time: string; isCurrent: boolean }) {
  const { strings, lang, isRTL } = useI18n();
  const key = prayerKeyFromId(item.id)!;
  const script = prayerScript(key, lang);
  const done = item.status === 'done';
  const now = !done && isCurrent;
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

/** Localized date line from live Hijri data, or the pinned fallback. */
function dateLineText(live: LivePrayerData | null, lang: Lang, fallback: string): string {
  if (!live || !live.hijri.year) return fallback;
  const weekday = WEEKDAYS[lang][live.weekdayIndex];
  const month = lang === 'ar' ? live.hijri.monthAr : live.hijri.monthEn;
  return `${weekday} · ${digits(live.hijri.day, lang)} ${month} ${digits(live.hijri.year, lang)}`;
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
function DunyaCard({ items, onPush }: { items: Item[]; onPush: (id: string) => void }) {
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
                {item.note && <Text style={styles.dunyaMeta}>{item.note}</Text>}
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

export function TodayScreen({ onOpenProfile }: { onOpenProfile: () => void }) {
  const { strings, lang, isRTL } = useI18n();
  const store = useStore();
  const { live } = usePrayerTimes();
  const { user } = useAuth();
  const { today, itemsForDay } = store;

  const dayItems = itemsForDay(today);
  const prayers = useMemo(() => dayItems.filter((i) => i.category === 'prayer'), [dayItems]);

  // Which prayer's window is active now — from the real clock + live/seed times.
  const currentKey = currentPrayerKey(live?.times ?? PRAYER_TIMES);
  const nowPrayer = prayers.find((p) => prayerKeyFromId(p.id) === currentKey);

  // Greeting uses the signed-in name (first name), else the demo name.
  const displayName = (user?.user_metadata?.display_name as string | undefined) ?? user?.email?.split('@')[0];
  const greeting = fmt(strings.greeting, { name: (displayName ?? USER_NAME).split(/\s+/)[0] });

  // Prayer display time: live value when available, else the seeded (demo) time.
  const timeOf = (item: Item): string => {
    const key = prayerKeyFromId(item.id);
    const t = key ? liveTimeFor(key, live) : null;
    return digits(t ?? item.sortTime, lang);
  };
  const dateLine = dateLineText(live, lang, strings.dateLine);

  const plannedTasks = dayItems.filter((i) => PLANNED.has(i.category));
  const doneCount = plannedTasks.filter((t) => t.status === 'done').length;

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

        {nowPrayer && <NowStrip prayer={nowPrayer} time={timeOf(nowPrayer)} />}

        {/* Flow header */}
        <View style={[styles.flowHeader, { flexDirection: row(isRTL) }]}>
          <Text style={styles.flowTitle}>{strings.flowTitle}</Text>
          <Text style={styles.flowCount}>
            {digits(doneCount, lang)} / {digits(plannedTasks.length, lang)}
            {strings.done}
          </Text>
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
                <PrayerRow item={p} time={timeOf(p)} isCurrent={prayerKeyFromId(p.id) === currentKey} />
                {tesbihat && <TesbihatCard item={tesbihat} />}
                {akhira.map((a) => (
                  <AkhiraRow key={a.id} item={a} />
                ))}
                {dunya.length > 0 && <DunyaCard items={dunya} onPush={handlePush} />}
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
  nowMid: { flex: 1, gap: 1 },
  nameRow: { alignItems: 'baseline', gap: 7 },
  nowPrayer: { fontSize: fs(14.5), fontFamily: ff('700'), color: colors.ink },
  nowSub: { fontSize: fs(12), fontFamily: ff('500'), color: colors.muted },
  scriptSm: { fontFamily: amiri(), fontSize: fs(14), color: colors.muted },

  flowHeader: { justifyContent: 'space-between', alignItems: 'baseline', marginTop: 22, marginBottom: 10, paddingHorizontal: 2 },
  flowTitle: { fontSize: fs(15), fontFamily: ff('700'), color: colors.ink },
  flowCount: { fontSize: fs(12), fontFamily: ff('500'), color: colors.muted },

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
  dunyaTime: { fontSize: fs(11), fontFamily: ff('700'), color: colors.muted },

  mutedStrike: { color: colors.faint, textDecorationLine: 'line-through' },

  toast: { position: 'absolute', left: space.screen, right: space.screen, bottom: 90, backgroundColor: colors.green, borderRadius: 13, paddingHorizontal: 16, paddingVertical: 13, alignItems: 'center', justifyContent: 'space-between' },
  toastText: { color: colors.white, fontSize: fs(13), fontFamily: ff('600') },
  toastAction: { color: colors.white, fontSize: fs(13), fontFamily: ff('700'), textDecorationLine: 'underline' },
});
