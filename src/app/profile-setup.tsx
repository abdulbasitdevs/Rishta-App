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

const genderOptions = ["Male", "Female", "Prefer not to say"];

const maritalOptions = ["Never Married", "Divorced", "Widowed", "Separated"];

export default function ProfileSetupScreen() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authError, setAuthError] = useState("");

  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [city, setCity] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");

  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);

  const [savingProfile, setSavingProfile] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkUser() {
      try {
        const { data, error: userError } = await supabase.auth.getUser();

        if (!active) return;

        if (userError) {
          setAuthError("Unable to verify your account. Please try again.");
          return;
        }

        if (!data.user) {
          router.replace("/login");
          return;
        }

        const savedName = data.user.user_metadata?.full_name;

        if (typeof savedName === "string") {
          setFullName(savedName);
        }
        // PASTE NEW CODE HERE

        const { data: existingProfile, error: profileError } = await supabase
          .from("rishta_profiles")
          .select("full_name, gender, date_of_birth, city, marital_status")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (!active) return;

        if (profileError) {
          setAuthError(profileError.message);
          return;
        }

        if (existingProfile) {
          setFullName(existingProfile.full_name);
          setGender(existingProfile.gender);
          setCity(existingProfile.city);
          setMaritalStatus(existingProfile.marital_status);

          const [savedYear, savedMonth, savedDay] =
            existingProfile.date_of_birth.split("-");

          setYear(savedYear);
          setMonth(savedMonth);
          setDay(savedDay);
        }
      } catch {
        if (active) {
          setAuthError(
            "Unable to connect. Please check your internet connection.",
          );
        }
      } finally {
        if (active) setCheckingAuth(false);
      }
    }

    void checkUser();

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

  function handleContinue() {
    setError("");
    setSaveError("");
    setSaved(false);

    const cleanName = fullName.trim();
    const cleanCity = city.trim();

    if (cleanName.length < 2) {
      setError("Please enter your full name.");
      return;
    }

    if (!gender) {
      setError("Please select your gender.");
      return;
    }

    if (!day || !month || !year) {
      setError("Please enter your complete date of birth.");
      return;
    }

    if (
      !/^\d{1,2}$/.test(day) ||
      !/^\d{1,2}$/.test(month) ||
      !/^\d{4}$/.test(year)
    ) {
      setError("Please enter a valid date of birth.");
      return;
    }

    const birthDay = Number(day);
    const birthMonth = Number(month);
    const birthYear = Number(year);

    const birthDate = new Date(Date.UTC(birthYear, birthMonth - 1, birthDay));

    if (
      birthYear < 1900 ||
      birthDate.getUTCFullYear() !== birthYear ||
      birthDate.getUTCMonth() !== birthMonth - 1 ||
      birthDate.getUTCDate() !== birthDay
    ) {
      setError("Please enter a valid date of birth.");
      return;
    }

    const today = new Date();

    let age = today.getFullYear() - birthYear;

    const birthdayPassed =
      today.getMonth() + 1 > birthMonth ||
      (today.getMonth() + 1 === birthMonth && today.getDate() >= birthDay);

    if (!birthdayPassed) {
      age--;
    }

    if (age < 18) {
      setError("You must be at least 18 years old.");
      return;
    }

    if (cleanCity.length < 2) {
      setError("Please enter your city.");
      return;
    }

    if (!maritalStatus) {
      setError("Please select your marital status.");
      return;
    }

    setFullName(cleanName);
    setCity(cleanCity);
    setPreview(true);
  }

  async function handleSaveProfile() {
    if (savingProfile || saved) return;

    setSaveError("");
    setSavingProfile(true);

    try {
      const { data, error: authError } = await supabase.auth.getUser();

      if (authError || !data.user) {
        setSaveError("Please sign in again.");
        return;
      }

      const formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

      const { error: databaseError } = await supabase
        .from("rishta_profiles")
        .upsert(
          {
            user_id: data.user.id,
            full_name: fullName.trim(),
            gender,
            date_of_birth: formattedDate,
            city: city.trim(),
            marital_status: maritalStatus,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );

      if (databaseError) {
        setSaveError(databaseError.message);
        return;
      }

      setSaved(true);
    } catch {
      setSaveError("Unable to save profile. Please try again.");
    } finally {
      setSavingProfile(false);
    }
  }

  if (checkingAuth) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />

        <Text style={styles.subtitle}>Checking your account...</Text>
      </SafeAreaView>
    );
  }

  if (authError) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.error}>{authError}</Text>

        <View style={styles.buttonArea}>
          <AppButton
            title="Back to Dashboard"
            onPress={() => router.replace("/dashboard")}
          />
        </View>
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
          <View style={styles.content}>
            <Pressable
              style={styles.backButton}
              onPress={() => {
                if (preview) {
                  setPreview(false);
                } else {
                  router.replace("/dashboard");
                }
              }}
            >
              <Text style={styles.backText}>
                ← {preview ? "Edit Information" : "Dashboard"}
              </Text>
            </Pressable>

            <View style={styles.progressHeader}>
              <Text style={styles.stepText}>STEP 1 OF 4</Text>

              <Text style={styles.percentage}>25%</Text>
            </View>

            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>

            <View style={styles.header}>
              <View style={styles.iconBox}>
                <Text style={styles.iconText}>♥</Text>
              </View>

              <Text style={styles.title}>
                {preview ? "Review Your Information" : "Basic Information"}
              </Text>

              <Text style={styles.subtitle}>
                {preview
                  ? "Please review your details before proceeding."
                  : "Let's start with a few details about you."}
              </Text>
            </View>

            {preview ? (
              <View style={styles.formCard}>
                <Text style={styles.sectionTitle}>Your Details</Text>

                <Text style={styles.reviewLabel}>Full Name</Text>
                <Text style={styles.reviewValue}>{fullName}</Text>

                <Text style={styles.reviewLabel}>Gender</Text>
                <Text style={styles.reviewValue}>{gender}</Text>

                <Text style={styles.reviewLabel}>Date of Birth</Text>
                <Text style={styles.reviewValue}>
                  {day.padStart(2, "0")}/{month.padStart(2, "0")}/{year}
                </Text>

                <Text style={styles.reviewLabel}>City</Text>
                <Text style={styles.reviewValue}>{city}</Text>

                <Text style={styles.reviewLabel}>Marital Status</Text>
                <Text style={styles.reviewValue}>{maritalStatus}</Text>

                <View style={styles.noteBox}>
                  <Text style={styles.noteText}>
                    {saved
                      ? "Your profile information has been saved securely."
                      : "Please review your details and click Save Profile to continue."}
                  </Text>
                </View>

                {saveError ? (
                  <Text style={styles.error}>{saveError}</Text>
                ) : null}

                {saved ? (
                  <Text style={{ color: colors.success, marginTop: 16 }}>
                    Your profile has been saved successfully!
                  </Text>
                ) : null}

                <View style={styles.buttonArea}>
                  <AppButton
                    title={saved ? "Profile Saved" : "Save Profile"}
                    onPress={handleSaveProfile}
                    loading={savingProfile}
                    disabled={savingProfile || saved}
                  />
                </View>

                {saved ? (
                  <View style={styles.buttonArea}>
                    <AppButton
                      title="Continue to Step 2"
                      onPress={() => router.push("/profile-details")}
                    />
                  </View>
                ) : null}

                <View style={styles.buttonArea}>
                  <AppButton
                    title="Edit Details"
                    onPress={() => setPreview(false)}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.formCard}>
                <Text style={styles.sectionTitle}>About You</Text>

                <Text style={styles.label}>Full Name *</Text>

                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter your full name"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="words"
                  autoComplete="name"
                />

                <Text style={styles.label}>Gender *</Text>

                <View style={styles.optionsContainer}>
                  {genderOptions.map((option) => (
                    <Pressable
                      key={option}
                      style={[
                        styles.option,
                        gender === option && styles.optionSelected,
                      ]}
                      onPress={() => setGender(option)}
                      accessibilityRole="radio"
                      accessibilityState={{
                        checked: gender === option,
                      }}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          gender === option && styles.optionTextSelected,
                        ]}
                      >
                        {option}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.label}>Date of Birth *</Text>

                <View style={styles.dateRow}>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="DD"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                    maxLength={2}
                    value={day}
                    onChangeText={setDay}
                  />

                  <TextInput
                    style={styles.dateInput}
                    placeholder="MM"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                    maxLength={2}
                    value={month}
                    onChangeText={setMonth}
                  />

                  <TextInput
                    style={styles.yearInput}
                    placeholder="YYYY"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                    maxLength={4}
                    value={year}
                    onChangeText={setYear}
                  />
                </View>

                <Text style={styles.helper}>
                  You must be 18 years or older.
                </Text>

                <Text style={styles.label}>City *</Text>

                <TextInput
                  style={styles.input}
                  value={city}
                  onChangeText={setCity}
                  placeholder="e.g. Skardu, Lahore, Karachi"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="words"
                />

                <Text style={styles.label}>Marital Status *</Text>

                <View style={styles.optionsContainer}>
                  {maritalOptions.map((option) => (
                    <Pressable
                      key={option}
                      style={[
                        styles.option,
                        maritalStatus === option && styles.optionSelected,
                      ]}
                      onPress={() => setMaritalStatus(option)}
                      accessibilityRole="radio"
                      accessibilityState={{
                        checked: maritalStatus === option,
                      }}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          maritalStatus === option && styles.optionTextSelected,
                        ]}
                      >
                        {option}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {error ? (
                  <Text style={styles.error} accessibilityRole="alert">
                    {error}
                  </Text>
                ) : null}

                <View style={styles.buttonArea}>
                  <AppButton title="Continue" onPress={handleContinue} />
                </View>
              </View>
            )}

            <Text style={styles.footer}>
              Your personal information will be protected with privacy controls.
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
    padding: spacing.xl,
    gap: spacing.lg,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    padding: spacing.xl,
  },
  content: {
    width: "100%",
    maxWidth: 520,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: spacing.md,
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
  percentage: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.full,
    overflow: "hidden",
    marginBottom: spacing.xxxl,
  },
  progressFill: {
    width: "25%",
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xxxl,
  },
  iconBox: {
    width: 70,
    height: 70,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceSoft,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  iconText: {
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
  formCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  sectionTitle: {
    color: colors.heading,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: spacing.xl,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    color: colors.text,
    fontSize: 16,
    backgroundColor: colors.background,
    marginBottom: spacing.xl,
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
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  optionSelected: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.primary,
  },
  optionText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  optionTextSelected: {
    color: colors.primary,
  },
  dateRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  dateInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 54,
    textAlign: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: 16,
  },
  yearInput: {
    flex: 1.5,
    minWidth: 0,
    minHeight: 54,
    textAlign: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: 16,
  },
  helper: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  buttonArea: {
    marginTop: spacing.lg,
  },
  error: {
    color: colors.error,
    fontSize: 13,
    lineHeight: 21,
    marginTop: spacing.md,
  },
  reviewLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  reviewValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: spacing.lg,
  },
  noteBox: {
    backgroundColor: colors.surfaceSoft,
    padding: spacing.lg,
    borderRadius: radius.md,
  },
  noteText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 21,
  },
  footer: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 20,
    textAlign: "center",
    marginTop: spacing.xxl,
    marginBottom: spacing.xl,
  },
});
