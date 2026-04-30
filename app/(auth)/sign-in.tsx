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
  ZoomIn,
} from 'react-native-reanimated';
import { BrandLogo } from '../../src/components';
import { borderRadius, colors, spacing, typography, shadows } from '../../src/theme';

WebBrowser.maybeCompleteAuthSession();

type Provider = 'oauth_google' | 'oauth_apple';

export default function SignInScreen() {
  const { startSSOFlow } = useSSO();
  const router = useRouter();
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

  return (
    <ImageBackground
      source={require('../../assets/images/home_bg.png')}
      style={styles.root}
      imageStyle={styles.bgImage}
      resizeMode="cover"
    >


      <SafeAreaView style={styles.safe}>
        <View style={styles.page}>
          {/* ── Hero ── */}
          <View style={styles.hero}>
            <Animated.View entering={ZoomIn.duration(600).springify().damping(16)}>
              <View style={styles.logoBg}>
                <BrandLogo size={44} color={colors.accent} />
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(200).duration(450)} style={styles.titleBlock}>
              <Text style={styles.brand}>PUSH-UP COACH</Text>
              <Text style={styles.headline}>
                Every rep counted.{'\n'}Every session planned.
              </Text>
              <Text style={styles.sub}>
                Sign in to sync workouts, compete on{'\n'}leaderboards, and track your path.
              </Text>
            </Animated.View>
          </View>

          {/* ── Bottom ── */}
          <Animated.View entering={FadeInUp.delay(400).duration(450)} style={styles.bottom}>
            {/* Auth buttons */}
            <View style={styles.buttons}>
              <Pressable
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnApple,
                  pressed && !activeProvider && styles.btnPressed,
                  activeProvider !== null && styles.btnOff,
                ]}
                disabled={activeProvider !== null}
                onPress={() => signInWith('oauth_apple')}
              >
                {activeProvider === 'oauth_apple' ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Ionicons name="logo-apple" size={19} color="#FFF" />
                )}
                <Text style={styles.btnLabel}>Continue with Apple</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnGoogle,
                  pressed && !activeProvider && styles.btnPressed,
                  activeProvider !== null && styles.btnOff,
                ]}
                disabled={activeProvider !== null}
                onPress={() => signInWith('oauth_google')}
              >
                {activeProvider === 'oauth_google' ? (
                  <ActivityIndicator color={colors.textPrimary} size="small" />
                ) : (
                  <Ionicons name="logo-google" size={17} color={colors.textPrimary} />
                )}
                <Text style={[styles.btnLabel, styles.btnLabelSec]}>Continue with Google</Text>
              </Pressable>
            </View>

            {error ? (
              <Animated.Text entering={FadeIn.duration(250)} style={styles.error}>
                {error}
              </Animated.Text>
            ) : null}

            {/* Legal */}
            <View style={styles.legal}>
              <Text style={styles.legalTxt}>By continuing, you agree to our </Text>
              <Pressable onPress={() => router.push('/(stack)/legal/terms' as any)}>
                <Text style={styles.legalLink}>Terms</Text>
              </Pressable>
              <Text style={styles.legalTxt}> & </Text>
              <Pressable onPress={() => router.push('/(stack)/legal/privacy' as any)}>
                <Text style={styles.legalLink}>Privacy</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

/* ─────────────────────────────────────────────── */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.backgroundCanvas,
  },
  bgImage: {
    opacity: 0,
  },

  safe: {
    flex: 1,
  },
  page: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
  },

  /* ── Hero ── */
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xl,
  },
  logoBg: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: 'rgba(218, 63, 69, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(218, 63, 69, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    alignItems: 'center',
    gap: spacing.mdSm,
  },
  brand: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 4,
    color: colors.accent,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  headline: {
    ...typography.title,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 34,
  },
  sub: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 21,
  },

  /* ── Bottom ── */
  bottom: {
    paddingBottom: spacing.md,
    gap: spacing.lg,
  },
  buttons: {
    gap: spacing.mdSm,
  },

  /* Buttons */
  btn: {
    height: 54,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
  },
  btnApple: {
    backgroundColor: colors.accent,
    borderColor: 'rgba(218, 63, 69, 0.6)',
    ...shadows.accent,
  },
  btnGoogle: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: colors.border,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  btnOff: {
    opacity: 0.5,
  },
  btnLabel: {
    ...typography.bodyBold,
    fontSize: 15,
    color: '#FFF',
    letterSpacing: -0.1,
  },
  btnLabelSec: {
    color: colors.textPrimary,
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
    paddingBottom: spacing.xs,
  },
  legalTxt: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
  },
  legalLink: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    textDecorationLine: 'underline',
  },
});
