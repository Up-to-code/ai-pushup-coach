import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors, layout, spacing, typography } from '../../../src/theme';
import { useUserStore } from '../../../src/store';
import { useSaveBackendProfile } from '../../../src/backend';
import { useAppLocale } from '../../../src/localization';
import { getCountryByCode, getFlagEmoji } from '../../../src/data/countries';
import { CFEView, NeonButton, StackHeader } from '../../../src/components';
import { authClient } from '../../../src/auth/authClient';
import { pickAndUploadAvatar } from '../../../src/utils/uploadthing';

export default function EditProfileScreen() {
  const router = useRouter();
  const { t } = useAppLocale();
  const { user, updateUser } = useUserStore();
  const saveBackendProfile = useSaveBackendProfile();

  const [name, setName] = useState(user.displayName || user.name);
  const [nickname, setNickname] = useState(user.nickname);
  const [bio, setBio] = useState(user.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatar || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const selectedCountry = getCountryByCode(user.countryCode);

  const handlePickAvatar = async () => {
    setIsUploading(true);
    try {
      const url = await pickAndUploadAvatar();
      if (url) {
        const nextUser = { ...user, avatar: url };
        setAvatarUrl(url);
        updateUser(nextUser);
        await saveBackendProfile(nextUser);
        Alert.alert(t('profile.alertAvatarSavedTitle'), t('profile.alertAvatarSavedBody'));
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    
    try {
      const displayName = name.trim() || user.name;
      const avatar = avatarUrl || undefined;

      // 1. Update the Auth Provider (BetterAuth/Clerk) first
      // Keep Better Auth identity aligned with the explicit profile save.
      await authClient.updateUser({
        name: displayName,
        image: avatar,
      });

      const nextUser = {
        ...user,
        name: displayName,
        displayName,
        nickname: nickname.trim() || displayName,
        bio: bio.trim(),
        avatar,
        countryCode: selectedCountry.code,
        countryName: selectedCountry.name,
      };

      // 2. Update the local Zustand store for immediate UI update
      updateUser(nextUser);
      await saveBackendProfile(nextUser);

      router.back();
    } catch (error) {
      console.error('Failed to update profile:', error);
      Alert.alert(t('profile.alertSaveFailedTitle'), t('profile.alertSaveFailedBody'));
    } finally {
      setIsSaving(false);
    }
  };

  const displayInitial = (user.displayName || user.name).slice(0, 1).toUpperCase();

  return (
    <CFEView withBackground>
      <ScrollView 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false} 
        keyboardShouldPersistTaps="handled"
      >
        <StackHeader 
          title={t('profile.editTitle')}
          subtitle={t('profile.editSubtitle')}
          onBack={() => router.back()}
        />

        {/* Avatar Upload */}
        <View style={styles.avatarSection}>
          <Pressable style={styles.avatarContainer} onPress={handlePickAvatar} disabled={isUploading}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>{displayInitial}</Text>
              </View>
            )}
            {isUploading ? (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color={colors.textPrimary} size="small" />
              </View>
            ) : (
              <View style={styles.avatarBadge}>
                <Ionicons name="camera" size={14} color={colors.textPrimary} />
              </View>
            )}
          </Pressable>
          <Text style={styles.avatarHint}>{t('profile.avatarHint')}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('profile.identity')}</Text>
          </View>
          
          <Field 
            label={t('profile.displayName')}
            value={name} 
            onChangeText={setName} 
            placeholder={t('profile.namePlaceholder')}
            maxLength={32} 
          />
          
          <Field 
            label={t('profile.coachNickname')}
            value={nickname} 
            onChangeText={setNickname} 
            placeholder={t('profile.coachPlaceholder')}
            maxLength={32} 
          />
          
          <Field 
            label={t('profile.bio')}
            value={bio} 
            onChangeText={setBio} 
            placeholder={t('profile.bioPlaceholder')}
            maxLength={120} 
            multiline 
          />

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('profile.connections')}</Text>
          </View>

          <Pressable 
            style={styles.navItem} 
            onPress={() => router.push('/settings/social-links' as any)}
          >
            <View style={styles.navItemContent}>
              <Text style={styles.fieldLabel}>{t('profile.socialLinks')}</Text>
              <Text style={styles.navItemValue}>{t('profile.socialLinksValue')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>

          <Pressable 
            style={styles.navItem} 
            onPress={() => router.push('/settings/country' as any)}
          >
            <View style={styles.navItemContent}>
              <Text style={styles.fieldLabel}>{t('profile.country')}</Text>
              <Text style={styles.navItemValue}>
                {getFlagEmoji(selectedCountry.code)}  {selectedCountry.code === 'GLOBAL' ? t('country.globalEarth') : selectedCountry.name}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        <NeonButton 
          title={isSaving ? t('common.saving') : t('profile.saveChanges')}
          onPress={handleSave} 
          style={styles.saveButton}
          disabled={isSaving}
        />
      </ScrollView>
    </CFEView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  maxLength,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  maxLength: number;
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        maxLength={maxLength}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
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

  /* Avatar */
  avatarSection: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.cardSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    ...typography.titleLarge,
    color: colors.textPrimary,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  avatarHint: {
    ...typography.caption,
    color: colors.textMuted,
  },

  /* Form */
  form: {
    gap: spacing.lg,
  },
  sectionHeader: {
    marginTop: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: layout.hairline,
    borderBottomColor: colors.borderLight,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    letterSpacing: 1.5,
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
  input: {
    minHeight: 48,
    backgroundColor: colors.cardSecondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  textArea: {
    minHeight: 100,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  navItemContent: {
    gap: 4,
  },
  navItemValue: {
    ...typography.body,
    color: colors.textPrimary,
  },
  saveButton: {
    marginTop: spacing.md,
  },
});
