import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors, layout, spacing, typography } from '../../../src/theme';
import { useUserStore } from '../../../src/store';
import { useUser } from '@clerk/clerk-expo';
import { getCountryByCode, getFlagEmoji } from '../../../src/data/countries';
import { CFEView, NeonButton, StackHeader } from '../../../src/components';
import { pickAndUploadAvatar } from '../../../src/utils/uploadthing';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user: clerkUser } = useUser();
  const { user, updateUser } = useUserStore();

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
        setAvatarUrl(url);
        updateUser({ avatar: url });
        Alert.alert('Done', 'Avatar uploaded and saved.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    const displayName = name.trim() || user.name;
    
    if (clerkUser) {
      const parts = displayName.split(' ');
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '';
      try {
        await clerkUser.update({ firstName, lastName });
      } catch (err) {
        console.warn('Failed to update Clerk identity', err);
      }
    }

    updateUser({
      name: displayName,
      displayName,
      nickname: nickname.trim() || displayName,
      bio: bio.trim(),
      avatar: avatarUrl || undefined,
      countryCode: selectedCountry.code,
      countryName: selectedCountry.name,
    });
    setIsSaving(false);
    router.back();
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
          title="Edit Profile" 
          subtitle="Update your identity and avatar."
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
          <Text style={styles.avatarHint}>Tap to change photo</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Identity</Text>
          </View>
          
          <Field 
            label="DISPLAY NAME" 
            value={name} 
            onChangeText={setName} 
            placeholder="Your name" 
            maxLength={32} 
          />
          
          <Field 
            label="COACH NICKNAME" 
            value={nickname} 
            onChangeText={setNickname} 
            placeholder="How coach addresses you" 
            maxLength={32} 
          />
          
          <Field 
            label="BIO" 
            value={bio} 
            onChangeText={setBio} 
            placeholder="A short note about yourself" 
            maxLength={120} 
            multiline 
          />

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Connections</Text>
          </View>

          <Pressable 
            style={styles.navItem} 
            onPress={() => router.push('/settings/social-links' as any)}
          >
            <View style={styles.navItemContent}>
              <Text style={styles.fieldLabel}>SOCIAL LINKS</Text>
              <Text style={styles.navItemValue}>Manage your X, GitHub, and more</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>

          <Pressable 
            style={styles.navItem} 
            onPress={() => router.push('/settings/country' as any)}
          >
            <View style={styles.navItemContent}>
              <Text style={styles.fieldLabel}>COUNTRY</Text>
              <Text style={styles.navItemValue}>
                {getFlagEmoji(selectedCountry.code)}  {selectedCountry.code === 'GLOBAL' ? 'Global / Earth' : selectedCountry.name}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        <NeonButton 
          title={isSaving ? "Saving..." : "Save Changes"} 
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
    ...StyleSheet.absoluteFillObject,
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
