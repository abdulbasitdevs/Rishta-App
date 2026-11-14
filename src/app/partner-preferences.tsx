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

import { AppButton } from "@/components/ui/AppButton";
import { supabase } from "@/lib/supabase";
import { theme } from "@/theme/tokens";

const { colors, spacing, radius } = theme;

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

export default function PartnerPreferencesScreen() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [minAge, setMinAge] = useState("22");
  const [maxAge, setMaxAge] = useState("35");
  const [city, setCity] = useState("");
  const [education, setEducation] = useState("Any");
  const [maritalStatus, setMaritalStatus] = useState("Any");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function markUnsaved() {
    setSaved(false);
    setMessage("");
    setError("");
  }

  useEffect(() => {
    let active = true;

    async function loadPreferences() {
      try {
        const { data, error: authError } = await supabase.auth.getUser();

        if (!active) return;

        if (authError) {
          setError("Unable to verify your account.");
          return;
        }

        if (!data.user) {
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

        if (profile.profile_step < 2) {
          router.replace("/profile-details");
          return;
        }

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
          profile.profile_step >= 3 &&
            profile.preferred_age_min != null &&
            profile.preferred_age_max != null,
        );
      } catch {
        if (active) {
          setError("Unable to load preferences. Please try again.");
        }
      } finally {
        if (active) setChecking(false);
      }
    }

    void loadPreferences();

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

  async function handleSave() {
    if (saving) return;

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

      const { data: updated, error: saveError } = await supabase
        .from("rishta_profiles")
        .update({
          preferred_age_min: minimum,
          preferred_age_max: maximum,
          preferred_city: cleanCity || null,
          preferred_education: education === "Any" ? null : education,
          preferred_marital_status:
            maritalStatus === "Any" ? null : maritalStatus,
          profile_step: 3,
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

      setSaved(true);
      setMessage("Partner preferences saved successfully!");
    } catch {
      setError("Unable to save preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (checking) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.subtitle}>Loading preferences...</Text>
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
              onPress={() => router.replace("/profile-details")}
            >
              <Text style={styles.backText}>← Personal & Family Details</Text>
            </Pressable>

            <View style={styles.progressHeader}>
              <Text style={styles.stepText}>STEP 3 OF 4</Text>
              <Text style={styles.progressText}>
                {saved ? "75% Complete" : "In Progress"}
              </Text>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: saved ? "75%" : "50%" }]}
              />
            </View>

            <View style={styles.header}>
              <View style={styles.iconBox}>
                <Text style={styles.heart}>♥</Text>
              </View>

              <Text style={styles.title}>Partner Preferences</Text>

              <Text style={styles.subtitle}>
                Tell us what matters to you in a potential life partner.
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Preferred Age Range</Text>

              <View style={styles.ageRow}>
                <View style={styles.ageField}>
                  <Text style={styles.label}>Minimum Age *</Text>

                  <TextInput
                    style={styles.input}
                    value={minAge}
                    onChangeText={(value) => {
                      setMinAge(value);
                      markUnsaved();
                    }}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="22"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.ageField}>
                  <Text style={styles.label}>Maximum Age *</Text>

                  <TextInput
                    style={styles.input}
                    value={maxAge}
                    onChangeText={(value) => {
                      setMaxAge(value);
                      markUnsaved();
                    }}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="35"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <Text style={styles.label}>Preferred City — Optional</Text>

              <TextInput
                style={styles.input}
                value={city}
                onChangeText={(value) => {
                  setCity(value);
                  markUnsaved();
                }}
                placeholder="Leave blank for any city"
                placeholderTextColor={colors.textSecondary}
                maxLength={120}
                autoCapitalize="words"
              />

              <Text style={styles.sectionTitle}>Preferred Education</Text>

              <View style={styles.options}>
                {educationOptions.map((option) => (
                  <Pressable
                    key={option}
                    style={[
                      styles.option,
                      education === option && styles.selectedOption,
                    ]}
                    onPress={() => {
                      setEducation(option);
                      markUnsaved();
                    }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        education === option && styles.selectedText,
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.sectionTitle}>Preferred Marital Status</Text>

              <View style={styles.options}>
                {maritalOptions.map((option) => (
                  <Pressable
                    key={option}
                    style={[
                      styles.option,
                      maritalStatus === option && styles.selectedOption,
                    ]}
                    onPress={() => {
                      setMaritalStatus(option);
                      markUnsaved();
                    }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        maritalStatus === option && styles.selectedText,
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.note}>
                <Text style={styles.noteText}>
                  Your preferences can be updated later. They are not visible
                  publicly.
                </Text>
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

              <View style={styles.action}>
                <AppButton
                  title={saved ? "Save Changes" : "Save Preferences"}
                  onPress={handleSave}
                  loading={saving}
                  disabled={saving}
                />
              </View>

              {saved ? (
                <View style={styles.action}>
                  <AppButton
                    title="Continue to Step 4"
                    onPress={() => router.push("/profile-photos")}
                  />
                </View>
              ) : null}
            </View>

            <Text style={styles.footer}>Your privacy matters to us ♡</Text>
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
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.lg,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    padding: spacing.xl,
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
    fontSize: 12,
    fontWeight: "800",
  },
  progressText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.full,
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
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.xl,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  heart: {
    color: colors.primary,
    fontSize: 42,
  },
  title: {
    color: colors.heading,
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: spacing.md,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  sectionTitle: {
    color: colors.heading,
    fontSize: 19,
    fontWeight: "700",
    marginBottom: spacing.lg,
    marginTop: spacing.md,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  ageRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  ageField: {
    flex: 1,
  },
  input: {
    minHeight: 54,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    color: colors.text,
    fontSize: 16,
    marginBottom: spacing.xl,
  },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  option: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  selectedOption: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceSoft,
  },
  optionText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  selectedText: {
    color: colors.primary,
  },
  note: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  noteText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 21,
  },
  action: {
    marginTop: spacing.xl,
  },
  error: {
    color: colors.error,
    fontSize: 13,
    marginTop: spacing.lg,
  },
  success: {
    color: colors.success,
    fontSize: 14,
    marginTop: spacing.lg,
  },
  footer: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: "center",
    marginVertical: spacing.xxl,
  },
});
