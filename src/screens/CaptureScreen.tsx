/**
 * Screen 1 — Capture (talk to Nidham). You just speak or type. Triage routes each
 * capture: a small thing is filed straight into the Tasks backlog (or Today if you said
 * "today"); a big goal opens an inline, adaptive interview (capped at 3 answers) that
 * ends in a project — milestones → steps — added to Projects. The interview thread is
 * ephemeral; only the resulting task/project is saved.
 */

import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { DumpBox } from '../components/DumpBox';
import { ThinkingCard } from '../components/ThinkingCard';
import { FadeInView } from '../components/FadeInView';
import { ProfileButton } from '../components/ProfileButton';
import { CheckIcon } from '../components/Icons';
import { amiri, colors, ff, fs, radius, space } from '../theme/tokens';
import { row, textStart, writingDirection } from '../theme/rtl';
import { useI18n } from '../i18n/I18nContext';
import { useStore } from '../state/store';
import { usePrayerTimes } from '../data/PrayerTimesContext';
import { triageCapture } from '../agent/triage';
import { runProjectAgent } from '../agent/runProjectAgent';
import { fallbackProjectTurn } from '../agent/projectFallback';
import type { ConversationTurn } from '../agent/projectContract';
import { DEMO_NOW_ISO, PRAYER_TIMES } from '../data/demo';

type Entry =
  | { kind: 'user'; text: string }
  | { kind: 'agent'; text: string }
  | { kind: 'task'; title: string; scheduled: boolean }
  | { kind: 'plan'; projectId: string; title: string; firstStep?: string };

/** Max answers before we force a plan (matches the agent's own cap). */
const MAX_ANSWERS = 3;

