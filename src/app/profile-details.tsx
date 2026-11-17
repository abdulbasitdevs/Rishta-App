import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "@/lib/supabase";

// Same premium colors as Step 1 and Dashboard.
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

const educationOptions = [
  "Matric / SSC",
  "Intermediate / HSSC",
  "Diploma",
  "Bachelor's",
  "Master's",
  "MPhil",
  "PhD",
  "Other",
];

const religionOptions = [
  "Muslim",
  "Christian",
  "Hindu",
  "Sikh",
  "Other",
  "Prefer not to say",
];

const sectOptions = [
  "Ahl-e-Hadith",
  "Barelvi",
  "Deobandi",
  "Shia",
  "Other",
  "Prefer not to say",
];

type ChoiceGroupProps = {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  disabled?: boolean;
};

function ChoiceGroup({
  options,
  selected,
  onSelect,
  disabled = false,
}: ChoiceGroupProps) {
  return (
    <View style={styles.optionsContainer}>
      {options.map((option) => {
        const isSelected = selected === option;

        return (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{
              checked: isSelected,
              disabled,
            }}
            disabled={disabled}
            onPress={() => onSelect(option)}
            style={({ pressed }) => [
              styles.option,
              isSelected && styles.optionSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.optionText,
                isSelected && styles.optionTextSelected,
              ]}
            >
              {isSelected ? "✓  " : ""}
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

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

export default function ProfileDetailsScreen() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  const [loading, setLoading] = useState(false);

  const [education, setEducation] = useState("");
  const [profession, setProfession] = useState("");
  const [height, setHeight] = useState("");
  const [religion, setReligion] = useState("");
  const [muslimSect, setMuslimSect] = useState("");
  const [familyOverview, setFamilyOverview] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);

  const [highestStep, setHighestStep] = useState(1);

  // Load current user and saved profile.
  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const { data, error: authError } = await supabase.auth.getUser();

        if (!active) return;

        if (authError || !data.user) {
          if (
            authError &&
            !["session_not_found", "bad_jwt"].includes(authError.code ?? "")
          ) {
            setError("Unable to verify your account. Please try again.");
            return;
          }

          router.replace("/login");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("rishta_profiles")
          .select(
            "education_level, profession, height_cm, religion, faith_category, muslim_sect, family_overview, profile_step",
          )
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

        setEducation(profile.education_level ?? "");
        setProfession(profile.profession ?? "");

        setHeight(profile.height_cm != null ? String(profile.height_cm) : "");

        const savedReligion = profile.faith_category ?? profile.religion ?? "";

        setReligion(
          religionOptions.includes(savedReligion) ? savedReligion : "",
        );

        setMuslimSect(profile.muslim_sect ?? "");

        setFamilyOverview(profile.family_overview ?? "");

        const completedStep =
          typeof profile.profile_step === "number" ? profile.profile_step : 1;

        setHighestStep(completedStep);
        setSaved(completedStep >= 2);
        setAuthenticated(true);
      } catch {
        if (active) {
          setError("Unable to load profile. Please try again.");
        }
      } finally {
        if (active) {
          setChecking(false);
        }
      }
    }

    void loadProfile();

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (!active) return;

      if (event === "SIGNED_OUT") {
        setAuthenticated(false);
        router.replace("/login");
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  // Reset save status when a field changes.
  function markUnsaved() {
    setSaved(false);
    setMessage("");
    setError("");
  }

  // Validate and save to Supabase.
  async function handleSave() {
    if (loading || !authenticated) return;

    setError("");
    setMessage("");

    if (!education) {
      setError("Please select your education.");
      return;
    }

    const cleanProfession = profession.trim();

    if (cleanProfession.length < 2 || cleanProfession.length > 100) {
      setError("Please enter a valid profession.");
      return;
    }

    const trimmedHeight = height.trim();

    const heightValue = trimmedHeight ? Number(trimmedHeight) : null;

    if (
      heightValue !== null &&
      (!/^\d+$/.test(trimmedHeight) || heightValue < 100 || heightValue > 230)
    ) {
      setError("Height must be between 100 and 230 cm.");
      return;
    }

    const cleanReligion = religion.trim();
    const cleanFamily = familyOverview.trim();

    if (
      cleanReligion &&
      (cleanReligion.length < 2 || cleanReligion.length > 80)
    ) {
      setError("Please enter a valid religion or leave it blank.");
      return;
    }

    if (cleanFamily.length > 600) {
      setError("Family introduction is too long.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.getUser();

      if (authError || !data.user) {
        setError("Please sign in again.");
        return;
      }

      // Never reduce progress if a later
      // profile step has already been completed.
      const nextStep = Math.max(highestStep, 2);

      const { data: updated, error: saveError } = await supabase
        .from("rishta_profiles")
        .update({
          education_level: education,
          profession: cleanProfession,
          height_cm: heightValue,

          religion:
            cleanReligion && cleanReligion !== "Prefer not to say"
              ? cleanReligion
              : null,

          faith_category: cleanReligion || null,

          muslim_sect: cleanReligion === "Muslim" ? muslimSect || null : null,

          family_overview: cleanFamily || null,
          profile_step: nextStep,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", data.user.id)
        .select("user_id")
        .maybeSingle();

      if (saveError) {
        setError(saveError.message);
        return;
      }

      if (!updated) {
        setError("Basic profile was not found. Please complete Step 1 first.");
        return;
      }

      setHighestStep(nextStep);
      setSaved(true);

      setMessage("Personal & Family Details saved successfully!");
    } catch {
      setError("Unable to save details. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const stepProgress = saved ? "50%" : "25%";

  // Loading state
  if (checking) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.loadingHeart}>♡</Text>

        <Text style={styles.loadingBrand}>
          Rishta <Text style={styles.brandGold}>App</Text>
        </Text>

        <ActivityIndicator size="large" color={C.emeraldBright} />

        <Text style={styles.loadingText}>Loading your profile...</Text>
      </SafeAreaView>
    );
  }

  if (!authenticated) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.loadingHeart}>♡</Text>

        <Text style={styles.errorText} accessibilityRole="alert">
          {error || "Opening login..."}
        </Text>

        {error ? (
          <View style={styles.errorAction}>
            <ActionButton
              title="Back to Dashboard →"
              onPress={() => router.replace("/dashboard")}
            />
          </View>
        ) : (
          <ActivityIndicator color={C.emeraldBright} />
        )}
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
            {/* Decorative background */}
            <View pointerEvents="none" style={styles.topGlow} />

            <View pointerEvents="none" style={styles.goldArch} />

            {/* Top Header */}
            <View style={styles.topBar}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to Basic Information"
                onPress={() => router.replace("/profile-setup")}
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.backArrow}>←</Text>
              </Pressable>

              <View style={styles.brandRow}>
                <Text style={styles.brandHeart}>♡</Text>

                <Text style={styles.brandName}>
                  Rishta <Text style={styles.brandGold}>App</Text>
                </Text>
              </View>

              <Text style={styles.stepBadge}>2 / 4</Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>PROFILE SETUP</Text>

                <Text style={styles.progressText}>STEP 2 OF 4</Text>
              </View>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: stepProgress }]} />
              </View>

              <Text style={styles.progressNote}>
                {saved ? "Step 2 Saved" : "Personal & Family Details"}
              </Text>
            </View>

            {/* Page Hero */}
            <View style={styles.hero}>
              <View style={styles.ornamentRow}>
                <View style={styles.ornamentLine} />

                <Text style={styles.ornament}>✦ ❦ ✦</Text>

                <View style={styles.ornamentLine} />
              </View>

              <Text style={styles.title}>Personal & Family Details</Text>

              <Text style={styles.subtitle}>
                Share a little more about yourself and your background.
              </Text>

              <View style={styles.heartDivider}>
                <View style={styles.dividerLine} />

                <Text style={styles.dividerHeart}>♡</Text>

                <View style={styles.dividerLine} />
              </View>
            </View>

            {/* Education & Career Card */}
            <View style={styles.card}>
              <View style={styles.cardHeading}>
                <View style={styles.cardHeadingIcon}>
                  <Text style={styles.cardIconText}>✦</Text>
                </View>

                <View style={styles.cardHeadingText}>
                  <Text style={styles.sectionTitle}>Education & Career</Text>

                  <Text style={styles.sectionSubtitle}>
                    Tell us about your academic and professional background.
                  </Text>
                </View>
              </View>

              {/* Education */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                  Highest Education <Text style={styles.required}>*</Text>
                </Text>

                <ChoiceGroup
                  options={educationOptions}
                  selected={education}
                  disabled={loading}
                  onSelect={(value) => {
                    setEducation(value);
                    markUnsaved();
                  }}
                />
              </View>

              {/* Profession */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                  Profession <Text style={styles.required}>*</Text>
                </Text>

                <View style={styles.inputContainer}>
                  <Text style={styles.fieldIcon}>♙</Text>

                  <TextInput
                    style={styles.input}
                    placeholder="Software Engineer, Teacher..."
                    placeholderTextColor={C.muted}
                    value={profession}
                    onChangeText={(value) => {
                      setProfession(value);
                      markUnsaved();
                    }}
                    editable={!loading}
                    maxLength={100}
                    autoCapitalize="words"
                    accessibilityLabel="Profession"
                  />
                </View>

                <Text style={styles.helper}>
                  Enter your current profession or occupation.
                </Text>
              </View>

              {/* Height */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Height</Text>

                  <Text style={styles.optionalBadge}>OPTIONAL</Text>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.fieldIcon}>◇</Text>

                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 170"
                    placeholderTextColor={C.muted}
                    keyboardType="number-pad"
                    maxLength={3}
                    value={height}
                    onChangeText={(value) => {
                      setHeight(value);
                      markUnsaved();
                    }}
                    editable={!loading}
                    accessibilityLabel="Height in centimeters"
                  />

                  <Text style={styles.inputSuffix}>cm</Text>
                </View>

                <Text style={styles.helper}>
                  Height can be between 100 and 230 cm.
                </Text>
              </View>
            </View>

            {/* Family Background Card */}
            <View style={styles.card}>
              <View style={styles.cardHeading}>
                <View style={styles.cardHeadingIcon}>
                  <Text style={styles.cardIconText}>♡</Text>
                </View>

                <View style={styles.cardHeadingText}>
                  <Text style={styles.sectionTitle}>Personal & Family</Text>

                  <Text style={styles.sectionSubtitle}>
                    Background and family introduction.
                  </Text>
                </View>
              </View>

              {/* Religion */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Religion</Text>

                  <Text style={styles.optionalBadge}>OPTIONAL</Text>
                </View>

                <ChoiceGroup
                  options={religionOptions}
                  selected={religion}
                  disabled={loading}
                  onSelect={(value) => {
                    setReligion(value);
                    setMuslimSect("");
                    markUnsaved();
                  }}
                />
              </View>

              {/* Firqa / Sect */}
              {religion === "Muslim" ? (
                <View style={styles.fieldGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>Firqa / Sect</Text>

                    <Text style={styles.optionalBadge}>OPTIONAL</Text>
                  </View>

                  <ChoiceGroup
                    options={sectOptions}
                    selected={muslimSect}
                    disabled={loading}
                    onSelect={(value) => {
                      setMuslimSect(value);
                      markUnsaved();
                    }}
                  />
                </View>
              ) : null}

              {/* Privacy Information */}
              <View style={styles.privacyNote}>
                <Text style={styles.privacyNoteIcon}>♡</Text>

                <Text style={styles.privacyNoteText}>
                  Religion and sect are optional. You can manage their
                  visibility in your discovery privacy settings.
                </Text>
              </View>

              {/* Family Overview */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>About Your Family</Text>

                  <Text style={styles.optionalBadge}>OPTIONAL</Text>
                </View>

                <View style={styles.textareaContainer}>
                  <TextInput
                    style={styles.textarea}
                    placeholder="Tell us a little about your family, values and background..."
                    placeholderTextColor={C.muted}
                    value={familyOverview}
                    onChangeText={(value) => {
                      setFamilyOverview(value);
                      markUnsaved();
                    }}
                    editable={!loading}
                    multiline
                    maxLength={600}
                    textAlignVertical="top"
                    accessibilityLabel="About your family"
                  />
                </View>

                <Text style={styles.characterCount}>
                  {familyOverview.length}/600
                </Text>

                <Text style={styles.helper}>
                  Avoid sharing phone numbers, home addresses or private contact
                  details here.
                </Text>
              </View>
            </View>

            {/* Save / Continue Card */}
            <View style={styles.actionCard}>
              <View style={styles.actionCardHeader}>
                <Text style={styles.actionCardHeart}>♡</Text>

                <View style={styles.actionCardText}>
                  <Text style={styles.actionCardTitle}>
                    {saved ? "Step 2 Completed" : "Save Your Details"}
                  </Text>

                  <Text style={styles.actionCardDescription}>
                    {saved
                      ? "Your details have been saved. You can continue to the next step."
                      : "Save your information to continue building your profile."}
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

              {/* Save button */}
              <ActionButton
                title={
                  loading
                    ? "Saving..."
                    : saved
                      ? "Save Changes"
                      : "Save & Continue  →"
                }
                onPress={() => void handleSave()}
                loading={loading}
              />

              {/* Go to Step 3 */}
              {saved ? (
                <ActionButton
                  title="Continue to Step 3  →"
                  onPress={() => router.push("/partner-preferences")}
                  secondary
                />
              ) : null}

              <Pressable
                accessibilityRole="button"
                onPress={() => router.replace("/profile-setup")}
                style={styles.backLink}
              >
                <Text style={styles.backLinkText}>
                  ← Back to Basic Information
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
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 18,
  },

  errorAction: {
    width: "100%",
    maxWidth: 320,
    marginTop: 15,
  },

  loadingHeart: {
    color: C.gold,
    fontSize: 55,
  },

  loadingBrand: {
    fontFamily: serif,
    fontSize: 30,
    fontWeight: "700",
    color: C.white,
  },

  brandGold: {
    color: C.gold,
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
    paddingBottom: 35,
  },

  wrapper: {
    width: "100%",
    maxWidth: 600,
  },

  // Background decorations
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

  // Header
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
    justifyContent: "center",
    alignItems: "center",
  },

  backArrow: {
    color: C.gold,
    fontSize: 27,
    lineHeight: 33,
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

  // Progress
  progressSection: {
    marginBottom: 28,
  },

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

  progressText: {
    color: C.white,
    fontSize: 11,
    fontWeight: "700",
  },

  progressTrack: {
    height: 8,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: C.emeraldBright,
    borderRadius: 10,
  },

  progressNote: {
    color: C.muted,
    fontSize: 12,
    marginTop: 10,
    textAlign: "right",
  },

  // Hero
  hero: {
    alignItems: "center",
    paddingBottom: 30,
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
    marginTop: 12,
    maxWidth: 400,
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

  // Cards
  card: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 24,
    padding: 20,
    gap: 27,
    marginBottom: 20,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
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

  cardIconText: {
    color: C.gold,
    fontSize: 28,
  },

  cardHeadingText: {
    flex: 1,
    gap: 5,
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

  // Form fields
  fieldGroup: {
    gap: 11,
  },

  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },

  label: {
    color: C.goldLight,
    fontSize: 15,
    fontWeight: "700",
  },

  required: {
    color: C.gold,
  },

  optionalBadge: {
    color: C.muted,
    fontSize: 10,
    fontWeight: "700",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    letterSpacing: 0.4,
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
    marginRight: 9,
    textAlign: "center",
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

  inputSuffix: {
    color: C.gold,
    fontSize: 13,
    fontWeight: "700",
    paddingRight: 16,
  },

  helper: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 20,
  },

  // Selection chips
  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },

  option: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceDark,
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 15,
  },

  optionSelected: {
    borderColor: C.emeraldBright,
    backgroundColor: "#07473A",
  },

  optionText: {
    color: C.muted,
    fontSize: 13,
    fontWeight: "600",
  },

  optionTextSelected: {
    color: C.white,
    fontWeight: "800",
  },

  pressed: {
    opacity: 0.7,
  },

  // Privacy message
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

  privacyNoteIcon: {
    color: C.gold,
    fontSize: 25,
  },

  privacyNoteText: {
    flex: 1,
    color: C.muted,
    fontSize: 12,
    lineHeight: 21,
  },

  // Family introduction
  textareaContainer: {
    backgroundColor: C.surfaceDark,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 13,
    overflow: "hidden",
  },

  textarea: {
    color: C.white,
    fontSize: 15,
    lineHeight: 23,
    minHeight: 135,
    paddingHorizontal: 15,
    paddingVertical: 15,
  },

  characterCount: {
    textAlign: "right",
    color: C.gold,
    fontSize: 12,
    fontWeight: "600",
  },

  // Save card
  actionCard: {
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 24,
    padding: 20,
    gap: 18,
  },

  actionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },

  actionCardHeart: {
    color: C.gold,
    fontSize: 39,
  },

  actionCardText: {
    flex: 1,
    gap: 6,
  },

  actionCardTitle: {
    color: C.white,
    fontFamily: serif,
    fontSize: 23,
    fontWeight: "700",
  },

  actionCardDescription: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 20,
  },

  // Buttons
  primaryButton: {
    minHeight: 60,
    width: "100%",
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

  backLink: {
    alignItems: "center",
    paddingVertical: 11,
  },

  backLinkText: {
    color: C.goldLight,
    fontSize: 14,
    fontWeight: "700",
    textDecorationLine: "underline",
  },

  // Error message
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#30252A",
    borderWidth: 1,
    borderColor: "#B75A64",
    borderRadius: 12,
    padding: 14,
  },

  errorIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.error,
    color: C.error,
    textAlign: "center",
    fontWeight: "800",
    lineHeight: 20,
  },

  errorText: {
    flex: 1,
    color: C.error,
    fontSize: 13,
    lineHeight: 21,
    textAlign: "center",
  },

  // Success message
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#083E31",
    borderWidth: 1,
    borderColor: C.emeraldBright,
    borderRadius: 12,
    padding: 14,
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
    fontWeight: "700",
  },

  // Footer
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
