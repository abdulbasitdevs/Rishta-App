import { decode } from "base64-arraybuffer";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "@/lib/supabase";

// Match the existing Rishta App theme.
const C = {
  bg: "#05151D",
  surface: "#102A30",
  surfaceDark: "#08252C",
  emerald: "#086B54",
  emeraldBright: "#12D894",
  gold: "#E7BD79",
  goldLight: "#FFE2AB",
  white: "#F8FBF9",
  muted: "#B1C1C7",
  border: "#42736F",
  error: "#FF9F9F",
  success: "#7BF0C3",
};

const serif = Platform.select({
  ios: "Georgia",
  android: "serif",
  default: "Georgia",
});

// Preserve existing private Storage bucket and file rules.
const BUCKET = "Rishta-profile-photos";
const MAX_PHOTOS = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

type ActionButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  secondary?: boolean;
};

function ActionButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  secondary = false,
}: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={loading || disabled}
      style={({ pressed }) => [
        styles.primaryButton,
        secondary && styles.secondaryButton,
        (pressed || loading || disabled) && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={secondary ? C.gold : C.white} />
      ) : null}
      <Text
        style={[
          styles.primaryButtonText,
          secondary && styles.secondaryButtonText,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

type ToggleRowProps = {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

function ToggleRow({
  title,
  description,
  value,
  onValueChange,
  disabled = false,
}: ToggleRowProps) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingText}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.helper}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        accessibilityLabel={title}
        trackColor={{ false: C.border, true: C.emerald }}
        thumbColor={value ? C.goldLight : C.muted}
      />
    </View>
  );
}