export function CaptureScreen({ onOpenProfile, onOpenProject }: { onOpenProfile: () => void; onOpenProject: (id: string) => void }) {
  const { strings, isRTL, lang } = useI18n();
  const { addTask, createProject } = useStore();
  const { live } = usePrayerTimes();
  const times = live?.times ?? PRAYER_TIMES;

  const [thread, setThread] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const modeRef = useRef<'idle' | 'interview'>('idle');
  const convoRef = useRef<ConversationTurn[]>([]);

  const runTurn = async (convo: ConversationTurn[]) => {
    setBusy(true);
    const payload = { conversation: convo, context: { now: DEMO_NOW_ISO, lang, prayerTimes: times, existingItems: [] } };
    let turn = await runProjectAgent(payload);
    const answers = convo.filter((c) => c.role === 'user').length - 1;
    if (turn.type === 'ask' && answers >= MAX_ANSWERS) turn = fallbackProjectTurn(payload);
    const result = turn; // const snapshot so narrowing survives into the state closures

    if (result.type === 'ask') {
      const q = result.question;
      convoRef.current = [...convo, { role: 'agent', text: q }];
      setThread((t) => [...t, { kind: 'agent', text: q }]);
    } else {
      const id = createProject(result.project);
      const steps = result.project.milestones[0]?.steps ?? [];
      const first = steps.find((s) => s.startHere) ?? steps[0];
      const summary = result.summary;
      const title = result.project.title;
      setThread((t) => [
        ...t,
        { kind: 'agent', text: summary },
        { kind: 'plan', projectId: id, title, firstStep: first?.title },
      ]);
      modeRef.current = 'idle';
      convoRef.current = [];
    }
    setBusy(false);
  };

  const onSubmit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    // Mid-interview → this is an answer.
    if (modeRef.current === 'interview') {
      const next = [...convoRef.current, { role: 'user', text: trimmed } as ConversationTurn];
      convoRef.current = next;
      setThread((t) => [...t, { kind: 'user', text: trimmed }]);
      void runTurn(next);
      return;
    }

    const tri = triageCapture(trimmed);
    if (tri.kind === 'task') {
      addTask(trimmed, tri);
      setThread((t) => [...t, { kind: 'user', text: trimmed }, { kind: 'task', title: trimmed, scheduled: tri.scheduleToday }]);
      return;
    }

    // Project → open the interview.
    modeRef.current = 'interview';
    const convo0: ConversationTurn[] = [{ role: 'user', text: trimmed }];
    convoRef.current = convo0;
    setThread((t) => [...t, { kind: 'user', text: trimmed }]);
    void runTurn(convo0);
  };

  const interviewing = modeRef.current === 'interview';
  const scrollRef = useRef<ScrollView>(null);

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header — fixed */}
      <View style={styles.headerBlock}>
        <View style={[styles.headerRow, { flexDirection: row(isRTL) }]}>
          <View style={[styles.titleRow, { flexDirection: row(isRTL) }]}>
            <Text style={styles.title}>{strings.capTitle}</Text>
            <Text style={styles.titleScript}>قيد</Text>
          </View>
          <ProfileButton onPress={onOpenProfile} />
        </View>
      </View>

      {/* Conversation — scrolls, sticks to the newest message */}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.thread}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        <Text style={[styles.intro, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]}>{strings.capIntro}</Text>

        {thread.map((e, i) => (
          <FadeInView key={i} delay={0}>
            {e.kind === 'user' ? (
              <View style={[styles.bubbleRow, { flexDirection: row(isRTL), justifyContent: 'flex-end' }]}>
                <View style={[styles.bubble, styles.userBubble]}>
                  <Text style={[styles.bubbleText, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]}>{e.text}</Text>
                </View>
              </View>
            ) : e.kind === 'agent' ? (
              <View style={[styles.bubbleRow, { flexDirection: row(isRTL), justifyContent: 'flex-start' }]}>
                <View style={[styles.bubble, styles.agentBubble]}>
                  <Text style={[styles.bubbleText, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]}>{e.text}</Text>
                </View>
              </View>
            ) : e.kind === 'task' ? (
              <View style={[styles.landed, { flexDirection: row(isRTL) }]}>
                <View style={styles.check}><CheckIcon size={12} color={colors.white} /></View>
                <View style={styles.landedBody}>
                  <Text style={[styles.landedTitle, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]}>{e.title}</Text>
                  <Text style={[styles.landedMeta, { textAlign: textStart(isRTL) }]}>{e.scheduled ? strings.sentToToday : strings.savedToTasks}</Text>
                </View>
              </View>
            ) : (
              <Pressable style={styles.planCard} onPress={() => onOpenProject(e.projectId)} accessibilityRole="button">
                <Text style={[styles.planKicker, { textAlign: textStart(isRTL) }]}>{strings.projectsSection.toUpperCase()}</Text>
                <Text style={[styles.planTitle, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]}>{e.title}</Text>
                {e.firstStep ? (
                  <View style={[styles.startHereRow, { flexDirection: row(isRTL) }]}>
                    <Text style={styles.startHereTag}>{strings.startHere}</Text>
                    <Text style={[styles.startHereText, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]} numberOfLines={1}>{e.firstStep}</Text>
                  </View>
                ) : null}
                <Text style={[styles.openLink, { textAlign: textStart(isRTL) }]}>{strings.openLabel} →</Text>
              </Pressable>
            )}
          </FadeInView>
        ))}
        {busy && <ThinkingCard />}
      </ScrollView>

      {/* Input — pinned to the bottom, chat-style (answers land right under the question) */}
      <View style={styles.inputBar}>
        <DumpBox
          onSubmit={onSubmit}
          busy={busy}
          placeholder={interviewing ? strings.answerPlaceholder : strings.capPlaceholder}
          hint={strings.talkHint}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  headerBlock: { paddingHorizontal: space.screen, paddingTop: 8, paddingBottom: 6 },
  headerRow: { alignItems: 'center', justifyContent: 'space-between' },
  titleRow: { alignItems: 'baseline', gap: 9 },
  title: { fontSize: fs(22), fontFamily: ff('700'), color: colors.ink, letterSpacing: -0.3 },
  titleScript: { fontFamily: amiri(), fontSize: fs(19), color: colors.green },
  scroll: { flex: 1 },
  intro: { fontSize: fs(12.5), fontFamily: ff('500'), color: colors.muted, lineHeight: 19, maxWidth: 320, marginBottom: 4 },
  thread: { paddingHorizontal: space.screen, paddingTop: 4, paddingBottom: 14, gap: 10 },
  inputBar: { paddingHorizontal: space.screen, paddingTop: 8, paddingBottom: 10, borderTopWidth: 1, borderTopColor: colors.hairline2, backgroundColor: colors.cream },
  bubbleRow: { width: '100%' },
  bubble: { maxWidth: '86%', paddingHorizontal: 14, paddingVertical: 11, borderRadius: radius.card },
  userBubble: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderBottomRightRadius: 6 },
  agentBubble: { backgroundColor: colors.tint, borderBottomLeftRadius: 6 },
  bubbleText: { fontSize: fs(14.5), fontFamily: ff('500'), color: colors.ink, lineHeight: 21 },
  landed: { alignItems: 'center', gap: 11, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, paddingHorizontal: 14, paddingVertical: 12 },
  check: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  landedBody: { flex: 1, gap: 2 },
  landedTitle: { fontSize: fs(14), fontFamily: ff('600'), color: colors.ink },
  landedMeta: { fontSize: fs(11.5), fontFamily: ff('500'), color: colors.muted },
  planCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.green, borderRadius: radius.cardLg, paddingHorizontal: 16, paddingVertical: 14, gap: 7 },
  planKicker: { fontSize: fs(10), fontFamily: ff('700'), color: colors.green, letterSpacing: 0.6 },
  planTitle: { fontSize: fs(16.5), fontFamily: ff('700'), color: colors.ink, letterSpacing: -0.2 },
  startHereRow: { alignItems: 'center', gap: 8 },
  startHereTag: { fontSize: fs(10), fontFamily: ff('700'), color: colors.white, backgroundColor: colors.green, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
  startHereText: { flex: 1, fontSize: fs(13.5), fontFamily: ff('600'), color: colors.ink },
  openLink: { fontSize: fs(12.5), fontFamily: ff('700'), color: colors.green, marginTop: 2 },
});
