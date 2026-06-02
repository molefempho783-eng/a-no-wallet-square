// App.tsx
import React, { useEffect, useRef, useState } from "react";
import "react-native-gesture-handler";
import { Platform, View, ActivityIndicator } from "react-native";
import { NavigationContainer, NavigationContainerRef } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import messaging from '@react-native-firebase/messaging';
import firebaseNativeApp, { getApps } from '@react-native-firebase/app';
import * as Notifications from 'expo-notifications';
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db, firebaseConfig } from "./firebaseConfig";

import { AuthProvider, useAuth } from "./AuthContext";
import { ThemeProvider, useTheme } from "./Screens/context/ThemeContext";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import OnboardingScreen from "./Screens/OnboardingScreen";
import AuthScreen from "./Screens/AuthScreen";
import TermsAndConditionsScreen from "./Screens/Legal/TermsAndConditionsScreen";
import PrivacyPolicyScreen from "./Screens/Legal/PrivacyPolicyScreen";
import CommunityScreen from "./Screens/Community/CommunityScreen";
import CommunityDetailScreen from "./Screens/Community/CommunityDetailScreen";
import CreateCommunityScreen from "./Screens/Community/CreateCommunityScreen";
import GroupChatScreen from "./Screens/Community/Group/GroupChatScreen";
import ProfileScreen from "./Screens/Users/ProfileScreen";
import UserProfileScreen from "./Screens/Users/userProfileScreen";
import EditCommunityScreen from "./Screens/Community/EditCommunityScreen";
import ChatRoomScreen from "./Screens/Users/ChatRoomScreen";
import GroupDetailsScreen from "./Screens/Community/Group/GroupDetailsScreen";
import UserScreen from "./Screens/Users/UsersScreen";
import CreateGroupChatScreen from "./Screens/Community/Group/CreateGroupChatScreen";

import MapScreen from "./Screens/Map/MapScreen";
import DonationScreen from "./Screens/DonationScreen";
import ActivityChatScreen from "./Screens/Map/ActivityChatScreen";
import ActivityDetailScreen from "./Screens/Map/ActivityDetailScreen";
import CreateMapSpecialScreen from "./Screens/Map/CreateMapSpecialScreen";
import { registerForPushNotificationsAsync, savePushTokenToUser } from './hooks/useRegisterPushToken';
import { primeKlipyKeyFromFirebase } from './services/klipy';
import { LogBox } from 'react-native';

// Keep errors in terminal only; do not show LogBox/error overlay in the app
LogBox.ignoreAllLogs(true);

// Optional: ignore specific message patterns (still only in terminal when ignoreAllLogs is true)
LogBox.ignoreLogs([
  'VirtualizedLists should never be nested',
  '@firebase/firestore',
  'FirebaseError',
  'permission-denied',
  'Uncaught Error in snapshot listener',
  'Missing or insufficient permissions',
]);

// Set up notification handler for expo-notifications (for foreground notifications)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: Platform.OS === 'ios',
    shouldShowList: Platform.OS === 'ios',
  }),
});

// Create Android notification channel (must exist before showing any notification; FCM uses channelId 'default')
const ensureAndroidNotificationChannel = async () => {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  } catch (e) {
    console.warn('Could not create notification channel:', e);
  }
};
ensureAndroidNotificationChannel();

// Optional: strongly-typed route names if you keep a RootStackParamList
// type RootStackParamList = { ... }

const RootStack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Global nav ref so we can navigate from push tap handlers
export const navigationRef = React.createRef<NavigationContainerRef<any>>();

const TabsNavigator = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [totalUnreadDMs, setTotalUnreadDMs] = useState(0);

  useEffect(() => {
    if (!user?.uid) {
      setTotalUnreadDMs(0);
      return;
    }
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        let total = 0;
        if (snap?.docs) {
          for (const d of snap.docs) {
            const data = d.data();
            const count = data?.unreadCount?.[user.uid];
            if (typeof count === "number" && count > 0) total += count;
            else if (data?.unreadFor?.[user.uid] === true) total += 1;
          }
        }
        setTotalUnreadDMs(total);
      },
      () => setTotalUnreadDMs(0)
    );
    return () => unsub();
  }, [user?.uid]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.cardBackground,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 65 + insets.bottom,
          paddingBottom: insets.bottom,
          elevation: 10,
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: -2 },
        },
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "ellipse-outline";
          if (route.name === "CommunityScreen") iconName = "people-outline";
          else if (route.name === "UserScreen") iconName = "person-outline";
          else if (route.name === "MapScreen") iconName = "map-outline";
          else if (route.name === "DonationScreen") iconName = "wallet-outline";
          return <Ionicons name={iconName} size={size + 4} color={color} />;
        },
      })}
    >
      <Tab.Screen name="CommunityScreen" component={CommunityScreen} />
      <Tab.Screen
        name="UserScreen"
        component={UserScreen}
        options={{
          tabBarBadge: totalUnreadDMs > 0 ? (totalUnreadDMs > 99 ? "99+" : totalUnreadDMs) : undefined,
        }}
      />
      <Tab.Screen name="MapScreen" component={MapScreen} />
      <Tab.Screen name="DonationScreen" component={DonationScreen} />
    </Tab.Navigator>
  );
};

