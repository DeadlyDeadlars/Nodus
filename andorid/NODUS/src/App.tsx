import React, { useState, useEffect, useRef } from 'react';
import { Text, View, AppState, AppStateStatus, NativeModules } from 'react-native';
import { NavigationContainer, DefaultTheme, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'react-native';
import { radius, getColors, getSpacing } from './theme';
import { useStore } from './store';
import { ChatIcon, SettingsIcon, MoreIcon, SearchIcon, UserIcon, GlobeIcon } from './components/Icons';
import { NetworkStatus } from './components/NetworkStatus';
import { PinScreen } from './screens/PinScreen';
import {
  ChatsScreen,
  ChatDetailScreen,
  SettingsScreen,
  MoreScreen,
  OnboardingScreen,
  ChannelDetailScreen,
  StickerPacksScreen,
  CreateScreen,
  GlobalSearchScreen,
  GroupSettingsScreen,
  ChannelSettingsScreen,
  BackupScreen,
  BookmarksScreen,
  ChannelStatsScreen,
  ScheduledMessagesScreen,
  BrowserScreen,
  FeedScreen,
  MyProfileScreen,
  UserProfileScreen,
} from './screens';

// Screenshot protection
const { FlagSecure } = NativeModules;
const setSecureFlag = (enabled: boolean) => {
  try {
    if (FlagSecure?.setSecure) {
      FlagSecure.setSecure(enabled);
    }
  } catch { /* silent */ }
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const MainStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MainTabs" component={MainTabs} />
    <Stack.Screen name="UserProfile" component={UserProfileScreen} />
    <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
    <Stack.Screen name="ChannelDetail" component={ChannelDetailScreen} />
    <Stack.Screen name="GroupSettings" component={GroupSettingsScreen} />
    <Stack.Screen name="ChannelSettings" component={ChannelSettingsScreen} />
    <Stack.Screen name="Browser" component={BrowserScreen} />
  </Stack.Navigator>
);

const TabIconWrapper = ({ children, focused, colors }: { children: React.ReactNode; focused: boolean; colors: any }) => (
  <View style={[
    { width: 36, height: 28, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
    focused && { backgroundColor: colors.accent + '20' }
  ]}>
    {children}
  </View>
);

const ChatsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ChatsList" component={ChatsScreen} />
    <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
    <Stack.Screen name="Create" component={CreateScreen} />
    <Stack.Screen name="GlobalSearch" component={GlobalSearchScreen} />
    <Stack.Screen name="GroupSettings" component={GroupSettingsScreen} />
    <Stack.Screen name="ChannelDetail" component={ChannelDetailScreen} />
    <Stack.Screen name="ChannelSettings" component={ChannelSettingsScreen} />
    <Stack.Screen name="ChannelStats" component={ChannelStatsScreen} />
  </Stack.Navigator>
);

const FeedStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="FeedMain" component={FeedScreen} />
    <Stack.Screen name="UserProfile" component={UserProfileScreen} />
    <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MyProfile" component={MyProfileScreen} />
    <Stack.Screen name="UserProfile" component={UserProfileScreen} />
  </Stack.Navigator>
);

const MoreStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MoreMain" component={MoreScreen} />
    <Stack.Screen name="StickerPacks" component={StickerPacksScreen} />
    <Stack.Screen name="Backup" component={BackupScreen} />
    <Stack.Screen name="Bookmarks" component={BookmarksScreen} />
    <Stack.Screen name="ScheduledMessages" component={ScheduledMessagesScreen} />
  </Stack.Navigator>
);