export default function ProfilePhotosScreen() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);

  const [photoPaths, setPhotoPaths] = useState<string[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  const [showAge, setShowAge] = useState(false);
  const [showCity, setShowCity] = useState(false);

  // Discovery data is separate from private profile/photo data.
  const [discoveryVisible, setDiscoveryVisible] = useState(false);
  const [discoveryConfigured, setDiscoveryConfigured] = useState(false);
  const [checkingDiscovery, setCheckingDiscovery] = useState(true);
  const [discoveryError, setDiscoveryError] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const { data, error: authError } = await supabase.auth.getUser();

        if (!active) return;
        if (authError || !data.user) {
          router.replace("/login");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("rishta_profiles")
          .select("profile_photo_paths, show_age, show_city, profile_step")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (!active) return;
        if (profileError) {
          setError(profileError.message);
          return;
        }
        if (!profile) {
          router.replace("/profile-setup");
          return;
        }
        if (profile.profile_step < 3) {
          router.replace("/partner-preferences");
          return;
        }

        const paths: string[] = Array.isArray(profile.profile_photo_paths)
          ? profile.profile_photo_paths
          : [];
        setPhotoPaths(paths);
        setShowAge(profile.show_age ?? false);
        setShowCity(profile.show_city ?? false);
        setCompleted(profile.profile_step >= 4);

        // Signed previews are for the signed-in user's own private photos.
        const urls: Record<string, string> = {};
        for (const path of paths) {
          if (!path.startsWith(`${data.user.id}/`)) continue;
          const { data: signed } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(path, 600);
          if (signed?.signedUrl) urls[path] = signed.signedUrl;
        }
        if (active) setPhotoUrls(urls);
      } catch {
        if (active) setError("Unable to load your photos.");
      } finally {
        if (active) setChecking(false);
      }
    }

    void loadProfile();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (!active) return;
      if (event === "SIGNED_OUT") router.replace("/login");
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  // Refresh this separately when returning from Discovery Settings.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadDiscoveryVisibility() {
        setCheckingDiscovery(true);
        setDiscoveryError("");
        try {
          const { data: auth, error: authError } =
            await supabase.auth.getUser();
          if (authError || !auth.user) {
            throw new Error("Please sign in again to manage discovery.");
          }

          const { data: discovery, error: queryError } = await supabase
            .from("rishta_discovery_profiles")
            .select("is_visible")
            .eq("user_id", auth.user.id)
            .maybeSingle();
          if (queryError) throw new Error(queryError.message);

          if (active) {
            setDiscoveryConfigured(Boolean(discovery));
            setDiscoveryVisible(discovery?.is_visible === true);
          }
        } catch {
          if (active) {
            setDiscoveryError(
              "Unable to load Discovery visibility. Reopen this screen to retry.",
            );
          }
        } finally {
          if (active) setCheckingDiscovery(false);
        }
      }

      void loadDiscoveryVisibility();
      return () => {
        active = false;
      };
    }, []),
  );

  async function handleToggleDiscovery(nextVisible: boolean) {
    if (busy || checkingDiscovery || discoveryError) return;

    // Never publish for the first time without the public-profile review.
    if (nextVisible && !discoveryConfigured) {
      router.push("/discovery-settings");
      return;
    }
    if (!discoveryConfigured) return;

    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Please sign in again.");

      const { data: updated, error: updateError } = await supabase
        .from("rishta_discovery_profiles")
        .update({
          is_visible: nextVisible,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", auth.user.id)
        .select("user_id")
        .maybeSingle();

      if (updateError || !updated) {
        throw new Error(
          updateError?.message || "Unable to update Discovery visibility.",
        );
      }
      setDiscoveryVisible(nextVisible);
      setMessage(
        nextVisible
          ? "Your saved public profile is now visible in Discovery."
          : "Your profile is now hidden from Discovery.",
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update Discovery visibility.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handlePickPhoto() {
    if (busy || photoPaths.length >= MAX_PHOTOS) return;
    setError("");
    setMessage("");

    try {
      // On web, open the picker directly in the user's click event.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
        base64: Platform.OS !== "web",
      });
      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
        setError("Maximum allowed photo size is 5 MB.");
        return;
      }

      setBusy(true);
      let imageData: ArrayBuffer;
      let contentType = "image/jpeg";

      if (Platform.OS === "web") {
        if (asset.file) {
          imageData = await asset.file.arrayBuffer();
          contentType = asset.file.type || asset.mimeType || "image/jpeg";
        } else {
          const response = await fetch(asset.uri);
          imageData = await response.arrayBuffer();
          contentType = asset.mimeType || "image/jpeg";
        }
      } else {
        if (!asset.base64) throw new Error("Could not read selected photo.");
        imageData = decode(asset.base64);
        contentType = "image/jpeg";
      }

      if (!allowedTypes.includes(contentType)) {
        setError("Only JPG, PNG, and WebP images are allowed.");
        return;
      }
      if (imageData.byteLength > MAX_FILE_SIZE) {
        setError("Maximum allowed photo size is 5 MB.");
        return;
      }

      const { data: authData, error: authError } =
        await supabase.auth.getUser();
      if (authError || !authData.user) {
        setError("Please sign in again.");
        return;
      }

      const userId = authData.user.id;
      const extension =
        contentType === "image/png"
          ? "png"
          : contentType === "image/webp"
            ? "webp"
            : "jpg";
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}.${extension}`;
      const path = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, imageData, { contentType, upsert: false });
      if (uploadError) throw new Error(uploadError.message);

      const updatedPaths = [...photoPaths, path];
      const { data: updated, error: databaseError } = await supabase
        .from("rishta_profiles")
        .update({
          profile_photo_paths: updatedPaths,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .select("user_id")
        .maybeSingle();

      if (databaseError || !updated) {
        // Roll back the newly uploaded file if saving the path failed.
        await supabase.storage.from(BUCKET).remove([path]);
        throw new Error(
          databaseError?.message || "Could not save the photo to your profile.",
        );
      }

      setPhotoPaths(updatedPaths);
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 600);
      if (signed?.signedUrl) {
        setPhotoUrls((current) => ({ ...current, [path]: signed.signedUrl }));
        setMessage("Photo uploaded successfully!");
      } else {
        setMessage("Photo saved. Reopen this page to refresh the preview.");
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to upload photo.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleRemovePhoto(path: string) {
    if (busy) return;
    setError("");
    setMessage("");
    setBusy(true);

    try {
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError || !data.user) throw new Error("Please sign in again.");
      if (!path.startsWith(`${data.user.id}/`)) {
        throw new Error("Invalid photo path.");
      }

      const updatedPaths = photoPaths.filter((item) => item !== path);
      const { data: updated, error: databaseError } = await supabase
        .from("rishta_profiles")
        .update({
          profile_photo_paths: updatedPaths,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", data.user.id)
        .select("user_id")
        .maybeSingle();
      if (databaseError || !updated) {
        throw new Error(
          databaseError?.message || "Unable to update profile photos.",
        );
      }

      setPhotoPaths(updatedPaths);
      setPhotoUrls((current) => {
        const next = { ...current };
        delete next[path];
        return next;
      });

      const { error: removeError } = await supabase.storage
        .from(BUCKET)
        .remove([path]);
      if (removeError) {
        setError("Photo removed from profile, but storage cleanup failed.");
      } else {
        setMessage("Photo removed successfully.");
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to remove photo.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveSettings() {
    if (busy) return;
    setError("");
    setMessage("");
    setBusy(true);

    try {
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError || !data.user) throw new Error("Please sign in again.");

      const { data: updated, error: databaseError } = await supabase
        .from("rishta_profiles")
        .update({
          photo_visibility: "private",
          show_age: showAge,
          show_city: showCity,
          profile_step: 4,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", data.user.id)
        .select("user_id")
        .maybeSingle();

      if (databaseError || !updated) {
        throw new Error(
          databaseError?.message || "Could not save privacy settings.",
        );
      }
      setCompleted(true);
      setMessage("Profile setup completed successfully!");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save settings.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.loadingHeart}>♡</Text>
        <ActivityIndicator size="large" color={C.emeraldBright} />
        <Text style={styles.loadingText}>Loading profile photos...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.wrapper}>
            <View pointerEvents="none" style={styles.topGlow} />
            <View pointerEvents="none" style={styles.goldArch} />

            {/* Header */}
            <View style={styles.topBar}>
              <Pressable
                style={styles.backButton}
                accessibilityRole="button"
                accessibilityLabel="Back to Partner Preferences"
                onPress={() => router.replace("/partner-preferences")}
              >
                <Text style={styles.backArrow}>←</Text>
              </Pressable>
              <View style={styles.brandRow}>
                <Text style={styles.brandHeart}>♡</Text>
                <Text style={styles.brandName}>
                  Rishta <Text style={styles.brandGold}>App</Text>
                </Text>
              </View>
              <Text style={styles.stepBadge}>4 / 4</Text>
            </View>

            {/* Progress */}
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>PROFILE SETUP</Text>
                <Text style={styles.progressText}>STEP 4 OF 4</Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: completed ? "100%" : "75%" },
                  ]}
                />
              </View>
              <Text style={styles.progressNote}>
                {completed ? "Setup Complete" : "Photos & Privacy"}
              </Text>
            </View>

            {/* Intro */}
            <View style={styles.hero}>
              <View style={styles.ornamentRow}>
                <View style={styles.ornamentLine} />
                <Text style={styles.ornament}>✦ ❦ ✦</Text>
                <View style={styles.ornamentLine} />
              </View>
              <Text style={styles.title}>Photos & Privacy</Text>
              <Text style={styles.subtitle}>
                Add your profile photos and choose what to share. Your photos
                are stored privately.
              </Text>
              <View style={styles.heartDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerHeart}>♡</Text>
                <View style={styles.dividerLine} />
              </View>
            </View>

            {/* Private photo upload */}
            <View style={styles.card}>
              <View style={styles.cardHeading}>
                <View style={styles.cardHeadingIcon}>
                  <Text style={styles.cardIconText}>▧</Text>
                </View>
                <View style={styles.cardHeadingText}>
                  <Text style={styles.sectionTitle}>Profile Photos</Text>
                  <Text style={styles.sectionSubtitle}>
                    Choose photos you would like to keep on your profile.
                  </Text>
                </View>
              </View>

              <View style={styles.photoCountRow}>
                <Text style={styles.photoCount}>
                  {photoPaths.length} / 5 Photos
                </Text>
                <Text style={styles.optionalBadge}>PRIVATE STORAGE</Text>
              </View>
              <Text style={styles.helper}>
                JPG, PNG or WebP. Maximum 5 MB per photo. Up to 5 photos.
              </Text>

              <View style={styles.photoGrid}>
                {photoPaths.map((path, index) => (
                  <View key={path} style={styles.photoCard}>
                    {photoUrls[path] ? (
                      <Image
                        source={{ uri: photoUrls[path] }}
                        style={styles.photo}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.noPreview}>
                        <Text style={styles.emptyPhotoIcon}>▧</Text>
                        <Text style={styles.emptyPhotoText}>
                          Preview unavailable
                        </Text>
                      </View>
                    )}
                    <Text style={styles.photoNumber}>Photo {index + 1}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove photo ${index + 1}`}
                      disabled={busy}
                      onPress={() => void handleRemovePhoto(path)}
                      style={({ pressed }) => [
                        styles.removeButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.removeText}>Remove Photo</Text>
                    </Pressable>
                  </View>
                ))}

                {photoPaths.length < MAX_PHOTOS ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Add photo"
                    disabled={busy}
                    onPress={() => void handlePickPhoto()}
                    style={({ pressed }) => [
                      styles.addPhotoTile,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.addPhotoPlus}>＋</Text>
                    <Text style={styles.addPhotoTitle}>Add Photo</Text>
                    <Text style={styles.addPhotoHint}>Choose image</Text>
                  </Pressable>
                ) : null}
              </View>

              <ActionButton
                title={
                  photoPaths.length >= MAX_PHOTOS
                    ? "Maximum 5 Photos Added"
                    : busy
                      ? "Please Wait..."
                      : "＋  Add Photo"
                }
                onPress={() => void handlePickPhoto()}
                disabled={busy || photoPaths.length >= MAX_PHOTOS}
                loading={busy}
              />

              <View style={styles.privacyNote}>
                <Text style={styles.noteIcon}>♡</Text>
                <Text style={styles.noteText}>
                  Photos stay in a private storage bucket. Showing your profile
                  in Discovery does not make its photos public.
                </Text>
              </View>
            </View>

            {/* Privacy controls */}
            <View style={styles.card}>
              <View style={styles.cardHeading}>
                <View style={styles.cardHeadingIcon}>
                  <Text style={styles.cardIconText}>♢</Text>
                </View>
                <View style={styles.cardHeadingText}>
                  <Text style={styles.sectionTitle}>Privacy Settings</Text>
                  <Text style={styles.sectionSubtitle}>
                    Decide how your profile details are shared.
                  </Text>
                </View>
              </View>

              <View style={styles.privateStatus}>
                <Text style={styles.privateStatusIcon}>♧</Text>
                <View style={styles.privateStatusText}>
                  <Text style={styles.privateStatusTitle}>
                    Photo Visibility: Private
                  </Text>
                  <Text style={styles.helper}>
                    Photos are not displayed in public Discovery. Access is
                    controlled by your existing match-privacy rules.
                  </Text>
                </View>
              </View>

              <ToggleRow
                title="Show My Age"
                description="Choose whether your age can be shown in your profile."
                value={showAge}
                disabled={busy}
                onValueChange={(value) => {
                  setShowAge(value);
                  setCompleted(false);
                  setMessage("");
                }}
              />
              <ToggleRow
                title="Show My City"
                description="Choose whether your city can be shown in your profile."
                value={showCity}
                disabled={busy}
                onValueChange={(value) => {
                  setShowCity(value);
                  setCompleted(false);
                  setMessage("");
                }}
              />

              {completed ? (
                <View style={styles.discoverySection}>
                  <ToggleRow
                    title="Show My Profile in Discovery"
                    description="Turn OFF to hide your public profile. Photos remain private."
                    value={discoveryVisible}
                    disabled={
                      busy || checkingDiscovery || Boolean(discoveryError)
                    }
                    onValueChange={(value) => void handleToggleDiscovery(value)}
                  />
                  {checkingDiscovery ? (
                    <Text style={styles.helper}>Checking visibility...</Text>
                  ) : null}
                  {discoveryError ? (
                    <Text style={styles.errorText}>{discoveryError}</Text>
                  ) : null}
                  {!discoveryConfigured ? (
                    <Text style={styles.helper}>
                      First-time publishing opens a public-profile review so you
                      can approve what will be shared.
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText} accessibilityRole="alert">
                    {error}
                  </Text>
                </View>
              ) : null}
              {message ? (
                <View style={styles.successBox}>
                  <Text style={styles.successText} accessibilityRole="alert">
                    ✓ {message}
                  </Text>
                </View>
              ) : null}

              <ActionButton
                title={
                  completed
                    ? "Save Privacy Settings  →"
                    : "Complete Profile Setup  →"
                }
                onPress={() => void handleSaveSettings()}
                loading={busy}
              />

              {completed ? (
                <>
                  <ActionButton
                    title="Review Public Profile & Sharing"
                    secondary
                    onPress={() => router.push("/discovery-settings")}
                  />
                  <ActionButton
                    title="Back to Dashboard  →"
                    secondary
                    onPress={() => router.replace("/dashboard")}
                  />
                </>
              ) : null}
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace("/partner-preferences")}
              style={styles.backLink}
            >
              <Text style={styles.backLinkText}>
                ← Back to Partner Preferences
              </Text>
            </Pressable>

            <View style={styles.footer}>
              <View style={styles.footerRow}>
                <Text style={styles.footerHeart}>♡</Text>
                <Text style={styles.footerText}>
                  Your privacy matters to us
                </Text>
              </View>
              <Text style={styles.footerWarning}>
                Never upload identity documents or sensitive information.
              </Text>
              <View style={styles.footerOrnament}>
                <View style={styles.footerLine} />
                <Text style={styles.footerFlower}>❦</Text>
                <View style={styles.footerLine} />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centered: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    padding: 24,
  },
  loadingHeart: { color: C.gold, fontSize: 56 },
  loadingText: { color: C.muted, fontSize: 14, textAlign: "center" },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 36,
  },
  wrapper: { width: "100%", maxWidth: 600 },
  topGlow: {
    position: "absolute",
    top: -120,
    left: -130,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#074239",
    opacity: 0.6,
  },
  goldArch: {
    position: "absolute",
    top: 20,
    left: 0,
    right: 0,
    height: 460,
    borderTopLeftRadius: 260,
    borderTopRightRadius: 260,
    borderTopWidth: 1.5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(231,189,121,0.35)",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 27,
  },
  backButton: {
    width: 44,
    height: 44,
    borderWidth: 1.5,
    borderColor: C.gold,
    borderRadius: 13,
    backgroundColor: C.surfaceDark,
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: { color: C.gold, fontSize: 27, lineHeight: 33 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  brandHeart: { color: C.gold, fontSize: 29 },
  brandName: {
    color: C.white,
    fontFamily: serif,
    fontSize: 22,
    fontWeight: "700",
  },
  brandGold: { color: C.gold },
  stepBadge: {
    color: C.goldLight,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.gold,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: "700",
  },
  progressSection: { marginBottom: 28 },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  progressLabel: {
    color: C.gold,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  progressText: { color: C.white, fontSize: 11, fontWeight: "700" },
  progressTrack: {
    height: 8,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: C.emeraldBright },
  progressNote: {
    color: C.muted,
    fontSize: 12,
    marginTop: 10,
    textAlign: "right",
  },
  hero: { alignItems: "center", paddingBottom: 30 },
  ornamentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 15,
  },
  ornamentLine: { width: 30, height: 1, backgroundColor: C.gold },
  ornament: { color: C.gold, fontSize: 21 },
  title: {
    color: C.goldLight,
    fontFamily: serif,
    fontSize: 35,
    lineHeight: 44,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    color: C.white,
    fontFamily: serif,
    fontSize: 15,
    lineHeight: 25,
    textAlign: "center",
    marginTop: 12,
    maxWidth: 420,
  },
  heartDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    marginTop: 20,
  },
  dividerLine: { width: 65, height: 1, backgroundColor: C.gold },
  dividerHeart: { color: C.goldLight, fontSize: 32 },
  card: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 24,
    padding: 20,
    gap: 20,
    marginBottom: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 3,
  },
  cardHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  cardHeadingIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: C.surfaceDark,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cardIconText: { color: C.gold, fontSize: 27 },
  cardHeadingText: { flex: 1, gap: 5 },
  sectionTitle: {
    color: C.white,
    fontFamily: serif,
    fontSize: 22,
    fontWeight: "700",
  },
  sectionSubtitle: { color: C.muted, fontSize: 12, lineHeight: 19 },
  helper: { color: C.muted, fontSize: 12, lineHeight: 20 },
  photoCountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
  photoCount: { color: C.goldLight, fontSize: 15, fontWeight: "800" },
  optionalBadge: {
    color: C.success,
    fontSize: 10,
    fontWeight: "700",
    borderWidth: 1,
    borderColor: C.emeraldBright,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  photoCard: {
    width: "47%",
    borderWidth: 1.5,
    borderColor: C.gold,
    borderRadius: 15,
    backgroundColor: C.surfaceDark,
    overflow: "hidden",
  },
  photo: { width: "100%", height: 150 },
  noPreview: {
    height: 150,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  emptyPhotoIcon: { color: C.gold, fontSize: 31 },
  emptyPhotoText: { color: C.muted, textAlign: "center", fontSize: 12 },
  photoNumber: {
    color: C.goldLight,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    paddingTop: 10,
  },
  removeButton: { alignItems: "center", paddingVertical: 12 },
  removeText: { color: C.error, fontSize: 13, fontWeight: "700" },
  addPhotoTile: {
    width: "47%",
    minHeight: 205,
    borderRadius: 15,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: C.emeraldBright,
    backgroundColor: C.surfaceDark,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    gap: 7,
  },
  addPhotoPlus: { color: C.gold, fontSize: 38 },
  addPhotoTitle: { color: C.white, fontSize: 16, fontWeight: "700" },
  addPhotoHint: { color: C.muted, fontSize: 11 },
  privacyNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 13,
    backgroundColor: C.surfaceDark,
    padding: 14,
  },
  noteIcon: { color: C.gold, fontSize: 24 },
  noteText: { flex: 1, color: C.muted, fontSize: 12, lineHeight: 21 },
  privateStatus: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#083E31",
    borderWidth: 1,
    borderColor: C.emeraldBright,
    padding: 15,
    borderRadius: 14,
  },
  privateStatusIcon: { color: C.goldLight, fontSize: 26 },
  privateStatusText: { flex: 1, gap: 7 },
  privateStatusTitle: { color: C.success, fontSize: 15, fontWeight: "800" },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  settingText: { flex: 1, gap: 5 },
  settingTitle: { color: C.goldLight, fontSize: 16, fontWeight: "700" },
  discoverySection: { gap: 8 },
  errorBox: {
    backgroundColor: "#30252A",
    borderWidth: 1,
    borderColor: "#B75A64",
    borderRadius: 12,
    padding: 14,
  },
  errorText: { color: C.error, fontSize: 13, lineHeight: 21 },
  successBox: {
    backgroundColor: "#083E31",
    borderWidth: 1,
    borderColor: C.emeraldBright,
    borderRadius: 12,
    padding: 14,
  },
  successText: {
    color: C.success,
    fontSize: 13,
    lineHeight: 21,
    fontWeight: "700",
  },
  primaryButton: {
    minHeight: 59,
    width: "100%",
    backgroundColor: C.emerald,
    borderWidth: 2,
    borderColor: C.emeraldBright,
    borderRadius: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 12,
  },
  primaryButtonText: {
    color: C.white,
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  secondaryButton: { backgroundColor: "transparent", borderColor: C.gold },
  secondaryButtonText: { color: C.goldLight },
  pressed: { opacity: 0.7 },
  backLink: { alignItems: "center", paddingVertical: 14 },
  backLinkText: {
    color: C.goldLight,
    fontSize: 14,
    fontWeight: "700",
    textDecorationLine: "underline",
    textAlign: "center",
  },
  footer: { alignItems: "center", paddingTop: 18, gap: 14 },
  footerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  footerHeart: { color: C.gold, fontSize: 23 },
  footerText: { color: C.muted, fontSize: 12 },
  footerWarning: {
    color: C.muted,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 19,
  },
  footerOrnament: { flexDirection: "row", alignItems: "center", gap: 14 },
  footerLine: { width: 70, height: 1, backgroundColor: C.gold },
  footerFlower: { color: C.gold, fontSize: 25 },
});
