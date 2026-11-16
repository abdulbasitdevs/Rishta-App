import { decode } from "base64-arraybuffer";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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

import { AppButton } from "@/components/ui/AppButton";
import { supabase } from "@/lib/supabase";
import { theme } from "@/theme/tokens";

const { colors, spacing, radius } = theme;

// Must match the exact bucket ID in Supabase Storage.
const BUCKET = "Rishta-profile-photos";
const MAX_PHOTOS = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

export default function ProfilePhotosScreen() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);

  const [photoPaths, setPhotoPaths] = useState<string[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  const [showAge, setShowAge] = useState(false);
  const [showCity, setShowCity] = useState(false);

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

        const paths: string[] = profile.profile_photo_paths ?? [];

        setPhotoPaths(paths);
        setShowAge(profile.show_age ?? false);
        setShowCity(profile.show_city ?? false);
        setCompleted(profile.profile_step >= 4);

        const urls: Record<string, string> = {};

        for (const path of paths) {
          const { data: signed } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(path, 600);

          if (signed?.signedUrl) {
            urls[path] = signed.signedUrl;
          }
        }

        if (active) setPhotoUrls(urls);
      } catch {
        if (active) {
          setError("Unable to load your photos.");
        }
      } finally {
        if (active) setChecking(false);
      }
    }

    void loadProfile();

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.replace("/login");
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  async function handlePickPhoto() {
    if (busy || photoPaths.length >= MAX_PHOTOS) return;

    setError("");
    setMessage("");

    try {
      // On Web, picker must open directly from the click.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
        base64: Platform.OS !== "web",
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

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
        if (!asset.base64) {
          throw new Error("Could not read selected photo.");
        }

        // Expo ImagePicker base64 contains JPEG image data.
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

      // Each user's photos stay in their own folder.
      const path = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, imageData, {
          contentType,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

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
        // Clean up uploaded file if saving its path fails.
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
        setPhotoUrls((current) => ({
          ...current,
          [path]: signed.signedUrl,
        }));
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

      if (authError || !data.user) {
        throw new Error("Please sign in again.");
      }

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

      if (authError || !data.user) {
        throw new Error("Please sign in again.");
      }

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
        <ActivityIndicator size="large" color={colors.primary} />
        <Text>Loading profile photos...</Text>
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
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.wrapper}>
            <Pressable
              style={styles.back}
              onPress={() => router.replace("/partner-preferences")}
            >
              <Text style={styles.backText}>← Partner Preferences</Text>
            </Pressable>

            <View style={styles.progressHeader}>
              <Text style={styles.stepText}>STEP 4 OF 4</Text>
              <Text style={styles.progressText}>
                {completed ? "100%" : "75%"}
              </Text>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: completed ? "100%" : "75%" },
                ]}
              />
            </View>

            <View style={styles.header}>
              <View style={styles.iconBox}>
                <Text style={styles.heart}>♥</Text>
              </View>

              <Text style={styles.title}>Photos & Privacy</Text>

              <Text style={styles.subtitle}>
                Add your profile photos and decide which details you want to
                share.
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Profile Photos</Text>

              <Text style={styles.helper}>
                Add up to 5 photos. JPG, PNG or WebP, maximum 5 MB per photo.
              </Text>

              <Text style={styles.count}>{photoPaths.length} / 5 Photos</Text>

              <View style={styles.photoGrid}>
                {photoPaths.map((path) => (
                  <View key={path} style={styles.photoCard}>
                    {photoUrls[path] ? (
                      <Image
                        source={{ uri: photoUrls[path] }}
                        style={styles.photo}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.noPreview}>
                        <Text style={styles.helper}>Preview unavailable</Text>
                      </View>
                    )}

                    <Pressable
                      style={styles.removeButton}
                      disabled={busy}
                      onPress={() => void handleRemovePhoto(path)}
                    >
                      <Text style={styles.removeText}>Remove</Text>
                    </Pressable>
                  </View>
                ))}
              </View>

              <View style={styles.buttonArea}>
                <AppButton
                  title={
                    photoPaths.length >= MAX_PHOTOS
                      ? "Maximum 5 Photos Added"
                      : busy
                        ? "Please wait..."
                        : "Add Photo"
                  }
                  onPress={handlePickPhoto}
                  disabled={busy || photoPaths.length >= MAX_PHOTOS}
                  loading={busy}
                />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Privacy Settings</Text>

              <Text style={styles.label}>Photo Visibility</Text>

              <View style={styles.privacyBox}>
                <Text style={styles.privacyTitle}>Private — Only You</Text>
                <Text style={styles.helper}>
                  Photos are accessible only to your account. Approved-match
                  access will be added later.
                </Text>
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingText}>
                  <Text style={styles.label}>Show My Age</Text>
                  <Text style={styles.helper}>
                    Preference for future profile visibility.
                  </Text>
                </View>

                <Switch
                  value={showAge}
                  onValueChange={(value) => {
                    setShowAge(value);
                    setCompleted(false);
                    setMessage("");
                  }}
                  trackColor={{
                    true: colors.primary,
                    false: colors.border,
                  }}
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingText}>
                  <Text style={styles.label}>Show My City</Text>
                  <Text style={styles.helper}>
                    Preference for future profile visibility.
                  </Text>
                </View>

                <Switch
                  value={showCity}
                  onValueChange={(value) => {
                    setShowCity(value);
                    setCompleted(false);
                    setMessage("");
                  }}
                  trackColor={{
                    true: colors.primary,
                    false: colors.border,
                  }}
                />
              </View>

              {error ? (
                <Text style={styles.error} accessibilityRole="alert">
                  {error}
                </Text>
              ) : null}

              {message ? (
                <Text style={styles.success} accessibilityRole="alert">
                  {message}
                </Text>
              ) : null}

              <View style={styles.buttonArea}>
                <AppButton
                  title={
                    completed
                      ? "Save Privacy Settings"
                      : "Complete Profile Setup"
                  }
                  onPress={handleSaveSettings}
                  loading={busy}
                  disabled={busy}
                />
              </View>

              {completed ? (
                <>
                  <View style={styles.buttonArea}>
                    <AppButton
                      title="Set Profile Discovery Visibility"
                      onPress={() => router.push("/discovery-settings")}
                    />
                  </View>

                  <View style={styles.buttonArea}>
                    <AppButton
                      title="Back to Dashboard"
                      onPress={() => router.replace("/dashboard")}
                    />
                  </View>
                </>
              ) : null}
            </View>

            <Text style={styles.footer}>
              Your photos remain private. Never upload identity documents or
              sensitive information.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.lg,
  },
  content: {
    padding: spacing.xl,
    flexGrow: 1,
    alignItems: "center",
  },
  wrapper: {
    width: "100%",
    maxWidth: 520,
  },
  back: {
    paddingVertical: spacing.md,
    marginBottom: spacing.xl,
    alignSelf: "flex-start",
  },
  backText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  stepText: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 12,
  },
  progressText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  progressTrack: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSoft,
    overflow: "hidden",
    marginBottom: spacing.xxxl,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xxxl,
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  heart: {
    color: colors.primary,
    fontSize: 42,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.heading,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    color: colors.heading,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: spacing.lg,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  helper: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 20,
  },
  count: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700",
    marginVertical: spacing.lg,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  photoCard: {
    width: "46%",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.surfaceSoft,
  },
  photo: {
    width: "100%",
    height: 150,
  },
  noPreview: {
    height: 150,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md,
  },
  removeButton: {
    padding: spacing.md,
    alignItems: "center",
  },
  removeText: {
    color: colors.error,
    fontWeight: "600",
    fontSize: 13,
  },
  buttonArea: {
    marginTop: spacing.lg,
  },
  privacyBox: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  privacyTitle: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 15,
    marginBottom: spacing.sm,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  settingText: {
    flex: 1,
  },
  error: {
    color: colors.error,
    fontSize: 13,
    lineHeight: 21,
    marginTop: spacing.lg,
  },
  success: {
    color: colors.success,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.lg,
  },
  footer: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: spacing.xxxl,
  },
});
