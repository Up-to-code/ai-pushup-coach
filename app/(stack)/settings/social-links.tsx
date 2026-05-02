import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors, spacing, typography } from '../../../src/theme';
import { useUserStore } from '../../../src/store';
import { CFEView, NeonButton, StackHeader } from '../../../src/components';

export default function SocialLinksScreen() {
  const router = useRouter();
  const { user, updateUser } = useUserStore();
  
  const [x, setX] = useState(user.socialLinks?.x || '');
  const [github, setGithub] = useState(user.socialLinks?.github || '');
  const [youtube, setYoutube] = useState(user.socialLinks?.youtube || '');
  const [tiktok, setTiktok] = useState(user.socialLinks?.tiktok || '');
  const [website, setWebsite] = useState(user.socialLinks?.website || '');

  const handleSave = () => {
    updateUser({
      socialLinks: {
        x: x.trim(),
        github: github.trim(),
        youtube: youtube.trim(),
        tiktok: tiktok.trim(),
        website: website.trim(),
      }
    });
    router.back();
  };

  return (
    <CFEView withBackground>
      <ScrollView 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false} 
        keyboardShouldPersistTaps="handled"
      >
        <StackHeader 
          title="Social Links" 
          subtitle="Connect your profiles to showcase your progress."
          onBack={() => router.back()}
        />

        <View style={styles.form}>
          <SocialField 
            label="X / TWITTER" 
            value={x} 
            onChangeText={setX} 
            placeholder="username" 
            prefix="x.com/"
            icon="logo-twitter"
          />
          
          <SocialField 
            label="GITHUB" 
            value={github} 
            onChangeText={setGithub} 
            placeholder="username" 
            prefix="github.com/"
            icon="logo-github"
          />
          
          <SocialField 
            label="YOUTUBE" 
            value={youtube} 
            onChangeText={setYoutube} 
            placeholder="channel ID" 
            prefix="youtube.com/@"
            icon="logo-youtube"
          />
          
          <SocialField 
            label="TIKTOK" 
            value={tiktok} 
            onChangeText={setTiktok} 
            placeholder="username" 
            prefix="tiktok.com/@"
            icon="logo-tiktok"
          />

          <SocialField 
            label="WEBSITE" 
            value={website} 
            onChangeText={setWebsite} 
            placeholder="yourportfolio.com" 
            icon="globe-outline"
          />
        </View>

        <NeonButton 
          title="Save Connections" 
          onPress={handleSave} 
          style={styles.saveButton}
        />
      </ScrollView>
    </CFEView>
  );
}

function SocialField({
  label,
  value,
  onChangeText,
  placeholder,
  prefix,
  icon,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  prefix?: string;
  icon: any;
}) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrapper}>
        <Ionicons name={icon} size={20} color={colors.textSecondary} style={{ marginRight: spacing.sm }} />
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  form: {
    gap: spacing.lg,
  },
  fieldContainer: {
    gap: spacing.sm,
  },
  fieldLabel: {
    ...typography.captionBold,
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    backgroundColor: colors.cardSecondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  prefix: {
    ...typography.body,
    color: colors.textSecondary,
    marginRight: 2,
  },
  input: {
    flex: 1,
    minHeight: 48,
    ...typography.body,
    color: colors.textPrimary,
    padding: 0,
  },
  saveButton: {
    marginTop: spacing.md,
  },
});
