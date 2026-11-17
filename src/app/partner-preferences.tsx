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

// Same colors used across Rishta App.
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
  "Any",
  "Matric / SSC",
  "Intermediate / HSSC",
  "Diploma",
  "Bachelor's",
  "Master's",
  "MPhil",
  "PhD",
  "Other",
];

const maritalOptions = [
  "Any",
  "Never Married",
  "Divorced",
  "Widowed",
  "Separated",
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

export default function PartnerPreferencesScreen() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [minAge, setMinAge] = useState("22");
  const [maxAge, setMaxAge] = useState("35");
  const [city, setCity] = useState("");

  const [education, setEducation] = useState("Any");
  const [maritalStatus, setMaritalStatus] = useState("Any");

  const [highestStep, setHighestStep] = useState(2);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function markUnsaved() {
    setSaved(false);
    setMessage("");
    setError("");
  }

  // Load saved preferences from Supabase.
  useEffect(() => {
    let active = true;

    async function loadPreferences() {
      try {
        const { data, error: authError } = await supabase.auth.getUser();

        if (!active) return;

        if (authError || !data.user) {
          if (
            authError &&
            !["session_not_found", "bad_jwt"].includes(authError.code ?? "")
          ) {
            setError("Unable to verify your account.");
            return;
          }

          router.replace("/login");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("rishta_profiles")
          .select(
            "profile_step, preferred_age_min, preferred_age_max, preferred_city, preferred_education, preferred_marital_status",
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

        const currentStep =
          typeof profile.profile_step === "number" ? profile.profile_step : 1;

        if (currentStep < 2) {
          router.replace("/profile-details");
          return;
        }

        setHighestStep(currentStep);

        if (profile.preferred_age_min != null) {
          setMinAge(String(profile.preferred_age_min));
        }

        if (profile.preferred_age_max != null) {
          setMaxAge(String(profile.preferred_age_max));
        }

        setCity(profile.preferred_city ?? "");

        setEducation(profile.preferred_education ?? "Any");

        setMaritalStatus(profile.preferred_marital_status ?? "Any");

        setSaved(
          currentStep >= 3 &&
            profile.preferred_age_min != null &&
            profile.preferred_age_max != null,
        );

        setAuthenticated(true);
      } catch {
        if (active) {
          setError("Unable to load preferences. Please try again.");
        }
      } finally {
        if (active) {
          setChecking(false);
        }
      }
    }

    void loadPreferences();

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

  // Validate and save partner preferences.
  async function handleSave() {
    if (saving || !authenticated) return;

    setError("");
    setMessage("");

    const cleanMinAge = minAge.trim();
    const cleanMaxAge = maxAge.trim();
    const cleanCity = city.trim();

    if (!/^\d{1,2}$/.test(cleanMinAge) || !/^\d{1,2}$/.test(cleanMaxAge)) {
      setError("Please enter valid minimum and maximum ages.");
      return;
    }

    const minimum = Number(cleanMinAge);
    const maximum = Number(cleanMaxAge);

    if (minimum < 18 || maximum > 80 || minimum > maximum) {
      setError(
        "Choose an age range between 18 and 80. Minimum age cannot exceed maximum age.",
      );
      return;
    }

    if (cleanCity.length > 120) {
      setError("City name is too long.");
      return;
    }

    setSaving(true);

    try {
      const { data, error: authError } = await supabase.auth.getUser();

      if (authError || !data.user) {
        setError("Please sign in again.");
        return;
      }

      // Preserve progress if Step 4 is already done.
      const nextStep = Math.max(highestStep, 3);

      const { data: updated, error: saveError } = await supabase
        .from("rishta_profiles")
        .update({
          preferred_age_min: minimum,
          preferred_age_max: maximum,
          preferred_city: cleanCity || null,

          preferred_education: education === "Any" ? null : education,

          preferred_marital_status:
            maritalStatus === "Any" ? null : maritalStatus,

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
        setError("Your profile was not found. Please complete earlier steps.");
        return;
      }

      setHighestStep(nextStep);
      setSaved(true);

      setMessage("Partner preferences saved successfully!");
    } catch {
      setError("Unable to save preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const stepProgress = saved ? "75%" : "50%";

  // Loading screen.
  if (checking) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.loadingHeart}>♡</Text>

        <Text style={styles.loadingBrand}>
          Rishta <Text style={styles.brandGold}>App</Text>
        </Text>

        <ActivityIndicator size="large" color={C.emeraldBright} />

        <Text style={styles.loadingText}>Loading preferences...</Text>
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
                accessibilityLabel="Back to Personal and Family Details"
                onPress={() => router.replace("/profile-details")}
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

              <Text style={styles.stepBadge}>3 / 4</Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>PROFILE SETUP</Text>

                <Text style={styles.progressText}>STEP 3 OF 4</Text>
              </View>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: stepProgress }]} />
              </View>

              <Text style={styles.progressNote}>
                {saved ? "Step 3 Saved" : "Partner Preferences"}
              </Text>
            </View>

            {/* Hero Section */}
            <View style={styles.hero}>
              <View style={styles.ornamentRow}>
                <View style={styles.ornamentLine} />

                <Text style={styles.ornament}>✦ ❦ ✦</Text>

                <View style={styles.ornamentLine} />
              </View>

              <Text style={styles.title}>Partner Preferences</Text>

              <Text style={styles.subtitle}>
                Tell us what matters to you in a potential life partner.
              </Text>

              <View style={styles.heartDivider}>
                <View style={styles.dividerLine} />

                <Text style={styles.dividerHeart}>♡</Text>

                <View style={styles.dividerLine} />
              </View>
            </View>

            {/* Preferred Age and City */}
            <View style={styles.card}>
              <View style={styles.cardHeading}>
                <View style={styles.cardHeadingIcon}>
                  <Text style={styles.cardIconText}>♡</Text>
                </View>

                <View style={styles.cardHeadingText}>
                  <Text style={styles.sectionTitle}>Age & Location</Text>

                  <Text style={styles.sectionSubtitle}>
                    Choose the age range and city you prefer.
                  </Text>
                </View>
              </View>

              {/* Age Range */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                  Preferred Age Range <Text style={styles.required}>*</Text>
                </Text>

                <View style={styles.ageRow}>
                  <View style={styles.ageField}>
                    <Text style={styles.smallLabel}>MINIMUM AGE</Text>

                    <View style={styles.ageInputBox}>
                      <TextInput
                        style={styles.ageInput}
                        value={minAge}
                        onChangeText={(value) => {
                          setMinAge(value);
                          markUnsaved();
                        }}
                        keyboardType="number-pad"
                        maxLength={2}
                        placeholder="22"
                        placeholderTextColor={C.muted}
                        editable={!saving}
                        accessibilityLabel="Minimum preferred age"
                      />

                      <Text style={styles.ageSuffix}>yrs</Text>
                    </View>
                  </View>

                  <Text style={styles.ageSeparator}>—</Text>

                  <View style={styles.ageField}>
                    <Text style={styles.smallLabel}>MAXIMUM AGE</Text>

                    <View style={styles.ageInputBox}>
                      <TextInput
                        style={styles.ageInput}
                        value={maxAge}
                        onChangeText={(value) => {
                          setMaxAge(value);
                          markUnsaved();
                        }}
                        keyboardType="number-pad"
                        maxLength={2}
                        placeholder="35"
                        placeholderTextColor={C.muted}
                        editable={!saving}
                        accessibilityLabel="Maximum preferred age"
                      />

                      <Text style={styles.ageSuffix}>yrs</Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.helper}>
                  Choose an age range between 18 and 80 years.
                </Text>
              </View>

              {/* Preferred City */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Preferred City</Text>

                  <Text style={styles.optionalBadge}>OPTIONAL</Text>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.fieldIcon}>◇</Text>

                  <TextInput
                    style={styles.input}
                    value={city}
                    onChangeText={(value) => {
                      setCity(value);
                      markUnsaved();
                    }}
                    placeholder="Leave blank for any city"
                    placeholderTextColor={C.muted}
                    maxLength={120}
                    autoCapitalize="words"
                    editable={!saving}
                    accessibilityLabel="Preferred city"
                  />
                </View>

                <Text style={styles.helper}>
                  Leave this empty if you have no specific city preference.
                </Text>
              </View>
            </View>

            {/* Education */}
            <View style={styles.card}>
              <View style={styles.cardHeading}>
                <View style={styles.cardHeadingIcon}>
                  <Text style={styles.cardIconText}>✦</Text>
                </View>

                <View style={styles.cardHeadingText}>
                  <Text style={styles.sectionTitle}>Preferred Education</Text>

                  <Text style={styles.sectionSubtitle}>
                    Choose the education level you are looking for.
                  </Text>
                </View>
              </View>

              <ChoiceGroup
                options={educationOptions}
                selected={education}
                disabled={saving}
                onSelect={(value) => {
                  setEducation(value);
                  markUnsaved();
                }}
              />

              <View style={styles.inlineNote}>
                <Text style={styles.noteIcon}>✧</Text>

                <Text style={styles.inlineNoteText}>
                  Select Any if you don't have a specific education preference.
                </Text>
              </View>
            </View>

            {/* Marital Status */}
            <View style={styles.card}>
              <View style={styles.cardHeading}>
                <View style={styles.cardHeadingIcon}>
                  <Text style={styles.cardIconText}>♡</Text>
                </View>

                <View style={styles.cardHeadingText}>
                  <Text style={styles.sectionTitle}>
                    Preferred Marital Status
                  </Text>

                  <Text style={styles.sectionSubtitle}>
                    Select the marital status you are comfortable with.
                  </Text>
                </View>
              </View>

              <ChoiceGroup
                options={maritalOptions}
                selected={maritalStatus}
                disabled={saving}
                onSelect={(value) => {
                  setMaritalStatus(value);
                  markUnsaved();
                }}
              />

              <View style={styles.inlineNote}>
                <Text style={styles.noteIcon}>✧</Text>

                <Text style={styles.inlineNoteText}>
                  Select Any if you don't want to limit your preferences.
                </Text>
              </View>
            </View>

            {/* Save and Continue */}
            <View style={styles.actionCard}>
              <View style={styles.actionCardHeader}>
                <Text style={styles.actionCardHeart}>♡</Text>

                <View style={styles.actionCardText}>
                  <Text style={styles.actionCardTitle}>
                    {saved ? "Preferences Saved" : "Save Your Preferences"}
                  </Text>

                  <Text style={styles.actionCardDescription}>
                    {saved
                      ? "Your partner preferences have been saved. You can continue to the next step."
                      : "Save your choices to continue setting up your profile."}
                  </Text>
                </View>
              </View>

              <View style={styles.privacyNote}>
                <Text style={styles.privacyIcon}>♡</Text>

                <Text style={styles.privacyText}>
                  You can update these preferences later. They help define what
                  you are looking for in a partner.
                </Text>
              </View>

              {/* Error */}
              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorIcon}>!</Text>

                  <Text style={styles.errorText} accessibilityRole="alert">
                    {error}
                  </Text>
                </View>
              ) : null}

              {/* Success */}
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
                    : saved
                      ? "Save Changes"
                      : "Save Preferences  →"
                }
                onPress={() => void handleSave()}
                loading={saving}
              />

              {saved ? (
                <ActionButton
                  title="Continue to Step 4  →"
                  secondary
                  onPress={() => router.push("/profile-photos")}
                />
              ) : null}

              <Pressable
                accessibilityRole="button"
                onPress={() => router.replace("/profile-details")}
                style={styles.backLink}
              >
                <Text style={styles.backLinkText}>
                  ← Back to Personal & Family Details
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
    color: C.white,
    fontFamily: serif,
    fontSize: 30,
    fontWeight: "700",
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

  // Decorative background
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

  // Top Header
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

  // Progress Bar
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
    gap: 26,
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

  smallLabel: {
    color: C.muted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },

  ageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },

  ageField: {
    flex: 1,
    minWidth: 0,
    gap: 9,
  },

  ageSeparator: {
    color: C.gold,
    fontSize: 24,
    paddingBottom: 15,
  },

  ageInputBox: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    backgroundColor: C.surfaceDark,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 13,
    paddingHorizontal: 10,
  },

  ageInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 54,
    paddingHorizontal: 6,
    color: C.white,
    fontSize: 18,
    fontWeight: "700",
  },

  ageSuffix: {
    color: C.gold,
    fontSize: 12,
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

  // Information note
  inlineNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 13,
    backgroundColor: C.surfaceDark,
    borderRadius: 12,
  },

  noteIcon: {
    color: C.gold,
    fontSize: 23,
  },

  inlineNoteText: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 20,
    flex: 1,
  },

  // Action Card
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

  privacyIcon: {
    color: C.gold,
    fontSize: 25,
  },

  privacyText: {
    flex: 1,
    color: C.muted,
    fontSize: 12,
    lineHeight: 21,
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
    textAlign: "center",
    textDecorationLine: "underline",
  },

  // Error
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
  },

  // Success
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
