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

export default function ProfileDetailsScreen() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
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

  useEffect(() => {
    let active = true;

    async function loadProfile() {
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
        setSaved(profile.profile_step >= 2);
      } catch {
        if (active) {
          setError("Unable to load profile. Please try again.");
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

  async function handleSave() {
    if (loading) return;

    setError("");
    setMessage("");

    if (!education) {
      setError("Please select your education.");
      return;
    }

    if (profession.trim().length < 2 || profession.trim().length > 100) {
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

      const { data: updated, error: saveError } = await supabase
        .from("rishta_profiles")
        .update({
          education_level: education,
          profession: profession.trim(),
          height_cm: heightValue,

          religion:
            cleanReligion && cleanReligion !== "Prefer not to say"
              ? cleanReligion
              : null,

          faith_category: cleanReligion || null,

          muslim_sect: cleanReligion === "Muslim" ? muslimSect || null : null,

          family_overview: cleanFamily || null,
          profile_step: 2,
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

      setSaved(true);
      setMessage("Personal & Family Details saved successfully!");
    } catch {
      setError("Unable to save details. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.subtitle}>Loading your profile...</Text>
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
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.wrapper}>
            <Pressable
              onPress={() => router.replace("/profile-setup")}
              style={styles.backButton}
            >
              <Text style={styles.backText}>← Basic Information</Text>
            </Pressable>

            <View style={styles.progressHeader}>
              <Text style={styles.stepText}>STEP 2 OF 4</Text>
              <Text style={styles.progressText}>
                {saved ? "50% Complete" : "In Progress"}
              </Text>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: saved ? "50%" : "25%" }]}
              />
            </View>

            <View style={styles.header}>
              <View style={styles.iconBox}>
                <Text style={styles.heart}>♥</Text>
              </View>

              <Text style={styles.title}>Personal & Family Details</Text>

              <Text style={styles.subtitle}>
                Share a little more about yourself and your background.
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Education & Career</Text>

              <Text style={styles.label}>Highest Education *</Text>

              <View style={styles.optionsContainer}>
                {educationOptions.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => {
                      setEducation(option);
                      setSaved(false);
                      setMessage("");
                    }}
                    style={[
                      styles.option,
                      education === option && styles.optionSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        education === option && styles.optionTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Profession *</Text>

              <TextInput
                style={styles.input}
                placeholder="e.g. Software Engineer, Teacher, Student"
                placeholderTextColor={colors.textSecondary}
                value={profession}
                onChangeText={(value) => {
                  setProfession(value);
                  setSaved(false);
                  setMessage("");
                }}
                maxLength={100}
                autoCapitalize="words"
              />

              <Text style={styles.label}>Height (cm) — Optional</Text>

              <TextInput
                style={styles.input}
                placeholder="e.g. 170"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                maxLength={3}
                value={height}
                onChangeText={(value) => {
                  setHeight(value);
                  setSaved(false);
                  setMessage("");
                }}
              />

              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>
                Personal & Family Background
              </Text>

              <Text style={styles.label}>Religion — Optional</Text>

              <View style={styles.optionsContainer}>
                {religionOptions.map((option) => (
                  <Pressable
                    key={option}
                    style={[
                      styles.option,
                      religion === option && styles.optionSelected,
                    ]}
                    onPress={() => {
                      setReligion(option);
                      setMuslimSect("");
                      setSaved(false);
                      setMessage("");
                    }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        religion === option && styles.optionTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {religion === "Muslim" ? (
                <>
                  <Text style={styles.label}>Firqa / Sect — Optional</Text>

                  <View style={styles.optionsContainer}>
                    {sectOptions.map((option) => (
                      <Pressable
                        key={option}
                        style={[
                          styles.option,
                          muslimSect === option && styles.optionSelected,
                        ]}
                        onPress={() => {
                          setMuslimSect(option);
                          setSaved(false);
                          setMessage("");
                        }}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            muslimSect === option && styles.optionTextSelected,
                          ]}
                        >
                          {option}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}

              <Text style={styles.helper}>
                Religion and sect are optional and remain private. You can
                choose whether to share them in discovery later.
              </Text>

              <Text style={styles.label}>About Your Family — Optional</Text>

              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Tell us a little about your family..."
                placeholderTextColor={colors.textSecondary}
                value={familyOverview}
                onChangeText={(value) => {
                  setFamilyOverview(value);
                  setSaved(false);
                  setMessage("");
                }}
                multiline
                maxLength={600}
                textAlignVertical="top"
              />

              <Text style={styles.helper}>
                Avoid sharing phone numbers, home addresses, or other private
                contact details here.
              </Text>

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
                  title={saved ? "Save Changes" : "Save & Continue"}
                  onPress={handleSave}
                  loading={loading}
                  disabled={loading}
                />
              </View>

              {saved ? (
                <View style={styles.buttonArea}>
                  <AppButton
                    title="Continue to Step 3"
                    onPress={() => router.push("/partner-preferences")}
                  />
                </View>
              ) : null}
            </View>

            <Text style={styles.footer}>
              Your details remain private under your account's security
              settings.
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
  backButton: {
    paddingVertical: spacing.md,
    alignSelf: "flex-start",
    marginBottom: spacing.xl,
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
    letterSpacing: 1,
  },
  progressText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
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
    borderRadius: radius.full,
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
    fontSize: 42,
    color: colors.primary,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.heading,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.heading,
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  option: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceSoft,
  },
  optionText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  optionTextSelected: {
    color: colors.primary,
  },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.xl,
  },
  textarea: {
    minHeight: 120,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.xl,
  },
  helper: {
    fontSize: 12,
    lineHeight: 20,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  buttonArea: {
    marginTop: spacing.lg,
  },
  error: {
    color: colors.error,
    fontSize: 13,
    lineHeight: 21,
  },
  success: {
    color: colors.success,
    fontSize: 14,
    lineHeight: 22,
  },
  footer: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 20,
    marginVertical: spacing.xxl,
  },
});
