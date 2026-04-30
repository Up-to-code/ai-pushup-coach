import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

interface AppShellProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padBottom?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({ 
  children, 
  style,
  padBottom = true 
}) => {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }, style]}>
      <View style={styles.content}>
        {children}
        {padBottom && <View style={{ height: insets.bottom + 80 }} />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
});

export default AppShell;