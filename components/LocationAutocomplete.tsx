import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../Screens/context/ThemeContext";
import {
  fetchPlaceSuggestions,
  PlaceSuggestion,
  LocationBias,
} from "../services/places";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  selectedPlace: PlaceSuggestion | null;
  onSelectPlace: (place: PlaceSuggestion) => void;
  onClearSelection?: () => void;
  bias?: LocationBias | null;
  placeholder?: string;
  label?: string;
  optional?: boolean;
};

export default function LocationAutocomplete({
  value,
  onChangeText,
  selectedPlace,
  onSelectPlace,
  onClearSelection,
  bias = null,
  placeholder = "Search for an address or place...",
  label,
  optional = false,
}: Props) {
  const { colors } = useTheme();
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(
    async (text: string) => {
      if (text.trim().length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        setHint(null);
        return;
      }
      setLoading(true);
      const result = await fetchPlaceSuggestions(text, bias);
      setLoading(false);
      setSuggestions(result.suggestions);
      setShowSuggestions(result.suggestions.length > 0);
      if (result.suggestions.length === 0 && result.errorMessage) {
        setHint(result.errorMessage);
      } else if (result.provider === "nominatim") {
        setHint("Using OpenStreetMap (enable Google Cloud billing for Google Places).");
      } else {
        setHint(null);
      }
    },
    [bias]
  );

  const handleChange = (text: string) => {
    onChangeText(text);
    onClearSelection?.();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(text), 350);
  };

  const handleSelect = (place: PlaceSuggestion) => {
    onChangeText(place.description);
    onSelectPlace(place);
    setSuggestions([]);
    setShowSuggestions(false);
    setHint(null);
    Keyboard.dismiss();
  };

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={[styles.label, { color: colors.text }]}>
          {label}
          {optional ? " (optional)" : ""}
        </Text>
      ) : null}
      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.input,
            {
              borderColor: colors.borderColor ?? colors.border,
              backgroundColor: colors.cardBackground,
              color: colors.text,
              flex: 1,
            },
          ]}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholderText as string}
          value={value}
          onChangeText={handleChange}
          autoCorrect={false}
        />
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />
        ) : null}
      </View>
      {selectedPlace ? (
        <Text style={[styles.selectedHint, { color: colors.primary }]}>
          Selected: {selectedPlace.description.slice(0, 60)}
          {selectedPlace.description.length > 60 ? "…" : ""}
        </Text>
      ) : null}
      {hint && !showSuggestions ? (
        <Text style={[styles.hint, { color: colors.textSecondary }]} numberOfLines={3}>
          {hint}
        </Text>
      ) : null}
      {showSuggestions && suggestions.length > 0 ? (
        <ScrollView
          style={[
            styles.list,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.borderColor ?? colors.border,
            },
          ]}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {suggestions.map((item) => (
            <TouchableOpacity
              key={item.place_id}
              style={[styles.item, { borderBottomColor: colors.borderColor ?? colors.border }]}
              onPress={() => handleSelect(item)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="location-outline"
                size={20}
                color={colors.textSecondary}
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.itemText, { color: colors.text }]} numberOfLines={2}>
                {item.description}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { fontSize: 15, marginBottom: 8, fontWeight: "500" },
  inputRow: { flexDirection: "row", alignItems: "center" },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  spinner: { marginLeft: 8 },
  selectedHint: { fontSize: 12, marginTop: 6 },
  hint: { fontSize: 12, marginTop: 6, lineHeight: 16 },
  list: {
    maxHeight: 200,
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 4,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemText: { flex: 1, fontSize: 15 },
});
