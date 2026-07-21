/**
 * Profile screen — opened from the Today tab (tap the avatar). Holds account +
 * cloud sync: sign in / sign up when signed out, the account + sign-out when signed
 * in, and a "local only" note when Supabase isn't configured. The app itself is
 * never gated on auth — signing in simply turns on cloud sync.
 */

import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { amiri, colors, ff, radius, space } from '../theme/tokens';
import { row, textStart, writingDirection } from '../theme/rtl';
import { useI18n } from '../i18n/I18nContext';
import { useAuth } from '../state/auth';
import { useSettings } from '../state/settings';
import { useStore } from '../state/store';
import { LanguageToggle } from '../components/LanguageToggle';
import { Dropdown } from '../components/Dropdown';
import { CALC_METHODS } from '../data/prayerTimes';
import type { Lang } from '../i18n/strings';

const T: Record<Lang, Record<string, string>> = {
  en: {
    profile: 'Profile', close: 'Close',
    welcome: 'Sync your day', sub: 'Sign in to keep your day in sync across devices.',
    email: 'Email', password: 'Password', name: 'Name',
    signIn: 'Sign in', signUp: 'Create account',
    toSignUp: 'New here? Create an account', toSignIn: 'Already have an account? Sign in',
    checkEmail: 'Check your email to confirm your account.',
    signedIn: 'Signed in', syncing: 'Your day syncs to the cloud.', signOut: 'Sign out',
    localOnly: 'Cloud sync isn’t set up — Nidham is running locally on this device.',
    prayerTimes: 'Prayer times', method: 'Calculation method',
    reset: 'Reset all data', resetConfirm: 'Tap again to start fresh',
  },
  tr: {
    profile: 'Profil', close: 'Kapat',
    welcome: 'Gününü eşitle', sub: 'Gününü cihazlar arasında eşitlemek için giriş yap.',
    email: 'E-posta', password: 'Şifre', name: 'İsim',
    signIn: 'Giriş yap', signUp: 'Hesap oluştur',
    toSignUp: 'Yeni misin? Hesap oluştur', toSignIn: 'Zaten hesabın var mı? Giriş yap',
    checkEmail: 'Hesabını onaylamak için e-postanı kontrol et.',
    signedIn: 'Giriş yapıldı', syncing: 'Günün buluta eşitleniyor.', signOut: 'Çıkış yap',
    localOnly: 'Bulut eşitleme kurulu değil — Nidham bu cihazda yerel çalışıyor.',
    prayerTimes: 'Namaz vakitleri', method: 'Hesaplama yöntemi',
    reset: 'Tüm verileri sıfırla', resetConfirm: 'Sıfırdan başlamak için tekrar dokun',
  },
  ar: {
    profile: 'الملف', close: 'إغلاق',
    welcome: 'زامِن يومك', sub: 'سجّل الدخول لمزامنة يومك عبر أجهزتك.',
    email: 'البريد الإلكتروني', password: 'كلمة المرور', name: 'الاسم',
    signIn: 'تسجيل الدخول', signUp: 'إنشاء حساب',
    toSignUp: 'جديد هنا؟ أنشئ حسابًا', toSignIn: 'لديك حساب؟ سجّل الدخول',
    checkEmail: 'تحقّق من بريدك لتأكيد حسابك.',
    signedIn: 'تم تسجيل الدخول', syncing: 'يومك يُزامَن مع السحابة.', signOut: 'تسجيل الخروج',
    localOnly: 'المزامنة السحابية غير مُهيّأة — يعمل نِظام محليًا على هذا الجهاز.',
    prayerTimes: 'أوقات الصلاة', method: 'طريقة الحساب',
    reset: 'إعادة تعيين كل البيانات', resetConfirm: 'اضغط مرة أخرى للبدء من جديد',
  },
};

