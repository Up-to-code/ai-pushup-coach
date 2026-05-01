import { Tabs } from 'expo-router';
import { View, StyleSheet, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { borderRadius, colors, typography } from '../../src/theme';

export default function TabLayout() {
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Tabs
        sceneContainerStyle={{ backgroundColor: 'transparent' }}
        screenOptions={{
          headerShown: false,
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
            title: 'Practice',
            tabBarIcon: ({ focused }) => (
              <View style={styles.centerButtonWrap}>
                <View style={[styles.centerButton, focused && styles.centerButtonActive]}>
                  <Ionicons name="radio-button-on" size={26} color={colors.textPrimary} />
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
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.backgroundElevated,
  },
  centerButtonActive: {
    backgroundColor: colors.accentStrong,
  },
});
