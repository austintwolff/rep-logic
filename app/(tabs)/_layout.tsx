import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';

import { useColorScheme } from '@/components/useColorScheme';

function TabBarIcon(props: {
  icon: string;
  color: string;
}) {
  return <Text style={[styles.tabIcon, { color: props.color }]}>{props.icon}</Text>;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#10B981',
        tabBarInactiveTintColor: isDark ? '#9CA3AF' : '#6B7280',
        tabBarStyle: {
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
          borderTopColor: isDark ? '#1F2937' : '#E5E7EB',
          paddingTop: 8,
          height: 88,
        },
        headerStyle: {
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
        },
        headerTintColor: isDark ? '#F9FAFB' : '#111827',
        headerTitleStyle: {
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabBarIcon icon="🏠" color={color} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color }) => <TabBarIcon icon="📊" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <TabBarIcon icon="📋" color={color} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Leaderboard',
          tabBarIcon: ({ color }) => <TabBarIcon icon="🏆" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabBarIcon icon="👤" color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    fontSize: 24,
    marginBottom: -3,
  },
});
