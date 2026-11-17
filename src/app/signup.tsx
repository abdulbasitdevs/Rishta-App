import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
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

type ScreenStep = "form" | "sms" | "email" | "done";

// Accept Pakistani mobile numbers in these formats:
// 03001234567, 3001234567, +923001234567.
function formatPakistaniPhone(value: string): string | null {
  const digits = value.replace(/\D/g, "");

  if (/^03\d{9}$/.test(digits)) {
    return "+92" + digits.slice(1);
  }

  if (/^3\d{9}$/.test(digits)) {
    return "+92" + digits;
  }

  if (/^923\d{9}$/.test(digits)) {
    return "+" + digits;
  }

  return null;
}

export default function SignupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    accountType?: string;
  }>();

  const accountType = params.accountType === "guardian" ? "guardian" : "single";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isAdult, setIsAdult] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [step, setStep] = useState<ScreenStep>("form");
  const [smsPhone, setSmsPhone] = useState("");
  const [otp, setOtp] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSignup() {
    if (isSubmitting) return;

    setError("");
    setMessage("");

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      setError("Please enter your full name.");
      return;
    }

    // Either email OR mobile number is required.

    if (!cleanEmail) {
      setError("Email address is required to create an account.");
      return;
    }

    if (cleanEmail) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(cleanEmail)) {
        setError("Please enter a valid email address.");
        return;
      }
    }

    let formattedPhone: string | null = null;

    if (cleanPhone) {
      formattedPhone = formatPakistaniPhone(cleanPhone);

      if (!formattedPhone) {
        setError("Enter a valid Pakistani mobile number, e.g. 03001234567.");
        return;
      }
    }

    if (!password || !confirmPassword) {
      setError("Please enter and confirm your password.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!isAdult) {
      setError("You must confirm that you are 18 or older.");
      return;
    }

    setIsSubmitting(true);

    try {
      // User metadata is for onboarding only.
      // Never trust these fields for authorization/RLS.
      const metadata = {
        full_name: cleanName,
        account_type: accountType,
        adult_self_attested: true,
        ...(cleanEmail && formattedPhone
          ? { pending_phone: formattedPhone }
          : {}),
      };

      if (cleanEmail) {
        // EMAIL SIGNUP:
        // If both details are entered, email is the
        // primary identifier. Phone is unverified and
        // must be linked separately after authentication.

        const emailRedirectTo =
          Platform.OS === "web" && typeof window !== "undefined"
            ? `${window.location.origin}/login`
            : undefined;

        const { data, error: signupError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: metadata,
            ...(emailRedirectTo ? { emailRedirectTo } : {}),
          },
        });

        if (signupError) throw signupError;

        setPassword("");
        setConfirmPassword("");

        if (data.session) {
          setStep("done");
          setMessage(
            formattedPhone
              ? "Account created. Your mobile number is not verified yet. You can link it after signing in."
              : "Your account has been created successfully.",
          );
        } else {
          setStep("email");
          setMessage(
            formattedPhone
              ? "Check your email to verify your account. Your mobile number will need separate verification later."
              : "If your email is eligible, a verification link will be sent. Check your inbox and spam folder.",
          );
        }
      } else if (formattedPhone) {
        // PHONE-ONLY SIGNUP:
        // Requires Supabase Phone Auth and SMS provider.

        const { data, error: signupError } = await supabase.auth.signUp({
          phone: formattedPhone,
          password,
          options: {
            channel: "sms",
            data: metadata,
          },
        });

        if (signupError) throw signupError;

        setPassword("");
        setConfirmPassword("");

        if (data.session) {
          setStep("done");
          setMessage("Your account has been created successfully.");
        } else {
          setSmsPhone(formattedPhone);
          setOtp("");
          setStep("sms");
          setMessage(
            "If eligible, a verification code has been sent to your mobile number.",
          );
        }
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create your account.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifySms() {
    if (isSubmitting) return;

    setError("");
    setMessage("");

    if (!/^\d{6}$/.test(otp.trim())) {
      setError("Please enter the 6-digit SMS code.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone: smsPhone,
        token: otp.trim(),
        type: "sms",
      });

      if (verifyError) throw verifyError;

      if (!data.session) {
        setError("Verification could not be completed. Please try again.");
        return;
      }

      setOtp("");
      setStep("done");
      setMessage(
        "Your mobile number has been verified and your account is ready.",
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to verify SMS code.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.wrapper}>
            {/* Background decoration */}
            <View pointerEvents="none" style={styles.topGlow} />
            <View pointerEvents="none" style={styles.bottomGlow} />
            <View pointerEvents="none" style={styles.arch} />

            {/* Header */}
            <View style={styles.header}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.replace("/account-type")}
                style={styles.backButton}
              >
                <Text style={styles.backText}>←</Text>
              </Pressable>

              <Text style={styles.brand}>
                <Text style={styles.brandGold}>♡ </Text>
                Rishta <Text style={styles.brandGold}>App</Text>
              </Text>

              <View style={styles.stepBox}>
                <Text style={styles.stepText}>Step 2 of 5</Text>

                <View style={styles.progressRow}>
                  {[0, 1, 2, 3, 4].map((index) => (
                    <View
                      key={index}
                      style={[
                        styles.progressDot,
                        index < 2 && styles.progressDotActive,
                      ]}
                    />
                  ))}
                </View>
              </View>
            </View>

            {/* Main title */}
            <View style={styles.intro}>
              <Text style={styles.ornament}>❧</Text>

              <Text style={styles.title}>
                {step === "form"
                  ? "Create Your Account"
                  : step === "sms"
                    ? "Verify Your Mobile"
                    : step === "email"
                      ? "Check Your Email"
                      : "Welcome to Rishta App"}
              </Text>

              <Text style={styles.subtitle}>
                {step === "form"
                  ? "Enter your basic details to get started."
                  : step === "sms"
                    ? "Enter the verification code sent to your phone."
                    : step === "email"
                      ? "Complete email verification to continue."
                      : "Your new journey begins here."}
              </Text>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerHeart}>♡</Text>
                <View style={styles.dividerLine} />
              </View>
            </View>

            {step === "form" ? (
              <View style={styles.form}>
                <Text style={styles.roleNote}>
                  Creating an account as:{" "}
                  {accountType === "guardian" ? "Parent / Guardian" : "Single"}
                </Text>

                {/* Full Name */}
                <Text style={styles.label}>
                  ♙ Full Name <Text style={styles.required}>*</Text>
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor={C.muted}
                  value={name}
                  onChangeText={setName}
                  autoComplete="name"
                  editable={!isSubmitting}
                />

                {/* Email */}

                <Text style={styles.label}>
                  ✉ Email Address <Text style={styles.required}>*</Text>
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Enter your email address"
                  placeholderTextColor={C.muted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  editable={!isSubmitting}
                />

                {/* Mobile */}
                <Text style={styles.label}>
                  ☎ Mobile Number{" "}
                  <Text style={styles.optional}>(Optional)</Text>
                </Text>

                <View style={styles.phoneInputRow}>
                  <View style={styles.countryCode}>
                    <Text style={styles.countryText}>🇵🇰 +92</Text>
                  </View>

                  <TextInput
                    style={styles.phoneInput}
                    placeholder="03001234567"
                    placeholderTextColor={C.muted}
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                    autoComplete="tel"
                    editable={!isSubmitting}
                  />
                </View>

                <Text style={styles.helper}>
                  Email address is required. Mobile number is optional. No SMS
                  verification is required at this stage.
                </Text>

                {email.trim() && phone.trim() ? (
                  <Text style={styles.secondaryNote}>
                    Both provided: Email se signup hoga. Mobile number ko baad
                    mein OTP se verify aur link karna hoga.
                  </Text>
                ) : null}

                {/* Password */}
                <Text style={styles.label}>
                  ♢ Password <Text style={styles.required}>*</Text>
                </Text>

                <View style={styles.passwordRow}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Create a strong password"
                    placeholderTextColor={C.muted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="new-password"
                    editable={!isSubmitting}
                  />

                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.showButton}
                    accessibilityRole="button"
                  >
                    <Text style={styles.showText}>
                      {showPassword ? "Hide" : "Show"}
                    </Text>
                  </Pressable>
                </View>

                {/* Confirm Password */}
                <Text style={styles.label}>
                  ♢ Confirm Password <Text style={styles.required}>*</Text>
                </Text>

                <View style={styles.passwordRow}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Re-enter your password"
                    placeholderTextColor={C.muted}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoComplete="new-password"
                    editable={!isSubmitting}
                  />

                  <Pressable
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.showButton}
                    accessibilityRole="button"
                  >
                    <Text style={styles.showText}>
                      {showConfirmPassword ? "Hide" : "Show"}
                    </Text>
                  </Pressable>
                </View>

                {/* Age confirmation */}
                <Pressable
                  style={styles.checkboxRow}
                  onPress={() => !isSubmitting && setIsAdult(!isAdult)}
                  accessibilityRole="checkbox"
                  accessibilityState={{
                    checked: isAdult,
                  }}
                  disabled={isSubmitting}
                >
                  <View
                    style={[styles.checkbox, isAdult && styles.checkboxChecked]}
                  >
                    {isAdult ? <Text style={styles.checkmark}>✓</Text> : null}
                  </View>

                  <Text style={styles.checkboxText}>
                    I confirm that I am 18 years or older.
                  </Text>
                </Pressable>

                {error ? (
                  <Text style={styles.error} accessibilityRole="alert">
                    {error}
                  </Text>
                ) : null}

                {/* Create Account */}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void handleSignup()}
                  disabled={isSubmitting}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    (pressed || isSubmitting) && styles.pressed,
                  ]}
                >
                  <Text style={styles.primaryButtonText}>
                    {isSubmitting ? "Creating Account..." : "Create Account  →"}
                  </Text>
                </Pressable>
              </View>
            ) : step === "sms" ? (
              <View style={styles.form}>
                <Text style={styles.infoText}>
                  Verification code for {smsPhone}
                </Text>

                <Text style={styles.label}>SMS Verification Code</Text>

                <TextInput
                  style={styles.input}
                  placeholder="Enter 6-digit code"
                  placeholderTextColor={C.muted}
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoComplete="one-time-code"
                  editable={!isSubmitting}
                />

                {message ? <Text style={styles.message}>{message}</Text> : null}

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <Pressable
                  accessibilityRole="button"
                  onPress={() => void handleVerifySms()}
                  disabled={isSubmitting}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>
                    {isSubmitting ? "Verifying..." : "Verify Mobile  →"}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.completionCard}>
                <Text style={styles.completionIcon}>
                  {step === "email" ? "✉" : "✓"}
                </Text>

                <Text style={styles.completionTitle}>
                  {step === "email" ? "Verify Your Email" : "Account Created"}
                </Text>

                <Text style={styles.message}>{message}</Text>

                {step === "done" ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.replace("/dashboard")}
                    style={styles.primaryButton}
                  >
                    <Text style={styles.primaryButtonText}>
                      Continue to Dashboard →
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.replace("/login")}
                    style={styles.primaryButton}
                  >
                    <Text style={styles.primaryButtonText}>Go to Login →</Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* Trust and login */}
            <View style={styles.footer}>
              <Text style={styles.privacy}>
                ♢ Your information is private and secure.
              </Text>

              {step === "form" ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push("/login")}
                  style={styles.loginLink}
                >
                  <Text style={styles.loginText}>
                    Already have an account?{" "}
                    <Text style={styles.loginHighlight}>Login</Text>
                  </Text>
                </Pressable>
              ) : null}

              <Text style={styles.footerText}>
                ♡ Meaningful connections start here.
              </Text>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
    alignItems: "center",
  },
  wrapper: {
    width: "100%",
    maxWidth: 620,
    flexGrow: 1,
    overflow: "hidden",
    paddingBottom: 25,
  },

  // Decorative background
  topGlow: {
    position: "absolute",
    top: -130,
    left: -130,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#07483D",
    opacity: 0.65,
  },
  bottomGlow: {
    position: "absolute",
    bottom: -150,
    right: -120,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#07483D",
    opacity: 0.6,
  },
  arch: {
    position: "absolute",
    top: 90,
    left: 5,
    right: 5,
    height: 750,
    borderTopLeftRadius: 300,
    borderTopRightRadius: 300,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "rgba(231,189,121,0.35)",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    paddingBottom: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: C.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  backText: {
    color: C.white,
    fontSize: 26,
  },
  brand: {
    fontFamily: serif,
    fontSize: 22,
    fontWeight: "700",
    color: C.white,
    textAlign: "center",
  },
  brandGold: {
    color: C.gold,
  },
  stepBox: {
    alignItems: "center",
    gap: 8,
  },
  stepText: {
    color: C.white,
    fontSize: 11,
  },
  progressRow: {
    flexDirection: "row",
    gap: 5,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: C.muted,
  },
  progressDotActive: {
    backgroundColor: C.emeraldBright,
    borderColor: C.emeraldBright,
  },

  // Main heading
  intro: {
    alignItems: "center",
    paddingTop: 14,
    paddingBottom: 25,
  },
  ornament: {
    fontSize: 32,
    color: C.gold,
    marginBottom: 10,
  },
  title: {
    fontFamily: serif,
    fontSize: 35,
    lineHeight: 44,
    color: C.white,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 23,
    marginTop: 9,
    textAlign: "center",
  },
  divider: {
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
    fontSize: 30,
    color: C.goldLight,
  },

  // Form
  form: {
    paddingHorizontal: 8,
    gap: 10,
  },
  roleNote: {
    color: C.goldLight,
    textAlign: "center",
    fontSize: 12,
    marginBottom: 12,
  },
  label: {
    color: C.goldLight,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 9,
  },
  required: {
    color: C.gold,
  },
  optional: {
    color: C.muted,
    fontSize: 12,
    fontWeight: "400",
  },
  input: {
    backgroundColor: C.surfaceDark,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 13,
    minHeight: 55,
    paddingHorizontal: 15,
    fontSize: 15,
    color: C.white,
  },
  phoneInputRow: {
    flexDirection: "row",
    minHeight: 55,
    backgroundColor: C.surfaceDark,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 13,
    overflow: "hidden",
  },
  countryCode: {
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: C.border,
  },
  countryText: {
    color: C.white,
    fontSize: 13,
    fontWeight: "700",
  },
  phoneInput: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
    color: C.white,
    fontSize: 15,
  },
  helper: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 4,
    marginBottom: 8,
  },
  secondaryNote: {
    color: C.goldLight,
    fontSize: 12,
    lineHeight: 19,
    backgroundColor: "#26352D",
    borderRadius: 8,
    padding: 10,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 55,
    backgroundColor: C.surfaceDark,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 13,
  },
  passwordInput: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 15,
    color: C.white,
  },
  showButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  showText: {
    color: C.gold,
    fontSize: 13,
    fontWeight: "700",
  },

  // Age confirmation
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    marginTop: 6,
  },
  checkbox: {
    width: 23,
    height: 23,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: C.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: C.emerald,
    borderColor: C.emeraldBright,
  },
  checkmark: {
    color: C.white,
    fontWeight: "900",
  },
  checkboxText: {
    flex: 1,
    color: C.white,
    fontSize: 13,
    lineHeight: 20,
  },

  // Primary action
  primaryButton: {
    width: "100%",
    minHeight: 62,
    backgroundColor: C.emerald,
    borderWidth: 2,
    borderColor: C.emeraldBright,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 17,
    paddingHorizontal: 12,
  },
  primaryButtonText: {
    color: C.white,
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
  },
  pressed: {
    opacity: 0.7,
  },
  error: {
    color: C.error,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  message: {
    color: C.success,
    fontSize: 14,
    lineHeight: 23,
    textAlign: "center",
  },

  // Verification / completion
  infoText: {
    color: C.muted,
    textAlign: "center",
    marginBottom: 18,
    lineHeight: 22,
  },
  completionCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    gap: 18,
    marginHorizontal: 8,
  },
  completionIcon: {
    color: C.gold,
    fontSize: 48,
  },
  completionTitle: {
    color: C.white,
    fontFamily: serif,
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
  },

  // Footer
  footer: {
    alignItems: "center",
    gap: 20,
    paddingTop: 28,
    paddingBottom: 20,
  },
  privacy: {
    color: C.muted,
    fontSize: 13,
    textAlign: "center",
  },
  loginLink: {
    padding: 8,
  },
  loginText: {
    color: C.white,
    fontSize: 14,
    textAlign: "center",
  },
  loginHighlight: {
    color: C.gold,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
  footerText: {
    color: C.muted,
    fontSize: 12,
    textAlign: "center",
    marginTop: 15,
  },
});
