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
        console.warn('Better Auth social sign-in error', error);
        throw new Error(error.message || error.code || 'Social sign-in failed.');
      }
    } catch (err) {
      if (!isAuthCancel(err)) {
        console.warn('Better Auth OAuth failed', err);
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
          <View style={styles.hero}>
            <View style={styles.titleBlock}>
              <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={styles.headline}>
                Perfect{'\n'}Every Rep
              </Animated.Text>
            </View>
          </View>

          <View style={styles.bottomContainer}>
            <View style={styles.bottomContent}>
              <Animated.View entering={FadeInUp.delay(500).duration(600)} style={styles.bottom}>
                <View style={styles.buttons}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.btn,
                      styles.btnApple,
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
                      <Ionicons name="logo-apple" size={19} color="#FFF" />
                    )}
                    <Text style={styles.btnLabel}>Apple</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.btn,
                      styles.btnGoogle,
                      pressed && styles.btnPressed,
                      isSigningIn && styles.btnOff,
                    ]}
                    disabled={isSigningIn}
                    onPress={() => signInWithSocial('google')}
                  >
                    {signingInProvider === 'google' ? (
                      <ActivityIndicator color="#111" size="small" />
                    ) : (
                      <Ionicons name="logo-google" size={19} color="#111" />
                    )}
                    <Text style={[styles.btnLabel, styles.btnLabelDark]}>Google</Text>
                  </Pressable>
                </View>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <View style={styles.legal}>
                  <Text style={styles.legalTxt}>By continuing, you agree to the </Text>
                  <Pressable onPress={() => openLegalLink(termsUrl)}>
                    <Text style={styles.legalLink}>Terms</Text>
                  </Pressable>
                  <Text style={styles.legalTxt}> and </Text>
                  <Pressable onPress={() => openLegalLink(privacyUrl)}>
                    <Text style={styles.legalLink}>Privacy</Text>
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
  root: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  safe: {
    flex: 1,
  },
  page: {
    flex: 1,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  titleBlock: {
    alignItems: 'center',
    gap: spacing.mdSm,
    maxWidth: 360,
  },

  headline: {
    ...typography.title,
    fontSize: 48,
    fontWeight: '900',
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 56,
    letterSpacing: -1,
  },
  bottomContainer: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  bottomContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  bottom: {
    gap: spacing.lg,
  },
  buttons: {
    gap: spacing.md,
  },
  btn: {
    minHeight: 58,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    overflow: 'hidden',
  },
  btnApple: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  btnGuest: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  btnGoogle: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  guestBtn: {
    minHeight: 52,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  btnPressed: {
    opacity: 0.76,
  },
  btnOff: {
    opacity: 0.5,
  },
  btnLabel: {
    ...typography.bodyBold,
    fontSize: 16,
    color: '#FFF',
    letterSpacing: 0,
  },
  btnLabelDark: {
    color: '#111',
  },
  error: {
    ...typography.caption,
    color: colors.error,
    textAlign: 'center',
    lineHeight: 17,
  },
  legal: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
  },
  legalTxt: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    lineHeight: 16,
  },
  legalLink: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    lineHeight: 16,
  },
});
