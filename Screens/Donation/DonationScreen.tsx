import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  ScrollView,
  Pressable,
  Linking,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

const BACKABUDDY_URL =
  "https://www.backabuddy.co.za/campaign/help-us-launch-square";

const HERO = require("../../assets/donation-hero.png");

/** Match App.tsx tab bar content row height */
const TAB_BAR_CONTENT_HEIGHT = 65;
const FAB_BOTTOM_OFFSET = 18;
const SCROLL_END_THRESHOLD = 56;

const BULLETS_A = [
  "Small businesses accept affordable digital payments",
  "Large businesses modernize customer rewards and voucher systems",
  "Students receive food, transport, and study vouchers instantly",
  "Tourists make easy local payments without payment barriers",
  "Unbanked and underserved communities participate in the digital economy",
];

const BULLETS_B = [
  "Implement wallet infrastructure",
  "Expand merchant integrations",
  "Improve voucher features",
  "Support payment and liquidity systems",
  "Continue development and security testing",
];

export default function DonationScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = TAB_BAR_CONTENT_HEIGHT + insets.bottom + 24;
  const scrollRef = useRef<ScrollView>(null);
  const [viewportH, setViewportH] = useState(0);
  const [contentH, setContentH] = useState(0);
  const [nearBottom, setNearBottom] = useState(false);

  const canScroll = contentH > viewportH + 24;
  const showScrollFab = canScroll && !nearBottom;

  const fabBottom = TAB_BAR_CONTENT_HEIGHT + insets.bottom + FAB_BOTTOM_OFFSET;

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const distanceFromEnd =
      contentSize.height - layoutMeasurement.height - contentOffset.y;
    setNearBottom(distanceFromEnd <= SCROLL_END_THRESHOLD);
  }, []);

  const onScrollViewLayout = useCallback((e: LayoutChangeEvent) => {
    setViewportH(e.nativeEvent.layout.height);
  }, []);

  const onContentSizeChange = useCallback((_w: number, h: number) => {
    setContentH(h);
  }, []);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, []);

  const openCampaign = useCallback(async () => {
    try {
      const supported = await Linking.canOpenURL(BACKABUDDY_URL);
      if (supported) await Linking.openURL(BACKABUDDY_URL);
    } catch {
      // ignore
    }
  }, []);

  return (
    <View style={styles.root}>
      <ImageBackground
        source={HERO}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <View style={styles.scrim} pointerEvents="none" />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView
          ref={scrollRef}
          onLayout={onScrollViewLayout}
          onContentSizeChange={onContentSizeChange}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.kicker}>Support the build</Text>
          <Text style={styles.title}>Invest in Square</Text>

          <Text style={styles.body}>
            Square is a modern digital wallet and community payment platform
            designed to make sending money, receiving payments, and using
            vouchers as easy as sending a message.
          </Text>

          <Text style={styles.subheading}>We are building Square to help:</Text>
          {BULLETS_A.map((line) => (
            <Text key={line} style={styles.bullet}>
              {"\u2022 "}
              {line}
            </Text>
          ))}

          <Text style={styles.body}>
            Our voucher system will allow businesses, families, and
            organizations to send targeted support digitally, while our wallet
            infrastructure aims to make financial services more accessible to
            everyone — even people without traditional banking access.
          </Text>

          <Text style={styles.subheading}>
            We have already completed the MVP and are now raising funds to help
            us:
          </Text>
          {BULLETS_B.map((line) => (
            <Text key={line} style={styles.bullet}>
              {"\u2022 "}
              {line}
            </Text>
          ))}

          <Text style={styles.body}>
            Your support will help us build a platform focused on financial
            inclusion, local business growth, and accessible digital commerce
            for everyone.
          </Text>

          <Pressable
            onPress={openCampaign}
            style={({ pressed }) => [
              styles.cta,
              { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 },
            ]}
            android_ripple={{ color: "rgba(255,255,255,0.25)" }}
          >
            <Ionicons name="heart" size={22} color="#fff" style={styles.ctaIcon} />
            <Text style={styles.ctaText}>Donate on BackaBuddy</Text>
            <Ionicons name="open-outline" size={20} color="#fff" />
          </Pressable>

          <Text style={styles.urlHint} numberOfLines={2}>
            {BACKABUDDY_URL}
          </Text>
        </ScrollView>
      </SafeAreaView>

      {showScrollFab ? (
        <Pressable
          accessibilityLabel="Scroll to bottom"
          onPress={scrollToBottom}
          style={({ pressed }) => [
            styles.scrollFab,
            {
              bottom: fabBottom,
              backgroundColor: colors.primary,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
          android_ripple={{ color: "rgba(255,255,255,0.3)", borderless: true }}
        >
          <Ionicons name="chevron-down" size={28} color="#fff" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.62)",
  },
  safe: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  kicker: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.72)",
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 18,
  },
  subheading: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginTop: 16,
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
    color: "rgba(255,255,255,0.92)",
    marginBottom: 4,
  },
  bullet: {
    fontSize: 15,
    lineHeight: 23,
    color: "rgba(255,255,255,0.9)",
    marginLeft: 4,
    marginBottom: 6,
    paddingRight: 8,
  },
  cta: {
    marginTop: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
  ctaIcon: { marginRight: 8 },
  ctaText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    flexShrink: 1,
    marginRight: 8,
  },
  urlHint: {
    marginTop: 14,
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
  },
  scrollFab: {
    position: "absolute",
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
      },
      android: { elevation: 8 },
    }),
  },
});