const MainNavigator = () => {
  const { user } = useAuth();
  const [hasSeenOnboarding, setHasSeenOnboarding] = React.useState<boolean | null>(null);

  // Prime KLIPY API key from Firebase Remote Config (parameter: klipy_api_key) so GIF picker works without env in repo
  useEffect(() => {
    primeKlipyKeyFromFirebase();
  }, []);

  // Check if user has seen onboarding
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const value = await AsyncStorage.getItem("@hasSeenOnboarding");
        setHasSeenOnboarding(value === "true");
      } catch (error) {
        console.error("Error checking onboarding status:", error);
        setHasSeenOnboarding(false);
      }
    };
    checkOnboardingStatus();
  }, []);

  // ----- FCM: requires android/app/google-services.json + com.google.gms.google-services -----
  useEffect(() => {
    let mounted = true;
    let unsubscribeForeground: (() => void) | null = null;
    let unsubscribeTokenRefresh: (() => void) | null = null;
    let notificationResponseSubscription: any = null;

    const ensureNativeFirebaseApp = async (): Promise<boolean> => {
      if (getApps().length > 0) return true;
      // Fallback if an old APK was installed before google-services was added (rebuild recommended).
      if (Platform.OS === "android") {
        try {
          await firebaseNativeApp.initializeApp(firebaseConfig);
          return getApps().length > 0;
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          console.warn("Native Firebase initializeApp fallback:", msg);
        }
      }
      return false;
    };

    const setupMessaging = () => {
      try {
        console.log("🔔 Setting up Firebase messaging listeners...");
        const messagingInstance = messaging();

        unsubscribeForeground = messagingInstance.onMessage(async (remoteMessage) => {
          console.log("📬 FCM message received in foreground:", remoteMessage);

          const data = remoteMessage.data || {};
          const notification = remoteMessage.notification;

          if (notification) {
            try {
              console.log(
                "📬 Displaying foreground notification:",
                notification.title,
                notification.body
              );
              await ensureAndroidNotificationChannel();
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: notification.title || "Notification",
                  body: notification.body || "",
                  data: data,
                  sound: true,
                  ...(Platform.OS === "android" && { channelId: "default" }),
                },
                trigger: null,
              });
              console.log("✅ Foreground notification scheduled successfully");
            } catch (error: unknown) {
              const err = error as { message?: string; stack?: string };
              console.error("❌ Failed to display foreground notification:", error);
              console.error("Error details:", err?.message, err?.stack);
            }
          }
        });

        notificationResponseSubscription = Notifications.addNotificationResponseReceivedListener(
          (response: { notification: { request: { content: { data: Record<string, unknown> } } } }) => {
            const data = response.notification.request.content.data;
            console.log("📬 Foreground notification tapped:", data);
            handleNotificationNavigation(data);
          }
        );

        messagingInstance.onNotificationOpenedApp((remoteMessage) => {
          console.log("📬 Notification opened app from background:", remoteMessage);
          const data = remoteMessage.data || {};
          handleNotificationNavigation(data);
        });

        messagingInstance
          .getInitialNotification()
          .then((remoteMessage) => {
            if (remoteMessage) {
              console.log("📬 Notification opened app from quit state:", remoteMessage);
              const data = remoteMessage.data || {};
              setTimeout(() => {
                handleNotificationNavigation(data);
              }, 1000);
            }
          })
          .catch((err: { message?: string }) => {
            console.warn("⚠️ Could not get initial notification:", err?.message);
          });

        unsubscribeTokenRefresh = messagingInstance.onTokenRefresh((token) => {
          console.log("🔄 FCM token refreshed:", token.substring(0, 20) + "...");
          savePushTokenToUser(token);
        });
      } catch (messagingError: unknown) {
        const msg = messagingError instanceof Error ? messagingError.message : String(messagingError);
        console.warn("⚠️ Could not set up messaging listeners:", msg);
        console.warn(
          "Rebuild the Android app after adding android/app/google-services.json and the Google Services Gradle plugin."
        );
      }
    };

    const timer = setTimeout(() => {
      void (async () => {
        if (!mounted) return;
        const ready = await ensureNativeFirebaseApp();
        if (!mounted) return;
        if (!ready) {
          console.warn(
            "⚠️ No Firebase native app [DEFAULT]. Add android/app/google-services.json, apply com.google.gms.google-services, then rebuild (npx expo run:android)."
          );
          return;
        }
        setupMessaging();
      })();
    }, 500);

    return () => {
      clearTimeout(timer);
      mounted = false;
      if (unsubscribeForeground) unsubscribeForeground();
      if (unsubscribeTokenRefresh) unsubscribeTokenRefresh();
      if (notificationResponseSubscription) notificationResponseSubscription.remove();
    };
  }, []);

  // Helper function to handle navigation from notification data
  const handleNotificationNavigation = (data: any) => {
    if (data?.type === 'dm' && data.chatId && data.recipientId) {
      if (navigationRef.current) {
        navigationRef.current.navigate('ChatRoomScreen', {
          chatId: data.chatId as string,
          recipientId: data.recipientId as string,
        });
      }
    } else if (data?.type === 'group' && data.communityId && data.chatId) {
      if (navigationRef.current) {
        navigationRef.current.navigate('GroupChatScreen', {
          groupId: data.chatId as string,
          groupName: (data.groupName as string) || 'Group',
          communityId: data.communityId as string,
        });
      }
    }
  };
  // ----- [END ADDED SECTION] -----

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) {
        console.log('⏸️ No user logged in, skipping push token registration');
        return;
      }
      console.log('🔔 Starting push notification registration for user:', user.uid);
      const token = await registerForPushNotificationsAsync();
      if (mounted && token) {
        console.log('💾 Saving token to Firestore...');
        await savePushTokenToUser(token);
      } else if (mounted) {
        console.warn('⚠️ No push token obtained, skipping save');
      }
    })();
    return () => { mounted = false; };
  }, [user]);


  // Show loading while checking onboarding status
  if (hasSeenOnboarding === null) {
    return (
      <ThemeProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' }}>
          <ActivityIndicator size="large" color="#9C3FE4" />
        </View>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <RootStack.Navigator 
          screenOptions={{ headerShown: false }}
          initialRouteName={hasSeenOnboarding ? "AuthScreen" : "OnboardingScreen"}
        >
          {user ? (
            <>
              <RootStack.Screen name="Tabs" component={TabsNavigator} />

              {/* Screens without the bottom tab bar */}
              <RootStack.Screen name="GroupChatScreen" component={GroupChatScreen} />
              <RootStack.Screen name="ActivityChatScreen" component={ActivityChatScreen} />
              <RootStack.Screen name="ActivityDetailScreen" component={ActivityDetailScreen} />
              <RootStack.Screen name="CreateMapSpecialScreen" component={CreateMapSpecialScreen} />
              <RootStack.Screen name="ChatRoomScreen" component={ChatRoomScreen} />
              <RootStack.Screen name="CommunityDetailScreen" component={CommunityDetailScreen} />
              <RootStack.Screen name="EditCommunityScreen" component={EditCommunityScreen} />
              <RootStack.Screen name="UserProfileScreen" component={UserProfileScreen} />
              <RootStack.Screen name="GroupDetailsScreen" component={GroupDetailsScreen} />
              <RootStack.Screen name="CreateCommunityScreen" component={CreateCommunityScreen} />
              <RootStack.Screen name="CreateGroupChatScreen" component={CreateGroupChatScreen} />
              <RootStack.Screen name="ProfileScreen" component={ProfileScreen} />
              <RootStack.Screen name="TermsAndConditionsScreen" component={TermsAndConditionsScreen} />
              <RootStack.Screen name="PrivacyPolicyScreen" component={PrivacyPolicyScreen} />
            </>
          ) : (
            <>
              {/* Always register both screens for unauthenticated users */}
              <RootStack.Screen name="OnboardingScreen" component={OnboardingScreen} />
              <RootStack.Screen name="AuthScreen" component={AuthScreen} />
              <RootStack.Screen name="TermsAndConditionsScreen" component={TermsAndConditionsScreen} />
              <RootStack.Screen name="PrivacyPolicyScreen" component={PrivacyPolicyScreen} />
            </>
          )}
        </RootStack.Navigator>
      </NavigationContainer>
      </SafeAreaProvider>
    </ThemeProvider>
  );
};

const App = () => (
  <AuthProvider>
    <MainNavigator />
  </AuthProvider>
);

export default App;
