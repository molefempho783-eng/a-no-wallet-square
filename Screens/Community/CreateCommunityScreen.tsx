import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  StyleSheet,
  FlatList,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Community, RootStackParamList } from "../../types";
import { collection, addDoc } from "firebase/firestore";
import { db, auth, storage } from "../../firebaseConfig";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../context/ThemeContext";
import createStyles, { FONT_SIZES, SPACING } from "../context/appStyles";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LocationAutocomplete from "../../components/LocationAutocomplete";
import { PlaceSuggestion, resolvePlaceCoordinates } from "../../services/places";

const DEFAULT_COMMUNITY_LOGO = require("../../assets/community-placeholder.png");

type NavigationProp = StackNavigationProp<RootStackParamList, "CreateCommunityScreen">;

const CreateCommunityScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isThemeLoading } = useTheme();
  const insets = useSafeAreaInsets();

  const styles = createStyles(colors).createCommunityScreen;
  const globalStyles = createStyles(colors).global;

  // Same as CommunityScreen / CreateGroupChatScreen: manual insets below Dynamic Island / notch
  const safeAreaStyle = [
    { flex: 1, backgroundColor: colors.background },
    Platform.OS !== "web" && {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
    },
  ];

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [communityLogoUri, setCommunityLogoUri] = useState<string | null>(null);
const [locationAddress, setLocationAddress] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<PlaceSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState("");
  const [isPickingImage, setIsPickingImage] = useState(false);

  /* ----------------------------------------------------------------
   * Image picker
   * ---------------------------------------------------------------*/
  const handleImagePick = async () => {
    if (isPickingImage) return;
    setIsPickingImage(true);

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow access to pick an image.");
      setIsPickingImage(false);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets.length > 0) {
      setCommunityLogoUri(result.assets[0].uri);
    }
    setIsPickingImage(false);
  };

  const validateLocation = (): boolean => {
    const locationText = locationAddress.trim();
    if (!locationText) return true;
    if (!selectedPlace) {
      Alert.alert(
        "Invalid location",
        "Pick a location from the suggestions list (search uses Google or OpenStreetMap)."
      );
      return false;
    }
    return true;
  };


  /* ----------------------------------------------------------------
   * Firebase upload and save
   * ---------------------------------------------------------------*/
  const uploadImageToFirebase = async (uri: string, communityId: string): Promise<string | null> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `community_logos/${communityId}.jpg`);
      await uploadBytes(storageRef, blob);
      return await getDownloadURL(storageRef);
    } catch (err) {
      console.error("Upload failed", err);
      return null;
    }
  };

  const handleCreateCommunity = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Community name is required.");
      return;
    }
    if (!auth.currentUser) {
      Alert.alert("Error", "You must be logged in to create a community.");
      return;
    }
    if (!validateLocation()) return;

    setLoading(true);

    const categoriesArray = categories
      .split(',') // Split by comma
      .map(cat => cat.trim()) // Remove whitespace
      .filter(cat => cat.length > 0) // Remove empty strings
      .map(cat => cat.toLowerCase()); // Optional: normalize data

    const tempId = `${auth.currentUser.uid}_${Date.now()}`;

    let logoUrl: string | null = null;
    if (communityLogoUri) {
      logoUrl = await uploadImageToFirebase(communityLogoUri, tempId);
      if (!logoUrl) {
        setLoading(false);
        return;
      }
    }

    try {
      let latitude: number | undefined;
      let longitude: number | undefined;
      if (selectedPlace) {
        const coords = await resolvePlaceCoordinates(selectedPlace);
        if (coords) {
          latitude = coords.lat;
          longitude = coords.lng;
        }
      }

      const docRef = await addDoc(collection(db, "communities"), {
        name,
        description: description.trim() || undefined,
        location: locationAddress.trim() || undefined,
        ...(latitude != null && longitude != null ? { latitude, longitude } : {}),
        categories: categoriesArray.length > 0 ? categoriesArray : undefined,
        createdBy: auth.currentUser.uid,
        createdAt: new Date(),
        logo: logoUrl || undefined,
      });

      Alert.alert("Success", "Community created successfully!");
      navigation.navigate("CommunityDetailScreen", {
        community: {
          id: docRef.id,
          name,
          description: description.trim() || undefined,
          location: locationAddress.trim() || undefined, // Using locationAddress
          categories: categoriesArray.length > 0 ? categoriesArray : undefined, // <-- ADD THIS
          logo: logoUrl || undefined,
          createdBy: auth.currentUser.uid,
          createdAt: new Date(),
        },
      });
      setName("");
      setDescription("");
      setLocationAddress("");
      setCategories("");
      setSelectedPlace(null);
      setCommunityLogoUri(null);
    } catch (e: any) {
      console.error("Create community failed", e?.message ?? e);
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------------------------------------
   * UI
   * ---------------------------------------------------------------*/
  if (isThemeLoading) {
    return (
      <View
        style={[
          globalStyles.centeredContainer,
          Platform.OS !== "web" && {
            paddingTop: insets.top,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={globalStyles.loadingOverlayText}>Loading theme...</Text>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={safeAreaStyle}>
      <View style={styles.container}>
        {loading && (
          <View style={styles.loadingOverlayScreen}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingOverlayText}>Creating community...</Text>
          </View>
        )}

        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: SPACING.large }}>
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={globalStyles.backButton || globalStyles.primaryButton}
          >
            <Ionicons name="arrow-back" size={FONT_SIZES.xxlarge} color={colors.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.header}>Create a New Community</Text>

          {/* Logo Picker */}
          <TouchableOpacity onPress={handleImagePick} style={styles.logoContainer}>
            {communityLogoUri ? (
            <Image
                source={{ uri: communityLogoUri }}
                style={styles.logoImage}
                resizeMode="cover"
            />
            ) : (
              <View
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: colors.primaryLight,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    color: colors.primary,
                    fontSize: FONT_SIZES.large,
                    fontWeight: 'bold',
                  }}
                >
                  {name
                    .split(' ')
                    .map(w => w[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase() || '??'}
                </Text>
              </View>
            )}
            <Text style={styles.addLogoText}>{communityLogoUri ? "Change Logo" : "Add Logo"}</Text>
          </TouchableOpacity>

          {/* Name */}
          <TextInput
            style={[
              styles.input,
              { borderColor: colors.borderColor, backgroundColor: colors.cardBackground, color: colors.text },
            ]}
            placeholder="Community Name"
            placeholderTextColor={colors.placeholderText as string}
            value={name}
            onChangeText={setName}
          />

          {/* Description */}
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              { borderColor: colors.borderColor, backgroundColor: colors.cardBackground, color: colors.text },
            ]}
            placeholder="Description (optional)"
            placeholderTextColor={colors.placeholderText as string}
            value={description}
            onChangeText={setDescription}
            multiline
          />

          {/* Categories */}
          <TextInput
            style={[
              styles.input,
              { borderColor: colors.borderColor, backgroundColor: colors.cardBackground, color: colors.text },
            ]}
            placeholder="Categories (e.g., tech, gaming, sports)"
            placeholderTextColor={colors.placeholderText as string}
            value={categories}
            onChangeText={setCategories}
            autoCapitalize="none" // Good for categories/tags
          />

          <LocationAutocomplete
            label="Location"
            optional
            value={locationAddress}
            onChangeText={setLocationAddress}
            selectedPlace={selectedPlace}
            onSelectPlace={setSelectedPlace}
            onClearSelection={() => setSelectedPlace(null)}
            placeholder="Search for an address or place..."
          />

          {/* Create Button */}
          <TouchableOpacity style={styles.saveButton} onPress={handleCreateCommunity}>
            {loading ? (
              <ActivityIndicator color={colors.activeFilterText} />
            ) : (
              <Text style={styles.saveButtonText}>Create Community</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default CreateCommunityScreen;
