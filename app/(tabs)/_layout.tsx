import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { SideMenuProvider } from '@/lib/sideMenu';
import { HidingTabBar, TabBarVisibilityProvider } from '@/lib/tabBarVisibility';

export default function TabLayout() {
  return (
    <TabBarVisibilityProvider>
    <SideMenuProvider>
    <Tabs
      tabBar={(props) => <HidingTabBar {...props} />}
      initialRouteName="vymc"
      screenOptions={{
        tabBarActiveTintColor: Colors.light.tint,
        tabBarInactiveTintColor: Colors.light.tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
        // Full-width bar flush with the bottom edge; HidingTabBar anchors it and slides it away on scroll.
        tabBarStyle: {
          height: 72,
          paddingBottom: 8,
          backgroundColor: Colors.light.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: Colors.light.border,
        },
      }}>
      <Tabs.Screen
        name="vymc"
        options={{
          title: 'VyMC',
          tabBarIcon: ({ color }) => <Ionicons name="book-outline" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="privilegios"
        options={{
          title: 'Privilegios',
          tabBarIcon: ({ color }) => <Ionicons name="people-outline" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Escuela',
          tabBarIcon: ({ color }) => <Ionicons name="school-outline" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="mis-partes"
        options={{
          title: 'Mis partes',
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={28} color={color} />,
        }}
      />
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
    </SideMenuProvider>
    </TabBarVisibilityProvider>
  );
}
