import { Tabs } from 'expo-router';
import { Image, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { borderRadius, colors, typography } from '../../src/theme';
import { useSettingsStore } from '../../src/store';

export default function TabLayout() {
  const hasCompletedOnboarding = useSettingsStore((state) => state.hasCompletedOnboarding);

  if (!hasCompletedOnboarding) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]} />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: 'transparent' },
          tabBarShowLabel: true,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarBackground: () => (
            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          ),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'My Plan',
            tabBarIcon: ({ color }) => <Ionicons name="clipboard-outline" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="challenges"
          options={{
            title: 'Challenges',
            tabBarIcon: ({ color }) => <Ionicons name="trophy-outline" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="practice"
          options={{
            title: 'Pushups',
            tabBarLabel: '',
            tabBarIcon: ({ focused }) => (
              <View style={styles.centerButtonWrap}>
                <View style={[styles.centerButton, focused && styles.centerButtonActive]}>
                  <Image
                    source={require('../../assets/brand/logo-push-up.png')}
                    style={styles.centerLogo}
                    resizeMode="contain"
                  />
                </View>
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="leaderboard"
          options={{
            title: 'Rank',
            tabBarIcon: ({ color }) => <Ionicons name="podium-outline" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={22} color={color} />,
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  tabBar: {
    backgroundColor: 'transparent',
    borderTopColor: 'rgba(255,255,255,0.1)',
    borderTopWidth: 1,
    height: 74,
    paddingBottom: 10,
    paddingTop: 10,
    elevation: 0,
  },
  tabBarLabel: {
    ...typography.caption,
    fontSize: 10,
  },
  centerButtonWrap: {
    top: -18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButton: {
    width: 58,
    height: 58,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.accent,
  },
  centerButtonActive: {
    backgroundColor: colors.backgroundElevated,
    borderColor: colors.accentStrong,
  },
  centerLogo: {
    width: 42,
    height: 42,
  },
});
