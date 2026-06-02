import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../Screens/context/ThemeContext";
import { PinnedChatMeta } from "../utils/chatPin";

type Props = {
  pinned: PinnedChatMeta;
  canUnpin: boolean;
  onPress?: () => void;
  onUnpin: () => void;
};

export default function PinnedMessageBanner({
  pinned,
  canUnpin,
  onPress,
  onUnpin,
}: Props) {
  const { colors } = useTheme();
  if (!pinned.pinnedMessageId || !pinned.pinnedMessagePreview) return null;

  return (
    <TouchableOpacity
      style={[
        styles.banner,
        {
          backgroundColor: colors.cardBackground,
          borderBottomColor: colors.borderColor ?? colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <Ionicons name="pin" size={18} color={colors.primary} style={styles.pinIcon} />
      <View style={styles.textWrap}>
        <Text style={[styles.label, { color: colors.primary }]}>Pinned message</Text>
        <Text style={[styles.preview, { color: colors.text }]} numberOfLines={2}>
          {pinned.pinnedMessagePreview}
        </Text>
      </View>
      {canUnpin ? (
        <TouchableOpacity onPress={onUnpin} hitSlop={12} accessibilityLabel="Unpin message">
          <Ionicons name="close-circle" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pinIcon: { marginRight: 10 },
  textWrap: { flex: 1 },
  label: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", marginBottom: 2 },
  preview: { fontSize: 14 },
});
