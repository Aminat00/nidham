/**
 * The header avatar → opens the Profile screen. Shows a person icon when signed out
 * and the user's initial when signed in. Replaces the language toggle in the main
 * screen headers (language now lives in Profile).
 */

import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, ff, fs } from '../theme/tokens';
import { useAuth } from '../state/auth';
import { PersonIcon } from './Icons';

export function ProfileButton({ onPress }: { onPress: () => void }) {
  const { session, user } = useAuth();
  const name = (user?.user_metadata?.display_name as string | undefined) ?? user?.email ?? '';
  const initial = session && name ? name.trim()[0]?.toUpperCase() : null;
  return (
    <Pressable style={styles.avatar} onPress={onPress} hitSlop={6} accessibilityRole="button" accessibilityLabel="Profile">
      {initial ? <Text style={styles.initial}>{initial}</Text> : <PersonIcon size={20} color={colors.white} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  initial: { color: colors.white, fontFamily: ff('700'), fontSize: fs(17) },
});