const MainTabs = () => {
  const { settings } = useStore();
  const colors = getColors(settings.theme);
  const spacing = getSpacing(settings.uiDensity);

  const getTabBarStyle = (route: any) => {
    const routeName = getFocusedRouteNameFromRoute(route) ?? 'ChatsList';
    if (routeName === 'ChatDetail' || routeName === 'ChannelDetail') {
      return { display: 'none' as const };
    }
    return {
      backgroundColor: colors.surface,
      borderTopWidth: 0,
      height: settings.uiDensity === 'compact' ? 55 : settings.uiDensity === 'comfortable' ? 75 : 65,
      paddingBottom: 8,
      paddingTop: 8,
      borderRadius: radius.xl,
      position: 'absolute' as const,
      bottom: spacing.md,
      left: spacing.md,
      right: spacing.md,
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    };
  };

  const tabBarStyle = {
    backgroundColor: colors.surface,
    borderTopWidth: 0,
    height: settings.uiDensity === 'compact' ? 55 : settings.uiDensity === 'comfortable' ? 75 : 65,
    paddingBottom: 8,
    paddingTop: 8,
    borderRadius: radius.xl,
    position: 'absolute' as const,
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
    elevation: 8,
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontSize: settings.uiDensity === 'compact' ? 10 : 11, fontWeight: '500', marginTop: 2 },
        tabBarItemStyle: { paddingTop: 4 },
      }}
    >
      <Tab.Screen
        name="Чаты"
        component={ChatsStack}
        options={({ route }) => ({
          tabBarIcon: ({ focused }) => (
            <TabIconWrapper focused={focused} colors={colors}>
              <ChatIcon size={20} color={focused ? colors.accent : colors.textSecondary} />
            </TabIconWrapper>
          ),
          tabBarStyle: getTabBarStyle(route),
        })}
      />
      <Tab.Screen
        name="Лента"
        component={FeedStack}
        options={({ route }) => ({
          tabBarIcon: ({ focused }) => (
            <TabIconWrapper focused={focused} colors={colors}>
              <GlobeIcon size={20} color={focused ? colors.accent : colors.textSecondary} />
            </TabIconWrapper>
          ),
          tabBarStyle: getTabBarStyle(route),
        })}
      />
      <Tab.Screen
        name="Профиль"
        component={ProfileStack}
        options={{ 
          tabBarIcon: ({ focused }) => (
            <TabIconWrapper focused={focused} colors={colors}>
              <UserIcon size={20} color={focused ? colors.accent : colors.textSecondary} />
            </TabIconWrapper>
          ), 
          tabBarStyle 
        }}
      />
      <Tab.Screen
        name="Настройки"
        component={SettingsScreen}
        options={{ 
          tabBarIcon: ({ focused }) => (
            <TabIconWrapper focused={focused} colors={colors}>
              <SettingsIcon size={20} color={focused ? colors.accent : colors.textSecondary} />
            </TabIconWrapper>
          ), 
          tabBarStyle 
        }}
      />
      <Tab.Screen
        name="Ещё"
        component={MoreStack}
        options={{ 
          tabBarIcon: ({ focused }) => (
            <TabIconWrapper focused={focused} colors={colors}>
              <MoreIcon size={20} color={focused ? colors.accent : colors.textSecondary} />
            </TabIconWrapper>
          ), 
          tabBarStyle 
        }}
      />
    </Tab.Navigator>
  );
};

const App = () => {
  const { isOnboarded, settings, initP2P } = useStore();
  const [showOnboarding, setShowOnboarding] = useState(!isOnboarded);
  const [isUnlocked, setIsUnlocked] = useState(!settings.pinEnabled);
  const [isPanicMode, setIsPanicMode] = useState(false);
  const colors = getColors(settings.theme);
  const appState = useRef(AppState.currentState);
  const navigationRef = useRef<any>(null);

  // Screenshot protection
  useEffect(() => {
    setSecureFlag(settings.screenshotProtection === true);
  }, [settings.screenshotProtection]);

  // Initialize core
  useEffect(() => {
    if (!showOnboarding && isUnlocked && !isPanicMode) {
      initP2P().catch(e => __DEV__ && console.error('Init failed:', e));
    }
  }, [showOnboarding, isUnlocked, isPanicMode]);

  useEffect(() => {
    setIsUnlocked(!settings.pinEnabled);
  }, []);

  useEffect(() => {
    setShowOnboarding(!isOnboarded);
  }, [isOnboarded]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (settings.pinEnabled && settings.lockOnBackground && appState.current === 'active' && nextState.match(/inactive|background/)) {
        setIsUnlocked(false);
        setIsPanicMode(false);
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [settings.pinEnabled, settings.lockOnBackground]);

  const handlePinSuccess = (enteredPin?: string, type?: 'normal' | 'fake' | 'panic') => {
    if (type === 'panic') {
      useStore.getState().clearAllData();
      setIsPanicMode(true);
      setIsUnlocked(true);
    } else if (type === 'fake') {
      setIsPanicMode(true);
      setIsUnlocked(true);
    } else {
      setIsPanicMode(false);
      setIsUnlocked(true);
    }
  };

  const theme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      primary: colors.accent,
    },
  };

  if (settings.pinEnabled && !isUnlocked && !showOnboarding) {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar barStyle={settings.theme === 'light' ? 'dark-content' : 'light-content'} backgroundColor={colors.background} />
        <PinScreen mode="verify" onSuccess={handlePinSuccess} fakePin={settings.fakePin} panicPin={settings.panicPin} />
      </GestureHandlerRootView>
    );
  }

  if (isPanicMode) {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar barStyle={settings.theme === 'light' ? 'dark-content' : 'light-content'} backgroundColor={colors.background} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: colors.textSecondary, fontSize: 16 }}>Нет чатов</Text>
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={settings.theme === 'light' ? 'dark-content' : 'light-content'} backgroundColor={colors.background} />
      <NetworkStatus />
      <NavigationContainer theme={theme} ref={navigationRef}>
        {showOnboarding ? (
          <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
        ) : (
          <MainStack />
        )}
      </NavigationContainer>
    </GestureHandlerRootView>
  );
};

export default App;
