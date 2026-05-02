import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSSO } from '@clerk/clerk-expo';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { BrandLogo } from '../../src/components';
import { borderRadius, colors, spacing, typography } from '../../src/theme';
import { useSettingsStore } from '../../src/store';

WebBrowser.maybeCompleteAuthSession();

type Provider = 'oauth_google' | 'oauth_apple';

export default function SignInScreen() {
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const setAllowGuestMode = useSettingsStore((state) => state.setAllowGuestMode);
  const [activeProvider, setActiveProvider] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);

  const signInWith = useCallback(
    async (strategy: Provider) => {
      setActiveProvider(strategy);
      setError(null);

      try {
        const { createdSessionId, setActive } = await startSSOFlow({
          strategy,
          redirectUrl: Linking.createURL('/', { scheme: 'aipushupcoach' }),
        });

        if (createdSessionId) {
          await setActive?.({ session: createdSessionId });
        }
      } catch (err) {
        console.warn('Clerk OAuth failed', err);
        setError('Could not finish sign in. Check that this provider is enabled in Clerk.');
      } finally {
        setActiveProvider(null);
      }
    },
    [startSSOFlow]
  );

  const continueAsGuest = useCallback(() => {
    setAllowGuestMode(true);
    router.replace('/');
  }, [router, setAllowGuestMode]);

  return (
    <View style={styles.root}>
      {/* Black Canvas */}
      
      <SafeAreaView style={styles.safe}>
        <View style={styles.page}>
          {/* ── Hero ── */}
          <View style={styles.hero}>
            <View style={styles.titleBlock}>
              <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={styles.headline}>
                Smarter training.{'\n'}Clean progress.
              </Animated.Text>
              <Animated.Text entering={FadeInDown.delay(300).duration(500)} style={styles.sub}>
                Your path to 100 reps starts here.
              </Animated.Text>
            </View>
          </View>

          {/* ── Bottom Section ── */}
          <View style={styles.bottomContainer}>
            <View style={styles.bottomContent}>
              <Animated.View entering={FadeInUp.delay(500).duration(600)} style={styles.bottom}>
                <View style={styles.buttons}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.btn,
                      styles.btnApple,
                      pressed && styles.btnPressed,
                      activeProvider !== null && styles.btnOff,
                    ]}
                    disabled={activeProvider !== null}
                    onPress={() => signInWith('oauth_apple')}
                  >
                    {activeProvider === 'oauth_apple' ? (
                      <ActivityIndicator color="#000" size="small" />
                    ) : (
                      <Ionicons name="logo-apple" size={19} color="#000" />
                    )}
                    <Text style={styles.btnLabel}>Continue with Apple</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.btn,
                      styles.btnGoogle,
                      pressed && styles.btnPressed,
                      activeProvider !== null && styles.btnOff,
                    ]}
                    disabled={activeProvider !== null}
                    onPress={() => signInWith('oauth_google')}
                  >
                    {activeProvider === 'oauth_google' ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Ionicons name="logo-google" size={17} color="#FFF" />
                    )}
                    <Text style={[styles.btnLabel, styles.btnLabelSec]}>Continue with Google</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.btn,
                      styles.btnGuest,
                      pressed && styles.btnPressed,
                      activeProvider !== null && styles.btnOff,
                    ]}
                    disabled={activeProvider !== null}
                    onPress={continueAsGuest}
                  >
                    <Ionicons name="phone-portrait-outline" size={17} color="#FFF" />
                    <Text style={[styles.btnLabel, styles.btnLabelSec]}>Continue without sign in</Text>
                  </Pressable>
                </View>

                {error ? (
                  <Text style={styles.error}>{error}</Text>
                ) : null}

                <View style={styles.legal}>
                  <Text style={styles.legalTxt}>By continuing, you agree to our </Text>
                  <Pressable onPress={() => router.push('/legal/terms' as any)}>
                    <Text style={styles.legalLink}>Terms</Text>
                  </Pressable>
                  <Text style={styles.legalTxt}> and </Text>
                  <Pressable onPress={() => router.push('/legal/privacy' as any)}>
                    <Text style={styles.legalLink}>Privacy</Text>
                  </Pressable>
                </View>
              </Animated.View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

/* ─────────────────────────────────────────────── */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  safe: {
    flex: 1,
  },
  page: {
    flex: 1,
    justifyContent: 'space-between',
  },

  /* ── Hero ── */
  hero: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  titleBlock: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  headline: {
    ...typography.title,
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  sub: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },

  /* ── Bottom Section ── */
  bottomContainer: {
    width: '100%',
  },
  bottomContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  bottom: {
    gap: spacing.lg,
  },
  buttons: {
    gap: spacing.md,
  },

  /* Buttons */
  btn: {
    height: 56,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  btnApple: {
    backgroundColor: '#FFF',
  },
  btnGoogle: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  btnGuest: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  btnPressed: {
    opacity: 0.8,
  },
  btnOff: {
    opacity: 0.5,
  },
  btnLabel: {
    ...typography.bodyBold,
    fontSize: 16,
    color: '#000',
    letterSpacing: -0.2,
  },
  btnLabelSec: {
    color: '#FFF',
  },

  /* Error */
  error: {
    ...typography.caption,
    color: colors.error,
    textAlign: 'center',
  },

  /* Legal */
  legal: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    opacity: 0.4,
  },
  legalTxt: {
    fontSize: 12,
    color: '#FFF',
  },
  legalLink: {
    fontSize: 12,
    color: '#FFF',
    textDecorationLine: 'underline',
  },
});
