import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { authClient } from '../../src/auth';
import { privacyUrl, termsUrl } from '../../src/config/links';
import { colors, spacing, typography } from '../../src/theme';

WebBrowser.maybeCompleteAuthSession();

function isAuthCancel(error: unknown) {
  return error instanceof Error && 'code' in error && error.code === 'ERR_REQUEST_CANCELED';
}

export default function SignInScreen() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openLegalLink = useCallback(async (url: string) => {
    await Linking.openURL(url);
  }, []);

  useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);

  const signInWithApple = useCallback(async () => {
    if (Platform.OS !== 'ios' || !(await AppleAuthentication.isAvailableAsync())) {
      return authClient.signIn.social({ provider: 'apple', callbackURL: '/' });
    }

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error('Apple did not return an identity token.');
    }

    return authClient.signIn.social({
      provider: 'apple',
      idToken: {
        token: credential.identityToken,
        user: {
          email: credential.email ?? undefined,
          name: {
            firstName: credential.fullName?.givenName ?? undefined,
            lastName: credential.fullName?.familyName ?? undefined,
          },
        },
      },
      callbackURL: '/',
    });
  }, []);

  const signInWithAppleOnly = useCallback(async () => {
    setIsSigningIn(true);
    setError(null);

    try {
      const { error } = await signInWithApple();

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
      setIsSigningIn(false);
    }
  }, [signInWithApple]);

  return (
    <ImageBackground source={require('../../assets/bg.png')} style={styles.root}>
      <View style={styles.overlay} />

      <SafeAreaView style={styles.safe}>
        <View style={styles.page}>
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
                    onPress={signInWithAppleOnly}
                  >
                    <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                    {isSigningIn ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Ionicons name="logo-apple" size={19} color="#FFF" />
                    )}
                    <Text style={styles.btnLabel}>Continue with Apple</Text>
                  </Pressable>
                </View>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <View style={styles.legal}>
                  <Text style={styles.legalTxt}>By continuing, you agree to our </Text>
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
    backgroundColor: 'rgba(0,0,0,0.4)',
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
  btn: {
    height: 56,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    overflow: 'hidden',
  },
  btnApple: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
    color: '#FFF',
    letterSpacing: -0.2,
  },
  error: {
    ...typography.caption,
    color: colors.error,
    textAlign: 'center',
  },
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
