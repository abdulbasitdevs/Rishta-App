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

// Same premium colors used throughout Rishta App.
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

const genderOptions = ["Male", "Female", "Prefer not to say"];

const maritalOptions = ["Never Married", "Divorced", "Widowed", "Separated"];

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
      disabled={loading || disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        secondary && styles.secondaryButton,
        (pressed || loading || disabled) && styles.buttonPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? C.gold : C.white} size="small" />
      ) : null}

      <Text
        style={[
          styles.actionButtonText,
          secondary && styles.secondaryButtonText,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value}</Text>
    </View>
  );
}

export default function ProfileSetupScreen() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
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

  // Load the current user and any saved basic details.
  useEffect(() => {
    let active = true;

    async function checkUser() {
      try {
        const { data, error: userError } = await supabase.auth.getUser();

        if (!active) return;

        if (userError || !data.user) {
          if (
            userError &&
            !["session_not_found", "bad_jwt"].includes(userError.code ?? "")
          ) {
            setAuthError("Unable to verify your account. Please try again.");
            return;
          }

          router.replace("/login");
          return;
        }

        const user = data.user;

        const savedName = user.user_metadata?.full_name;

        if (typeof savedName === "string") {
          setFullName(savedName);
        }

        // Read only the logged-in user's profile.
        const { data: existingProfile, error: profileError } = await supabase
          .from("rishta_profiles")
          .select("full_name, gender, date_of_birth, city, marital_status")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!active) return;

        if (profileError) {
          setAuthError(profileError.message);
          return;
        }

        if (existingProfile) {
          setFullName(existingProfile.full_name ?? "");
          setGender(existingProfile.gender ?? "");
          setCity(existingProfile.city ?? "");
          setMaritalStatus(existingProfile.marital_status ?? "");

          if (existingProfile.date_of_birth) {
            const [savedYear, savedMonth, savedDay] =
              existingProfile.date_of_birth.split("-");

            setYear(savedYear ?? "");
            setMonth(savedMonth ?? "");
            setDay(savedDay ?? "");
          }
        }

        setAuthenticated(true);
      } catch {
        if (active) {
          setAuthError(
            "Unable to connect. Please check your internet connection.",
          );
        }
      } finally {
        if (active) {
          setCheckingAuth(false);
        }
      }
    }

    void checkUser();

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

  // Validate basic information before showing review.
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

  // Save the reviewed profile to Supabase.
  async function handleSaveProfile() {
    if (savingProfile || saved) return;

    setSaveError("");
    setSavingProfile(true);

    try {
      const { data, error: userError } = await supabase.auth.getUser();

      if (userError || !data.user) {
        setSaveError("Please sign in again.");
        return;
      }

      const formattedDate =
        `${year}-${month.padStart(2, "0")}` + `-${day.padStart(2, "0")}`;

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
          {
            onConflict: "user_id",
          },
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

  function handleBack() {
    if (preview) {
      setPreview(false);
      setError("");
    } else {
      router.replace("/dashboard");
    }
  }

  // Loading screen.
  if (checkingAuth) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.loadingHeart}>♡</Text>

        <ActivityIndicator size="large" color={C.emeraldBright} />

        <Text style={styles.loadingText}>Loading your profile...</Text>
      </SafeAreaView>
    );
  }

  // Authentication or database error.
  if (authError || !authenticated) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.loadingHeart}>♡</Text>

        <Text style={styles.errorText}>{authError || "Opening login..."}</Text>

        {authError ? (
          <View style={styles.centeredButton}>
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
          <View style={styles.content}>
            {/* Background decoration */}
            <View pointerEvents="none" style={styles.topGlow} />

            <View pointerEvents="none" style={styles.goldArch} />

            {/* Top navigation */}
            <View style={styles.topBar}>
              <Pressable
                accessibilityRole="button"
                onPress={handleBack}
                style={styles.backButton}
              >
                <Text style={styles.backArrow}>←</Text>
              </Pressable>

              <View style={styles.brandRow}>
                <Text style={styles.brandHeart}>♡</Text>

                <Text style={styles.brandName}>
                  Rishta <Text style={styles.brandGold}>App</Text>
                </Text>
              </View>

              <Text style={styles.stepBadge}>1 / 4</Text>
            </View>

            {/* Progress */}
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>PROFILE SETUP</Text>

                <Text style={styles.progressText}>STEP 1 OF 4</Text>
              </View>

              <View style={styles.progressTrack}>
                <View style={styles.progressFill} />
              </View>

              <Text style={styles.progressNote}>Basic Information</Text>
            </View>

            {/* Heading */}
            <View style={styles.hero}>
              <View style={styles.ornamentRow}>
                <View style={styles.ornamentLine} />

                <Text style={styles.ornament}>✦ ❦ ✦</Text>

                <View style={styles.ornamentLine} />
              </View>

              <Text style={styles.title}>
                {preview ? "Review Your Information" : "Basic Information"}
              </Text>

              <Text style={styles.subtitle}>
                {preview
                  ? "Please review your details before saving your profile."
                  : "Let's begin with a few important details about you."}
              </Text>

              <View style={styles.heartDivider}>
                <View style={styles.dividerLine} />

                <Text style={styles.dividerHeart}>♡</Text>

                <View style={styles.dividerLine} />
              </View>
            </View>

            {/* Main form card */}
            <View style={styles.formCard}>
              {preview ? (
                <>
                  <View style={styles.cardHeading}>
                    <Text style={styles.cardHeadingIcon}>♡</Text>

                    <View style={styles.cardHeadingText}>
                      <Text style={styles.sectionTitle}>Your Details</Text>

                      <Text style={styles.sectionSubtitle}>
                        Confirm everything is correct.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.reviewCard}>
                    <ReviewRow label="Full Name" value={fullName} />

                    <View style={styles.reviewDivider} />

                    <ReviewRow label="Gender" value={gender} />

                    <View style={styles.reviewDivider} />

                    <ReviewRow
                      label="Date of Birth"
                      value={
                        `${day.padStart(2, "0")}/` +
                        `${month.padStart(2, "0")}/` +
                        year
                      }
                    />

                    <View style={styles.reviewDivider} />

                    <ReviewRow label="City" value={city} />

                    <View style={styles.reviewDivider} />

                    <ReviewRow label="Marital Status" value={maritalStatus} />
                  </View>

                  {/* Save note */}
                  <View style={styles.noteBox}>
                    <Text style={styles.noteIcon}>♡</Text>

                    <Text style={styles.noteText}>
                      {saved
                        ? "Your basic information has been saved."
                        : "Review your details carefully before saving."}
                    </Text>
                  </View>

                  {/* Save error */}
                  {saveError ? (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorText} accessibilityRole="alert">
                        {saveError}
                      </Text>
                    </View>
                  ) : null}

                  {/* Success */}
                  {saved ? (
                    <View style={styles.successBox}>
                      <Text style={styles.successIcon}>✓</Text>

                      <Text style={styles.successText}>
                        Profile saved successfully!
                      </Text>
                    </View>
                  ) : null}

                  {/* Save button */}
                  {!saved ? (
                    <ActionButton
                      title={
                        savingProfile ? "Saving Profile..." : "Save Profile  →"
                      }
                      onPress={() => void handleSaveProfile()}
                      loading={savingProfile}
                      disabled={savingProfile}
                    />
                  ) : (
                    <ActionButton
                      title="Continue to Step 2  →"
                      onPress={() => router.push("/profile-details")}
                    />
                  )}

                  <ActionButton
                    title="Edit Details"
                    secondary
                    onPress={() => {
                      setPreview(false);
                      setError("");
                    }}
                  />
                </>
              ) : (
                <>
                  <View style={styles.cardHeading}>
                    <Text style={styles.cardHeadingIcon}>♙</Text>

                    <View style={styles.cardHeadingText}>
                      <Text style={styles.sectionTitle}>About You</Text>

                      <Text style={styles.sectionSubtitle}>
                        All fields marked * are required.
                      </Text>
                    </View>
                  </View>

                  {/* Full Name */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>
                      Full Name <Text style={styles.required}>*</Text>
                    </Text>

                    <View style={styles.inputContainer}>
                      <Text style={styles.fieldIcon}>♙</Text>

                      <TextInput
                        style={styles.input}
                        value={fullName}
                        onChangeText={setFullName}
                        placeholder="Enter your full name"
                        placeholderTextColor={C.muted}
                        autoCapitalize="words"
                        autoComplete="name"
                        accessibilityLabel="Full name"
                      />
                    </View>
                  </View>

                  {/* Gender */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>
                      Gender <Text style={styles.required}>*</Text>
                    </Text>

                    <View style={styles.optionsContainer}>
                      {genderOptions.map((option) => {
                        const selected = gender === option;

                        return (
                          <Pressable
                            key={option}
                            accessibilityRole="radio"
                            accessibilityState={{
                              checked: selected,
                            }}
                            onPress={() => setGender(option)}
                            style={[
                              styles.option,
                              selected && styles.optionSelected,
                            ]}
                          >
                            <Text
                              style={[
                                styles.optionText,
                                selected && styles.optionTextSelected,
                              ]}
                            >
                              {selected ? "✓  " : ""}
                              {option}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  {/* Date of Birth */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>
                      Date of Birth <Text style={styles.required}>*</Text>
                    </Text>

                    <View style={styles.dateRow}>
                      <View style={styles.dateField}>
                        <Text style={styles.dateLabel}>DAY</Text>

                        <TextInput
                          style={styles.dateInput}
                          placeholder="DD"
                          placeholderTextColor={C.muted}
                          keyboardType="number-pad"
                          maxLength={2}
                          value={day}
                          onChangeText={setDay}
                          accessibilityLabel="Birth day"
                        />
                      </View>

                      <View style={styles.dateField}>
                        <Text style={styles.dateLabel}>MONTH</Text>

                        <TextInput
                          style={styles.dateInput}
                          placeholder="MM"
                          placeholderTextColor={C.muted}
                          keyboardType="number-pad"
                          maxLength={2}
                          value={month}
                          onChangeText={setMonth}
                          accessibilityLabel="Birth month"
                        />
                      </View>

                      <View style={[styles.dateField, styles.yearField]}>
                        <Text style={styles.dateLabel}>YEAR</Text>

                        <TextInput
                          style={styles.dateInput}
                          placeholder="YYYY"
                          placeholderTextColor={C.muted}
                          keyboardType="number-pad"
                          maxLength={4}
                          value={year}
                          onChangeText={setYear}
                          accessibilityLabel="Birth year"
                        />
                      </View>
                    </View>

                    <Text style={styles.helper}>
                      You must be at least 18 years old.
                    </Text>
                  </View>

                  {/* City */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>
                      City <Text style={styles.required}>*</Text>
                    </Text>

                    <View style={styles.inputContainer}>
                      <Text style={styles.fieldIcon}>◇</Text>

                      <TextInput
                        style={styles.input}
                        value={city}
                        onChangeText={setCity}
                        placeholder="Skardu, Lahore, Karachi..."
                        placeholderTextColor={C.muted}
                        autoCapitalize="words"
                        accessibilityLabel="City"
                      />
                    </View>
                  </View>

                  {/* Marital Status */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>
                      Marital Status <Text style={styles.required}>*</Text>
                    </Text>

                    <View style={styles.optionsContainer}>
                      {maritalOptions.map((option) => {
                        const selected = maritalStatus === option;

                        return (
                          <Pressable
                            key={option}
                            accessibilityRole="radio"
                            accessibilityState={{
                              checked: selected,
                            }}
                            onPress={() => setMaritalStatus(option)}
                            style={[
                              styles.option,
                              selected && styles.optionSelected,
                            ]}
                          >
                            <Text
                              style={[
                                styles.optionText,
                                selected && styles.optionTextSelected,
                              ]}
                            >
                              {selected ? "✓  " : ""}
                              {option}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  {/* Validation error */}
                  {error ? (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorText} accessibilityRole="alert">
                        {error}
                      </Text>
                    </View>
                  ) : null}

                  {/* Continue to review */}
                  <ActionButton title="Continue  →" onPress={handleContinue} />
                </>
              )}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <View style={styles.footerRow}>
                <Text style={styles.footerHeart}>♡</Text>

                <Text style={styles.footerText}>
                  Review your information before saving
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
    gap: 20,
  },

  centeredButton: {
    width: "100%",
    maxWidth: 300,
  },

  loadingHeart: {
    color: C.gold,
    fontSize: 55,
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
    paddingVertical: 20,
  },

  content: {
    width: "100%",
    maxWidth: 600,
    paddingBottom: 20,
  },

  // Background
  topGlow: {
    position: "absolute",
    top: -115,
    left: -135,
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

  brandGold: {
    color: C.gold,
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
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
  },

  progressFill: {
    width: "25%",
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

  // Main card
  formCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 24,
    padding: 20,
    gap: 25,
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
    paddingBottom: 13,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },

  cardHeadingIcon: {
    width: 44,
    height: 44,
    textAlign: "center",
    textAlignVertical: "center",
    color: C.gold,
    fontSize: 28,
    backgroundColor: C.surfaceDark,
    borderRadius: 12,
    overflow: "hidden",
  },

  cardHeadingText: {
    flex: 1,
    gap: 5,
  },

  sectionTitle: {
    color: C.white,
    fontFamily: serif,
    fontSize: 23,
    fontWeight: "700",
  },

  sectionSubtitle: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 19,
  },

  // Fields
  fieldGroup: {
    gap: 11,
  },

  label: {
    color: C.goldLight,
    fontSize: 15,
    fontWeight: "700",
  },

  required: {
    color: C.gold,
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

  // Option chips
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

  // Date of Birth
  dateRow: {
    flexDirection: "row",
    gap: 10,
  },

  dateField: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },

  yearField: {
    flex: 1.35,
  },

  dateLabel: {
    color: C.muted,
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: "700",
  },

  dateInput: {
    minHeight: 56,
    backgroundColor: C.surfaceDark,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 13,
    color: C.white,
    textAlign: "center",
    fontSize: 16,
    paddingHorizontal: 5,
  },

  helper: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 19,
  },

  // Buttons
  actionButton: {
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

  actionButtonText: {
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

  buttonPressed: {
    opacity: 0.7,
  },

  // Review
  reviewCard: {
    backgroundColor: C.surfaceDark,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 17,
  },

  reviewRow: {
    gap: 8,
    paddingVertical: 8,
  },

  reviewLabel: {
    color: C.muted,
    fontSize: 12,
  },

  reviewValue: {
    color: C.white,
    fontSize: 16,
    fontWeight: "700",
  },

  reviewDivider: {
    height: 1,
    backgroundColor: C.border,
    opacity: 0.5,
    marginVertical: 9,
  },

  // Notes
  noteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: C.surfaceDark,
  },

  noteIcon: {
    color: C.gold,
    fontSize: 25,
  },

  noteText: {
    flex: 1,
    color: C.muted,
    fontSize: 13,
    lineHeight: 21,
  },

  // Errors
  errorBox: {
    backgroundColor: "#30252A",
    borderWidth: 1,
    borderColor: "#B75A64",
    borderRadius: 12,
    padding: 14,
  },

  errorText: {
    color: C.error,
    fontSize: 13,
    lineHeight: 21,
    textAlign: "center",
  },

  // Success
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: C.emeraldBright,
    backgroundColor: "#083E31",
    borderRadius: 12,
    padding: 14,
  },

  successIcon: {
    color: C.success,
    fontSize: 22,
    fontWeight: "800",
  },

  successText: {
    color: C.success,
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
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
    textAlign: "center",
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
