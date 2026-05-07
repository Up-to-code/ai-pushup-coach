import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useAuth } from '../../src/auth';
import { privacyUrl, termsUrl } from '../../src/config/links';
import { useResponsive } from '../../src/hooks/useResponsive';
import { colors, spacing, typography } from '../../src/theme';

WebBrowser.maybeCompleteAuthSession();

type SocialProvider = 'apple' | 'google';

function isAuthCancel(error: unknown) {
  return (
    error instanceof Error &&
    'code' in error &&
    (error.code === 'ERR_REQUEST_CANCELED' || error.code === 'ERR_REQUEST_CANCELLED')
  );
}

export default function SignInScreen() {
  const auth = useAuth();
  const { normalize } = useResponsive();
  const [signingInProvider, setSigningInProvider] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isSigningIn = signingInProvider !== null || auth.authActionStatus !== 'idle';

  const openLegalLink = useCallback(async (url: string) => {
    await Linking.openURL(url);
  }, []);

  useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);

  const signInWithSocial = useCallback(async (provider: SocialProvider) => {
    setSigningInProvider(provider);
    setError(null);

    try {
      const { error } =
        provider === 'apple'
          ? await auth.signInWithApple()
          : await auth.signInWithGoogle();

      if (error) {
        console.warn('Auth social sign-in error', error);
        throw new Error(error.message || error.code || 'Social sign-in failed.');
      }
    } catch (err) {
      if (!isAuthCancel(err)) {
        console.warn('OAuth failed', err);
        setError('Could not finish sign in. Please try again.');
      }
    } finally {
      setSigningInProvider(null);
    }
  }, [auth]);

  return (
    <ImageBackground source={require('../../assets/bg.png')} style={styles.root}>
      <View style={styles.overlay} />

      <SafeAreaView style={styles.safe}>
        <View style={styles.page}>
          <View style={[styles.hero, { paddingHorizontal: normalize(40) }]}>
            <Animated.View entering={FadeInDown.duration(600)} style={styles.titleBlock}>
              <Text style={[styles.headlineSmall, { fontSize: normalize(48), lineHeight: normalize(52) }]}>
                Ready to{'\n'}start?
              </Text>
              <Text style={[styles.subtitle, { fontSize: normalize(18), lineHeight: normalize(26) }]}>
                Your plan is ready. Sign in to keep it saved and continue from any device.
              </Text>
            </Animated.View>
          </View>

          <View style={styles.bottomContainer}>
            <View style={[styles.bottomContent, { paddingHorizontal: normalize(40) }]}>
              <Animated.View entering={FadeInUp.duration(600)} style={styles.bottom}>
                <View style={styles.buttons}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.btn,
                      styles.btnApple,
                      { minHeight: normalize(58), borderRadius: normalize(12) },
                      pressed && styles.btnPressed,
                      isSigningIn && styles.btnOff,
                    ]}
                    disabled={isSigningIn}
                    onPress={() => signInWithSocial('apple')}
                  >
                    <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                    {signingInProvider === 'apple' ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Ionicons name="logo-apple" size={normalize(19)} color="#FFF" />
                    )}
                    <Text style={[styles.btnLabel, { fontSize: normalize(16) }]}>Continue with Apple</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.btn,
                      styles.btnGoogle,
                      { minHeight: normalize(58), borderRadius: normalize(12) },
                      pressed && styles.btnPressed,
                      isSigningIn && styles.btnOff,
                    ]}
                    disabled={isSigningIn}
                    onPress={() => signInWithSocial('google')}
                  >
                    {signingInProvider === 'google' ? (
                      <ActivityIndicator color="#111" size="small" />
                    ) : (
                      <Ionicons name="logo-google" size={normalize(19)} color="#111" />
                    )}
                    <Text style={[styles.btnLabel, styles.btnLabelDark, { fontSize: normalize(16) }]}>Continue with Google</Text>
                  </Pressable>

                </View>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <View style={styles.legal}>
                  <Text style={[styles.legalTxt, { fontSize: normalize(12) }]}>By continuing, you agree to the </Text>
                  <Pressable onPress={() => openLegalLink(termsUrl)}>
                    <Text style={[styles.legalLink, { fontSize: normalize(12) }]}>Terms</Text>
                  </Pressable>
                  <Text style={[styles.legalTxt, { fontSize: normalize(12) }]}> and </Text>
                  <Pressable onPress={() => openLegalLink(privacyUrl)}>
                    <Text style={[styles.legalLink, { fontSize: normalize(12) }]}>Privacy</Text>
                  </Pressable>
                </View>
              </Animated.View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  safe: { flex: 1 },
  page: { flex: 1, justifyContent: 'space-between' },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'flex-start' },
  titleBlock: { alignItems: 'flex-start', gap: spacing.md, maxWidth: 400 },
  headlineSmall: { ...typography.title, fontWeight: '900', color: '#FFF', letterSpacing: -1 },
  subtitle: { ...typography.body, color: 'rgba(255,255,255,0.7)', marginTop: spacing.xs },
  bottomContainer: { width: '100%', backgroundColor: 'transparent' },
  bottomContent: { paddingBottom: spacing.xxl },
  bottom: { gap: spacing.lg },
  buttons: { gap: spacing.md },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, overflow: 'hidden' },
  btnApple: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  btnGoogle: { backgroundColor: '#FFF', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)' },
  btnPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  btnOff: { opacity: 0.5 },
  btnLabel: { ...typography.bodyBold, color: '#FFF', letterSpacing: 0.2 },
  btnLabelDark: { color: '#111' },
  error: { ...typography.caption, color: colors.error, textAlign: 'center', lineHeight: 17 },
  legal: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginTop: spacing.md },
  legalTxt: { color: 'rgba(255,255,255,0.3)', lineHeight: 18 },
  legalLink: { color: 'rgba(255,255,255,0.5)', textDecorationLine: 'underline', lineHeight: 18 },
});
