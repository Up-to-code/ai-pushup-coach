import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors, layout, spacing, typography } from '../../../src/theme';
import { useUserStore, type User } from '../../../src/store';

const toneOptions: Array<{ id: User['coachTone']; label: string }> = [
  { id: 'balanced', label: 'Balanced' },
  { id: 'jokey', label: 'Playful' },
  { id: 'strict', label: 'Direct' },
];

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateUser } = useUserStore();

  const [name, setName] = useState(user.displayName || user.name);
  const [nickname, setNickname] = useState(user.nickname);
  const [bio, setBio] = useState(user.bio || '');
  const [coachTone, setCoachTone] = useState<User['coachTone']>(user.coachTone ?? 'balanced');

  const handleSave = () => {
    const displayName = name.trim() || user.name;
    updateUser({
      name: displayName,
      displayName,
      nickname: nickname.trim() || displayName,
      bio: bio.trim(),
      coachTone,
    });
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Edit profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Field label="Name" value={name} onChangeText={setName} placeholder="Your name" maxLength={32} />
          <Divider />
          <Field label="Nickname" value={nickname} onChangeText={setNickname} placeholder="Coach name" maxLength={32} />
          <Divider />
          <Field label="Bio" value={bio} onChangeText={setBio} placeholder="Short note" maxLength={120} multiline />
        </View>

        <View style={styles.section}>
          {toneOptions.map((tone, index) => {
            const active = coachTone === tone.id;
            return (
              <React.Fragment key={tone.id}>
                {index > 0 ? <Divider /> : null}
                <Pressable style={({ pressed }) => [styles.toneRow, pressed && styles.rowPressed]} onPress={() => setCoachTone(tone.id)}>
                  <Text style={styles.rowLabel}>{tone.label}</Text>
                  <Ionicons
                    name={active ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={active ? colors.accent : colors.textMuted}
                  />
                </Pressable>
              </React.Fragment>
            );
          })}
        </View>

        <Pressable style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Divider() {
  return <View style={styles.divider} />;
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
    <View style={styles.field}>
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
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    borderBottomWidth: layout.hairline,
    borderBottomColor: colors.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.titleMedium, color: colors.textPrimary },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  section: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  field: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 2 },
  fieldLabel: { ...typography.captionBold, color: colors.textSecondary },
  input: {
    minHeight: 36,
    ...typography.body,
    color: colors.textPrimary,
    padding: 0,
  },
  textArea: { minHeight: 74, paddingTop: spacing.xs },
  divider: { height: 1, backgroundColor: colors.borderLight, marginLeft: spacing.md },
  toneRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  rowPressed: { backgroundColor: colors.cardSecondary },
  rowLabel: { ...typography.body, color: colors.textPrimary },
  saveButton: {
    minHeight: 50,
    borderRadius: borderRadius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: { ...typography.bodyBold, color: colors.background },
});
