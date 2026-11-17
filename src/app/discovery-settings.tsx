import { useRouter } from "expo-router";
import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "@/lib/supabase";
// Shared premium design tokens from the other Rishta App screens.
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

type ActionButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  secondary?: boolean;
  danger?: boolean;
};

function ActionButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  secondary = false,
  danger = false,
}: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading || disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        secondary && styles.secondaryButton,
        danger && styles.dangerButton,
        (pressed || loading || disabled) && styles.pressed,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={C.white} /> : null}
      <Text
        style={[
          styles.primaryButtonText,
          secondary && styles.secondaryButtonText,
          danger && styles.dangerButtonText,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

function PreviewDetail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.previewRow}>
      <Text style={styles.previewRowLabel}>{label}</Text>
      <Text style={styles.previewRowValue}>{value}</Text>
    </View>
  );
}

type BasicProfile = {
  full_name: string;
  gender: string;
  education_level: string | null;
  profession: string | null;
  profile_step: number;
  faith_category: string | null;
  muslim_sect: string | null;
};

export default function DiscoverySettingsScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const [shareReligion, setShareReligion] = useState(false);
  const [shareSect, setShareSect] = useState(false);

  const [profile, setProfile] = useState<BasicProfile | null>(null);
  const [displayName, setDisplayName] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        const { data, error: authError } = await supabase.auth.getUser();

        if (!active) return;

        if (authError || !data.user) {
          router.replace("/login");
          return;
        }

        const { data: basic, error: basicError } = await supabase
          .from("rishta_profiles")

          .select(
            "full_name, gender, education_level, profession, profile_step, faith_category, muslim_sect",
          )

          .eq("user_id", data.user.id)
          .maybeSingle();

        if (!active) return;

        if (basicError) {
          setError(basicError.message);
          return;
        }

        if (!basic || basic.profile_step < 4) {
          router.replace("/profile-photos");
          return;
        }

        setProfile(basic);

        // Default to first name, not full name.
        const firstName = basic.full_name.trim().split(/\s+/)[0];

        setDisplayName(firstName);

        const { data: discovery, error: discoveryError } = await supabase
          .from("rishta_discovery_profiles")

          .select("display_name, is_visible, faith_category, muslim_sect")

          .eq("user_id", data.user.id)
          .maybeSingle();

        if (!active) return;

        if (discoveryError) {
          setError(discoveryError.message);
          return;
        }

        if (discovery) {
          setDisplayName(discovery.display_name);
          setIsVisible(discovery.is_visible);

          setShareReligion(Boolean(discovery.faith_category));
          setShareSect(Boolean(discovery.muslim_sect));
        }
      } catch {
        if (active) {
          setError("Unable to load discovery settings.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSettings();

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

  async function handlePublish() {
    if (saving || !profile) return;

    setError("");
    setMessage("");

    const cleanName = displayName.trim();

    if (cleanName.length < 2 || cleanName.length > 60) {
      setError("Display name must be 2 to 60 characters.");
      return;
    }

    setSaving(true);

    try {
      const { data, error: authError } = await supabase.auth.getUser();

      if (authError || !data.user) {
        throw new Error("Please sign in again.");
      }

      const { data: updated, error: saveError } = await supabase
        .from("rishta_discovery_profiles")
        .upsert(
          {
            user_id: data.user.id,
            display_name: cleanName,
            gender: profile.gender,
            education_level: profile.education_level,
            profession: profile.profession,
            age: null,
            city: null,

            is_visible: true,

            faith_category:
              shareReligion &&
              profile.faith_category &&
              profile.faith_category !== "Prefer not to say"
                ? profile.faith_category
                : null,

            muslim_sect:
              shareReligion &&
              shareSect &&
              profile.faith_category === "Muslim" &&
              profile.muslim_sect &&
              profile.muslim_sect !== "Prefer not to say"
                ? profile.muslim_sect
                : null,

            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        )
        .select("user_id")
        .maybeSingle();

      if (saveError || !updated) {
        throw new Error(
          saveError?.message || "Unable to publish your profile.",
        );
      }

      setIsVisible(true);
      setMessage("Your profile is now visible in discovery!");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to publish profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleHide() {
    if (saving) return;

    setError("");
    setMessage("");
    setSaving(true);

    try {
      const { data, error: authError } = await supabase.auth.getUser();

      if (authError || !data.user) {
        throw new Error("Please sign in again.");
      }

      const { data: updated, error: saveError } = await supabase
        .from("rishta_discovery_profiles")
        .update({
          is_visible: false,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", data.user.id)
        .select("user_id")
        .maybeSingle();

      if (saveError || !updated) {
        throw new Error(saveError?.message || "Unable to hide your profile.");
      }

      setIsVisible(false);
      setMessage("Your profile is hidden from discovery.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to hide profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.loadingHeart}>♡</Text>
        <Text style={styles.loadingBrand}>
          Rishta <Text style={styles.brandGold}>App</Text>
        </Text>
        <ActivityIndicator size="large" color={C.emeraldBright} />
        <Text style={styles.loadingText}>Loading discovery settings...</Text>
      </SafeAreaView>
    );
  }

  const canShareReligion =
    Boolean(profile?.faith_category) &&
    profile?.faith_category !== "Prefer not to say";

  const canShareSect =
    canShareReligion &&
    profile?.faith_category === "Muslim" &&
    Boolean(profile?.muslim_sect) &&
    profile?.muslim_sect !== "Prefer not to say";

  const actualShareReligion = shareReligion && canShareReligion;
  const actualShareSect = actualShareReligion && shareSect && canShareSect;

  const cleanDisplayName = displayName.trim();
  const initial = cleanDisplayName.charAt(0).toUpperCase() || "♡";

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
            {/* Premium decorative background */}
            <View pointerEvents="none" style={styles.topGlow} />
            <View pointerEvents="none" style={styles.goldArch} />

            {/* Navigation */}
            <View style={styles.topBar}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to My Profile"
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && styles.pressed,
                ]}
                onPress={() => router.replace("/my-profile")}
              >
                <Text style={styles.backArrow}>←</Text>
              </Pressable>

              <View style={styles.brandRow}>
                <Text style={styles.brandHeart}>♡</Text>
                <Text style={styles.brandName}>
                  Rishta <Text style={styles.brandGold}>App</Text>
                </Text>
              </View>

              <View style={styles.headerSpacer} />
            </View>

            {/* Page heading */}
            <View style={styles.hero}>
              <View style={styles.ornamentRow}>
                <View style={styles.ornamentLine} />
                <Text style={styles.ornament}>✦ ❦ ✦</Text>
                <View style={styles.ornamentLine} />
              </View>

              <Text style={styles.title}>Profile Discovery</Text>
              <Text style={styles.subtitle}>
                Choose how other members discover your profile. You stay in
                control of what you share.
              </Text>

              <View style={styles.heartDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerHeart}>♡</Text>
                <View style={styles.dividerLine} />
              </View>
            </View>

            {/* Current discovery status */}
            <View style={styles.statusCard}>
              <View
                style={[
                  styles.statusIconBox,
                  isVisible && styles.visibleIconBox,
                ]}
              >
                <Text style={styles.statusIcon}>{isVisible ? "✓" : "♡"}</Text>
              </View>
              <View style={styles.statusCopy}>
                <Text style={styles.statusEyebrow}>DISCOVERY STATUS</Text>
                <Text style={styles.statusTitle}>
                  {isVisible ? "Visible to Members" : "Hidden from Members"}
                </Text>
                <Text style={styles.statusDescription}>
                  {isVisible
                    ? "Your saved public profile can be discovered by other members."
                    : "Other members cannot discover your public profile right now."}
                </Text>
              </View>
            </View>

            {/* Display name */}
            <View style={styles.card}>
              <View style={styles.cardHeading}>
                <View style={styles.cardHeadingIcon}>
                  <Text style={styles.cardIconText}>♙</Text>
                </View>
                <View style={styles.cardHeadingText}>
                  <Text style={styles.sectionTitle}>Your Public Identity</Text>
                  <Text style={styles.sectionSubtitle}>
                    Use a display name instead of your full name.
                  </Text>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Display Name</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.fieldIcon}>♙</Text>
                  <TextInput
                    style={styles.input}
                    value={displayName}
                    onChangeText={(value) => {
                      setDisplayName(value);
                      setMessage("");
                      setError("");
                    }}
                    placeholder="Enter your public display name"
                    placeholderTextColor={C.muted}
                    autoCapitalize="words"
                    maxLength={60}
                    editable={!saving}
                    accessibilityLabel="Public display name"
                  />
                </View>
                <Text style={styles.helper}>
                  Between 2 and 60 characters. Your first name is suggested by
                  default.
                </Text>
              </View>
            </View>

            {/* Religion and firqa controls */}
            {canShareReligion ? (
              <View style={styles.card}>
                <View style={styles.cardHeading}>
                  <View style={styles.cardHeadingIcon}>
                    <Text style={styles.cardIconText}>♢</Text>
                  </View>
                  <View style={styles.cardHeadingText}>
                    <Text style={styles.sectionTitle}>Sharing Preferences</Text>
                    <Text style={styles.sectionSubtitle}>
                      Decide whether to include religion or firqa on your public
                      profile.
                    </Text>
                  </View>
                </View>

                <View style={styles.switchRow}>
                  <View style={styles.switchCopy}>
                    <Text style={styles.switchTitle}>Share Religion</Text>
                    <Text style={styles.switchDetail}>
                      {profile?.faith_category}
                    </Text>
                  </View>
                  <Switch
                    value={shareReligion}
                    disabled={saving}
                    onValueChange={(value) => {
                      setShareReligion(value);
                      if (!value) setShareSect(false);
                      setMessage("");
                      setError("");
                    }}
                    trackColor={{ false: C.border, true: C.emerald }}
                    thumbColor={C.goldLight}
                    accessibilityLabel="Share religion in public profile"
                  />
                </View>

                {shareReligion && canShareSect ? (
                  <View style={styles.switchRow}>
                    <View style={styles.switchCopy}>
                      <Text style={styles.switchTitle}>Share Firqa / Sect</Text>
                      <Text style={styles.switchDetail}>
                        {profile?.muslim_sect}
                      </Text>
                    </View>
                    <Switch
                      value={shareSect}
                      disabled={saving}
                      onValueChange={(value) => {
                        setShareSect(value);
                        setMessage("");
                        setError("");
                      }}
                      trackColor={{ false: C.border, true: C.emerald }}
                      thumbColor={C.goldLight}
                      accessibilityLabel="Share firqa in public profile"
                    />
                  </View>
                ) : null}

                <View style={styles.noteBox}>
                  <Text style={styles.noteIcon}>♡</Text>
                  <Text style={styles.noteText}>
                    Both options are off for a new public profile. Your choices
                    take effect when you publish or update your profile.
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Exactly the data that this form publishes */}
            <View style={styles.card}>
              <View style={styles.cardHeading}>
                <View style={styles.cardHeadingIcon}>
                  <Text style={styles.cardIconText}>✦</Text>
                </View>
                <View style={styles.cardHeadingText}>
                  <Text style={styles.sectionTitle}>
                    Public Profile Preview
                  </Text>
                  <Text style={styles.sectionSubtitle}>
                    Review your details before making your profile visible.
                  </Text>
                </View>
              </View>

              <View style={styles.previewCard}>
                <View style={styles.previewHero}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{initial}</Text>
                  </View>
                  <View style={styles.previewHeroCopy}>
                    <Text style={styles.previewName}>
                      {cleanDisplayName || "Your Name"}
                    </Text>
                    <Text style={styles.previewEyebrow}>PUBLIC PREVIEW</Text>
                  </View>
                </View>

                <View style={styles.previewDivider} />

                <PreviewDetail
                  label="Gender"
                  value={profile?.gender || "Not provided"}
                />
                <PreviewDetail
                  label="Education"
                  value={profile?.education_level || "Not provided"}
                />
                <PreviewDetail
                  label="Profession"
                  value={profile?.profession || "Not provided"}
                />

                {actualShareReligion ? (
                  <PreviewDetail
                    label="Religion"
                    value={profile?.faith_category || "Not provided"}
                  />
                ) : null}

                {actualShareSect ? (
                  <PreviewDetail
                    label="Firqa / Sect"
                    value={profile?.muslim_sect || "Not provided"}
                  />
                ) : null}
              </View>

              <View style={styles.privateInfoBox}>
                <Text style={styles.privateInfoIcon}>♡</Text>
                <Text style={styles.privateInfoText}>
                  Email, exact birth date, city, family introduction, partner
                  preferences and private photos are not published by this
                  screen.
                </Text>
              </View>
            </View>

            {/* Publish, update, and hide controls */}
            <View style={styles.actionCard}>
              <View style={styles.actionHeading}>
                <Text style={styles.actionHeart}>♡</Text>
                <View style={styles.actionCopy}>
                  <Text style={styles.actionTitle}>
                    {isVisible
                      ? "Manage Visibility"
                      : "Ready to Be Discovered?"}
                  </Text>
                  <Text style={styles.actionDescription}>
                    {isVisible
                      ? "Update the details above or hide your public profile."
                      : "Your public profile stays hidden until you choose to publish it."}
                  </Text>
                </View>
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorIcon}>!</Text>
                  <Text style={styles.errorText} accessibilityRole="alert">
                    {error}
                  </Text>
                </View>
              ) : null}

              {message ? (
                <View style={styles.successBox}>
                  <Text style={styles.successIcon}>✓</Text>
                  <Text style={styles.successText} accessibilityRole="alert">
                    {message}
                  </Text>
                </View>
              ) : null}

              <ActionButton
                title={
                  saving
                    ? "Saving..."
                    : isVisible
                      ? "Update Public Profile  →"
                      : "Show My Profile  →"
                }
                onPress={() => void handlePublish()}
                loading={saving}
                disabled={!profile}
              />

              {isVisible ? (
                <ActionButton
                  title="Hide My Profile"
                  onPress={() => void handleHide()}
                  disabled={saving}
                  danger
                />
              ) : null}

              <ActionButton
                title="Back to My Profile"
                secondary
                onPress={() => router.replace("/my-profile")}
              />

              <Pressable
                accessibilityRole="button"
                onPress={() => router.replace("/profile-photos")}
                style={styles.textLink}
              >
                <Text style={styles.textLinkLabel}>
                  ← Photos & Privacy Settings
                </Text>
              </Pressable>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <View style={styles.footerRow}>
                <Text style={styles.footerHeart}>♡</Text>
                <Text style={styles.footerText}>
                  Your privacy matters to us
                </Text>
              </View>
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
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  centered: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 18,
  },
  loadingHeart: {
    color: C.gold,
    fontSize: 55,
  },
  loadingBrand: {
    color: C.white,
    fontSize: 30,
    fontFamily: serif,
    fontWeight: "700",
  },
  loadingText: {
    color: C.muted,
    fontSize: 14,
    textAlign: "center",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 36,
  },
  wrapper: {
    width: "100%",
    maxWidth: 600,
  },
  topGlow: {
    position: "absolute",
    top: -110,
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
    marginBottom: 30,
  },
  backButton: {
    width: 44,
    height: 44,
    borderWidth: 1.5,
    borderColor: C.gold,
    borderRadius: 13,
    backgroundColor: C.surfaceDark,
    justifyContent: "center",
    alignItems: "center",
  },
  backArrow: {
    color: C.gold,
    fontSize: 27,
    lineHeight: 33,
  },
  headerSpacer: {
    width: 44,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  brandHeart: {
    color: C.gold,
    fontSize: 29,
  },
  brandName: {
    color: C.white,
    fontFamily: serif,
    fontSize: 22,
    fontWeight: "700",
  },
  brandGold: {
    color: C.gold,
  },
  hero: {
    alignItems: "center",
    paddingBottom: 29,
  },
  ornamentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 15,
  },
  ornamentLine: {
    width: 30,
    height: 1,
    backgroundColor: C.gold,
  },
  ornament: {
    color: C.gold,
    fontSize: 21,
  },
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
    maxWidth: 430,
    marginTop: 12,
  },
  heartDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    marginTop: 20,
  },
  dividerLine: {
    width: 65,
    height: 1,
    backgroundColor: C.gold,
  },
  dividerHeart: {
    color: C.goldLight,
    fontSize: 32,
  },
  statusCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 23,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 18,
  },
  statusIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: C.surfaceDark,
    borderWidth: 1,
    borderColor: C.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  visibleIconBox: {
    borderColor: C.emeraldBright,
    backgroundColor: "#07473A",
  },
  statusIcon: {
    color: C.goldLight,
    fontSize: 27,
  },
  statusCopy: {
    flex: 1,
    gap: 5,
  },
  statusEyebrow: {
    color: C.gold,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  statusTitle: {
    color: C.white,
    fontFamily: serif,
    fontSize: 20,
    fontWeight: "700",
  },
  statusDescription: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 19,
  },
  card: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 24,
    padding: 20,
    gap: 23,
    marginBottom: 19,
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
    paddingBottom: 14,
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
  cardIconText: {
    color: C.gold,
    fontSize: 27,
  },
  cardHeadingText: {
    flex: 1,
    gap: 4,
  },
  sectionTitle: {
    color: C.white,
    fontFamily: serif,
    fontSize: 22,
    fontWeight: "700",
  },
  sectionSubtitle: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 19,
  },
  fieldGroup: {
    gap: 11,
  },
  label: {
    color: C.goldLight,
    fontSize: 15,
    fontWeight: "700",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    backgroundColor: C.surfaceDark,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 13,
    paddingLeft: 14,
  },
  fieldIcon: {
    color: C.gold,
    fontSize: 23,
    width: 29,
    textAlign: "center",
    marginRight: 9,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 54,
    paddingRight: 12,
    paddingVertical: 10,
    color: C.white,
    fontSize: 15,
  },
  helper: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 20,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  switchCopy: {
    flex: 1,
    gap: 5,
  },
  switchTitle: {
    color: C.white,
    fontSize: 15,
    fontWeight: "700",
  },
  switchDetail: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 19,
  },
  noteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    backgroundColor: C.surfaceDark,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: C.border,
  },
  noteIcon: {
    color: C.gold,
    fontSize: 23,
  },
  noteText: {
    flex: 1,
    color: C.muted,
    fontSize: 12,
    lineHeight: 20,
  },
  previewCard: {
    backgroundColor: C.surfaceDark,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 18,
    gap: 18,
  },
  previewHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: C.emerald,
    borderWidth: 1.5,
    borderColor: C.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: C.goldLight,
    fontFamily: serif,
    fontSize: 28,
    fontWeight: "700",
  },
  previewHeroCopy: {
    flex: 1,
    gap: 5,
  },
  previewName: {
    color: C.goldLight,
    fontFamily: serif,
    fontSize: 24,
    fontWeight: "700",
  },
  previewEyebrow: {
    color: C.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  previewDivider: {
    height: 1,
    backgroundColor: C.border,
    opacity: 0.7,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  previewRowLabel: {
    flex: 1,
    color: C.muted,
    fontSize: 13,
  },
  previewRowValue: {
    flex: 1.5,
    color: C.white,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
  },
  privateInfoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    backgroundColor: C.surfaceDark,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 13,
  },
  privateInfoIcon: {
    color: C.gold,
    fontSize: 23,
  },
  privateInfoText: {
    flex: 1,
    color: C.muted,
    fontSize: 12,
    lineHeight: 20,
  },
  actionCard: {
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 24,
    padding: 20,
    gap: 18,
  },
  actionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionHeart: {
    color: C.gold,
    fontSize: 35,
  },
  actionCopy: {
    flex: 1,
    gap: 5,
  },
  actionTitle: {
    color: C.white,
    fontFamily: serif,
    fontSize: 22,
    fontWeight: "700",
  },
  actionDescription: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 20,
  },
  primaryButton: {
    width: "100%",
    minHeight: 60,
    backgroundColor: C.emerald,
    borderWidth: 2,
    borderColor: C.emeraldBright,
    borderRadius: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 10,
  },
  primaryButtonText: {
    color: C.white,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderColor: C.gold,
  },
  secondaryButtonText: {
    color: C.goldLight,
  },
  dangerButton: {
    backgroundColor: "#281D23",
    borderColor: "#B75A64",
  },
  dangerButtonText: {
    color: C.error,
  },
  pressed: {
    opacity: 0.7,
  },
  textLink: {
    paddingVertical: 12,
    alignItems: "center",
  },
  textLinkLabel: {
    color: C.goldLight,
    fontSize: 14,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#B75A64",
    borderRadius: 12,
    backgroundColor: "#30252A",
  },
  errorIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.error,
    color: C.error,
    fontWeight: "800",
    lineHeight: 20,
    textAlign: "center",
  },
  errorText: {
    flex: 1,
    color: C.error,
    fontSize: 13,
    lineHeight: 21,
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.emeraldBright,
    borderRadius: 12,
    backgroundColor: "#083E31",
  },
  successIcon: {
    color: C.success,
    fontSize: 24,
    fontWeight: "800",
  },
  successText: {
    flex: 1,
    color: C.success,
    fontSize: 13,
    lineHeight: 21,
  },
  footer: {
    alignItems: "center",
    paddingTop: 32,
    gap: 24,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  footerHeart: {
    color: C.gold,
    fontSize: 24,
  },
  footerText: {
    color: C.muted,
    fontSize: 12,
  },
  footerOrnament: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  footerLine: {
    width: 70,
    height: 1,
    backgroundColor: C.gold,
  },
  footerFlower: {
    color: C.gold,
    fontSize: 25,
  },
});
