import { useRouter } from "expo-router";
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

import { AppButton } from "@/components/ui/AppButton";
import { supabase } from "@/lib/supabase";
import { theme } from "@/theme/tokens";

const { colors, spacing, radius } = theme;

export default function SignupScreen() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isAdult, setIsAdult] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignup() {
    if (isSubmitting) return;

    setError("");
    setMessage("");

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Validate required fields.
    if (!cleanName || !cleanEmail || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    // Validate email address.
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    // Validate password.
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // Confirm minimum age.
    if (!isAdult) {
      setError("You must confirm that you are 18 or older.");
      return;
    }

    setIsSubmitting(true);

    try {
      // For Expo Web, use our login page after email confirmation.
      // This URL must be allowed in Supabase URL Configuration.
      const emailRedirectTo =
        Platform.OS === "web" && typeof window !== "undefined"
          ? `${window.location.origin}/login`
          : undefined;

      // Create a real user with Supabase Authentication.
      const { data, error: signupError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
          },
          ...(emailRedirectTo ? { emailRedirectTo } : {}),
        },
      });

      if (signupError) {
        setError(signupError.message);
        return;
      }

      // Clear password fields after successful submission.
      setPassword("");
      setConfirmPassword("");

      if (data.session) {
        // This can happen when email confirmation is disabled.
        setMessage("Your account has been created successfully.");
      } else {
        // With email confirmation enabled, a session is
        // normally not created until email verification.
        setMessage(
          "If this email is eligible, a verification email will be sent. Please check your inbox and spam folder.",
        );
      }
    } catch {
      setError("Unable to create your account right now. Please try again.");
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
          <View style={styles.content}>
            {/* Back navigation */}
            <Pressable
              onPress={() => router.replace("/")}
              style={styles.backButton}
              accessibilityRole="button"
            >
              <Text style={styles.backText}>← Back to welcome</Text>
            </Pressable>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoBox}>
                <Text style={styles.logoHeart}>♥</Text>
              </View>

              <Text style={styles.title}>Begin your journey</Text>

              <Text style={styles.subtitle}>
                Create your account and take the first step towards a meaningful
                connection.
              </Text>
            </View>

            {/* Registration form */}
            <View style={styles.form}>
              <Text style={styles.label}>Full name</Text>

              <TextInput
                style={styles.input}
                placeholder="Your full name"
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={setName}
                autoComplete="name"
                accessibilityLabel="Full name"
                editable={!isSubmitting}
              />

              <Text style={styles.label}>Email address</Text>

              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                accessibilityLabel="Email address"
                editable={!isSubmitting}
              />

              <Text style={styles.label}>Password</Text>

              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="At least 8 characters"
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                  accessibilityLabel="Password"
                  editable={!isSubmitting}
                />

                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.showButton}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  <Text style={styles.showText}>
                    {showPassword ? "Hide" : "Show"}
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.label}>Confirm password</Text>

              <TextInput
                style={styles.input}
                placeholder="Re-enter your password"
                placeholderTextColor={colors.textSecondary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                accessibilityLabel="Confirm password"
                editable={!isSubmitting}
              />

              {/* Age confirmation */}
              <Pressable
                style={styles.checkboxRow}
                onPress={() => {
                  if (!isSubmitting) {
                    setIsAdult(!isAdult);
                  }
                }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isAdult }}
                disabled={isSubmitting}
              >
                <View
                  style={[styles.checkbox, isAdult && styles.checkboxChecked]}
                >
                  {isAdult && <Text style={styles.checkmark}>✓</Text>}
                </View>

                <Text style={styles.checkboxText}>
                  I confirm that I am 18 years or older.
                </Text>
              </Pressable>

              {/* Error message */}
              {error ? (
                <Text style={styles.error} accessibilityRole="alert">
                  {error}
                </Text>
              ) : null}

              {/* Success message */}
              {message ? <Text style={styles.message}>{message}</Text> : null}

              {/* Signup button */}
              <View style={styles.buttonContainer}>
                <AppButton
                  title="Create My Account"
                  onPress={handleSignup}
                  loading={isSubmitting}
                  disabled={isSubmitting}
                />
              </View>
            </View>

            {/* Login navigation */}
            <Pressable
              onPress={() => router.push("/login")}
              style={styles.loginLink}
              accessibilityRole="button"
            >
              <Text style={styles.loginText}>
                Already have an account?{" "}
                <Text style={styles.loginHighlight}>Sign In</Text>
              </Text>
            </Pressable>

            <Text style={styles.footer}>
              A thoughtful beginning to your forever.
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

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    padding: spacing.xl,
  },

  content: {
    width: "100%",
    maxWidth: 440,
  },

  backButton: {
    alignSelf: "flex-start",
    paddingVertical: spacing.sm,
    marginBottom: spacing.xxl,
  },

  backText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },

  header: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },

  logoBox: {
    width: 68,
    height: 68,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },

  logoHeart: {
    color: colors.primary,
    fontSize: 40,
  },

  title: {
    color: colors.heading,
    fontSize: 30,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: spacing.md,
  },

  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
    maxWidth: 330,
  },

  form: {
    gap: spacing.md,
  },

  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },

  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    minHeight: 54,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    color: colors.text,
  },

  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    minHeight: 54,
  },

  passwordInput: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
  },

  showButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },

  showText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "600",
  },

  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },

  checkbox: {
    width: 23,
    height: 23,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  checkboxChecked: {
    backgroundColor: colors.primary,
  },

  checkmark: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 15,
  },

  checkboxText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
  },

  error: {
    color: colors.error,
    fontSize: 13,
    lineHeight: 20,
  },

  message: {
    color: colors.success,
    fontSize: 13,
    lineHeight: 20,
  },

  buttonContainer: {
    marginTop: spacing.lg,
  },

  loginLink: {
    alignItems: "center",
    paddingVertical: spacing.md,
    marginTop: spacing.xl,
  },

  loginText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },

  loginHighlight: {
    color: colors.primary,
    fontWeight: "700",
  },

  footer: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: "center",
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
});