export function ProfileScreen({ onClose }: { onClose: () => void }) {
  const { lang, isRTL } = useI18n();
  const { configured, session, user, signIn, signUp, signOut } = useAuth();
  const { method, setMethod } = useSettings();
  const { resetData } = useStore();
  const t = T[lang];

  const [confirmReset, setConfirmReset] = useState(false);
  const doReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    resetData();
    setConfirmReset(false);
    onClose();
  };

  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async () => {
    if (busy || !email.trim() || !password) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = mode === 'in' ? await signIn(email, password) : await signUp(email, password, name.trim() || undefined);
    setBusy(false);
    if (res.error) setError(res.error);
    else if (mode === 'up' && !session) setNotice(t.checkEmail);
  };

  const input = (value: string, onChange: (v: string) => void, placeholder: string, opts?: { secure?: boolean; email?: boolean }) => (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.faint}
      secureTextEntry={opts?.secure}
      autoCapitalize={opts?.email ? 'none' : 'sentences'}
      keyboardType={opts?.email ? 'email-address' : 'default'}
      style={[styles.input, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]}
    />
  );

  return (
    <SafeAreaView style={styles.screen}>
      <View style={[styles.top, { flexDirection: row(isRTL) }]}>
        <Pressable onPress={onClose} hitSlop={10} style={styles.close} accessibilityRole="button" accessibilityLabel={t.close}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <LanguageToggle />
      </View>

      <View style={styles.body}>
        <View style={[styles.brand, { flexDirection: row(isRTL) }]}>
          <Text style={styles.brandName}>Nidham</Text>
          <Text style={styles.brandScript}>نِظام</Text>
        </View>

        {!configured ? (
          <Text style={[styles.sub, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]}>{t.localOnly}</Text>
        ) : session ? (
          /* Signed in */
          <View style={styles.account}>
            <View style={styles.avatarBig}>
              <Text style={styles.avatarBigText}>
                {(((user?.user_metadata?.display_name as string | undefined) ?? user?.email ?? '?').trim()[0] ?? '?').toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.title, { textAlign: 'center' }]}>{user?.user_metadata?.display_name ?? user?.email}</Text>
            <View style={[styles.statusRow, { flexDirection: row(isRTL) }]}>
              <View style={styles.dot} />
              <Text style={styles.statusText}>{t.signedIn}</Text>
            </View>
            <Text style={[styles.sub, { textAlign: 'center' }]}>{t.syncing}</Text>
            <Pressable onPress={signOut} style={styles.outlineButton}>
              <Text style={styles.outlineButtonText}>{t.signOut}</Text>
            </Pressable>
          </View>
        ) : (
          /* Signed out — auth form */
          <View>
            <Text style={[styles.title, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]}>{t.welcome}</Text>
            <Text style={[styles.sub, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]}>{t.sub}</Text>
            <View style={styles.form}>
              {mode === 'up' && input(name, setName, t.name)}
              {input(email, setEmail, t.email, { email: true })}
              {input(password, setPassword, t.password, { secure: true })}
              {error && <Text style={styles.error}>{error}</Text>}
              {notice && <Text style={styles.notice}>{notice}</Text>}
              <Pressable onPress={submit} disabled={busy} style={[styles.button, busy && styles.buttonBusy]}>
                {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>{mode === 'in' ? t.signIn : t.signUp}</Text>}
              </Pressable>
              <Pressable onPress={() => { setMode(mode === 'in' ? 'up' : 'in'); setError(null); setNotice(null); }} hitSlop={8}>
                <Text style={styles.toggle}>{mode === 'in' ? t.toSignUp : t.toSignIn}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Prayer times — calculation method */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { textAlign: textStart(isRTL) }]}>{t.prayerTimes.toUpperCase()}</Text>
          <Text style={[styles.sectionSub, { textAlign: textStart(isRTL), writingDirection: writingDirection(isRTL) }]}>{t.method}</Text>
          <View style={styles.methodWrap}>
            <Dropdown value={method} options={CALC_METHODS} onSelect={setMethod} />
          </View>
        </View>

        {/* Reset — clean slate (two-tap confirm) */}
        <Pressable onPress={doReset} style={styles.resetButton} accessibilityRole="button">
          <Text style={[styles.resetText, confirmReset && styles.resetTextConfirm]}>
            {confirmReset ? t.resetConfirm : t.reset}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream, paddingHorizontal: space.screen },
  top: { alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
  close: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 15, fontFamily: ff('600'), color: colors.muted },
  body: { paddingTop: 28, gap: 6, paddingBottom: 40 },
  brand: { alignItems: 'baseline', gap: 9, marginBottom: 18 },
  brandName: { fontSize: 24, fontFamily: ff('800'), color: colors.ink, letterSpacing: -0.5 },
  brandScript: { fontFamily: amiri(), fontSize: 21, color: colors.green },
  title: { fontSize: 24, fontFamily: ff('700'), color: colors.ink, letterSpacing: -0.3 },
  sub: { fontSize: 13.5, fontFamily: ff('500'), color: colors.muted, lineHeight: 20 },
  form: { gap: 12, marginTop: 20 },
  input: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.inner,
    paddingHorizontal: 15, paddingVertical: 14, fontSize: 15, fontFamily: ff('500'), color: colors.ink,
  },
  error: { fontSize: 12.5, fontFamily: ff('600'), color: colors.rust },
  notice: { fontSize: 12.5, fontFamily: ff('600'), color: colors.green },
  button: { backgroundColor: colors.green, borderRadius: radius.inner, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  buttonBusy: { opacity: 0.7 },
  buttonText: { color: colors.white, fontSize: 15, fontFamily: ff('700') },
  toggle: { textAlign: 'center', fontSize: 13, fontFamily: ff('600'), color: colors.muted, marginTop: 6 },
  account: { alignItems: 'center', gap: 12, marginTop: 20 },
  avatarBig: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  avatarBigText: { color: colors.white, fontFamily: ff('700'), fontSize: 30 },
  statusRow: { alignItems: 'center', gap: 7 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green },
  statusText: { fontSize: 13, fontFamily: ff('700'), color: colors.green },
  outlineButton: { marginTop: 8, borderWidth: 1, borderColor: colors.border, borderRadius: radius.inner, paddingVertical: 13, paddingHorizontal: 40, alignItems: 'center' },
  outlineButtonText: { fontSize: 14, fontFamily: ff('700'), color: colors.rust },
  section: { marginTop: 34, gap: 4, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 22 },
  sectionLabel: { fontSize: 11, fontFamily: ff('700'), color: colors.muted2, letterSpacing: 0.7 },
  sectionSub: { fontSize: 13.5, fontFamily: ff('600'), color: colors.ink },
  methodWrap: { marginTop: 8 },
  resetButton: { marginTop: 26, alignItems: 'center', paddingVertical: 10 },
  resetText: { fontSize: 13, fontFamily: ff('600'), color: colors.muted2 },
  resetTextConfirm: { color: colors.rust, fontFamily: ff('700') },
});
