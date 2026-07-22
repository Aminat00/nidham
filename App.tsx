/**
 * Nidham — app shell. Providers (safe-area → i18n → store) wrap a two-screen
 * switch (Today · Capture) plus the bottom tab bar. In-memory only; no navigation
 * library needed for v1's two tabs.
 */

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { useFonts } from 'expo-font';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { I18nProvider } from './src/i18n/I18nContext';
import { StoreProvider } from './src/state/store';
import { CaptureScreen } from './src/screens/CaptureScreen';
import { TodayScreen } from './src/screens/TodayScreen';
import { TasksScreen } from './src/screens/TasksScreen';
import { ProjectDetailScreen } from './src/screens/ProjectDetailScreen';
import { TaskDetailScreen } from './src/screens/TaskDetailScreen';
import { TabBar, ScreenName } from './src/components/TabBar';
import { colors, FONT_MAP } from './src/theme/tokens';
import { loadLang, saveLang } from './src/state/persistence';
import { PrayerTimesProvider } from './src/data/PrayerTimesContext';
import { AuthProvider, useAuth } from './src/state/auth';
import { SettingsProvider } from './src/state/settings';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { TODAY } from './src/data/demo';
import type { Lang } from './src/i18n/strings';

function AppInner() {
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<ScreenName>('today');
  const [profileOpen, setProfileOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState<string | null>(null);
  const [taskOpen, setTaskOpen] = useState<string | null>(null);

  const openProfile = () => setProfileOpen(true);
  const openProject = (id: string) => setProjectOpen(id);
  const openTask = (id: string) => setTaskOpen(id);

  return (
    <View style={styles.root}>
      <View style={[styles.body, { paddingTop: insets.top }]}>
        {screen === 'today' ? (
          <TodayScreen onOpenProfile={openProfile} onOpenTask={openTask} />
        ) : screen === 'tasks' ? (
          <TasksScreen onOpenProfile={openProfile} onOpenProject={openProject} onOpenTask={openTask} />
        ) : (
          <CaptureScreen onOpenProfile={openProfile} onOpenProject={openProject} onOpenTask={openTask} />
        )}
      </View>
      <TabBar screen={screen} onNavigate={setScreen} />
      {profileOpen && (
        <View style={StyleSheet.absoluteFill}>
          <ProfileScreen onClose={() => setProfileOpen(false)} />
        </View>
      )}
      {projectOpen && (
        <View style={StyleSheet.absoluteFill}>
          <ProjectDetailScreen projectId={projectOpen} onClose={() => setProjectOpen(null)} onOpenTask={openTask} />
        </View>
      )}
      {taskOpen && (
        <View style={StyleSheet.absoluteFill}>
          <TaskDetailScreen taskId={taskOpen} onClose={() => setTaskOpen(null)} />
        </View>
      )}
      <StatusBar style="dark" />
    </View>
  );
}

/**
 * Auth gate. When Supabase is configured, a signed-out user only ever sees the
 * sign-in / sign-up screen — the rest of the app is hidden until they authenticate.
 * When it isn't configured (local dev), the app runs as a single-user local demo.
 */
function Shell() {
  const { configured, loading, user } = useAuth();
  if (configured && loading) return <View style={styles.root} />; // calm splash while the session restores
  if (configured && !user) return <ProfileScreen gate />;
  return <AppInner />;
}

function Gate() {
  return (
    <PrayerTimesProvider date={TODAY}>
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </PrayerTimesProvider>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts(FONT_MAP);
  const [initialLang, setInitialLang] = useState<Lang | null>(null);

  // Restore the saved language before the i18n provider mounts.
  useEffect(() => {
    loadLang().then((l) => setInitialLang(l ?? 'en'));
  }, []);

  // Calm cream splash while fonts + saved language load — no flash of the wrong one.
  if (!fontsLoaded || initialLang === null) return <View style={styles.root} />;

  return (
    <SafeAreaProvider>
      <I18nProvider initial={initialLang} onLangChange={saveLang}>
        <AuthProvider>
          <SettingsProvider>
            <Gate />
          </SettingsProvider>
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  body: { flex: 1 },
});
