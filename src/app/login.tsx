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

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin() {
    if (isSubmitting) return;

    setError("");
    setMessage("");

    const cleanEmail = email.trim().toLowerCase();

    // Validate required fields.
    if (!cleanEmail || !password) {
      setError("Please fill in all fields.");
      return;
    }

    // Validate email address.
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Sign in using Supabase Authentication.
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (loginError) {
        if (loginError.code === "email_not_confirmed") {
          setError("Please verify your email address before signing in.");
        } else if (loginError.code === "invalid_credentials") {
          setError("Invalid email or password.");
        } else {
          setError(
            loginError.message || "Unable to sign in. Please try again.",
          );
        }

        return;
      }

      // Verify that an authenticated session exists.
      if (!data.session || !data.user) {
        setError("Unable to establish a login session. Please try again.");
        return;
      }

      // Clear the password after a successful login.
      setPassword("");
      setShowPassword(false);

      // We will add protected dashboard navigation next.

      router.replace("/dashboard");
    } catch {
      setError(
        "Unable to connect right now. Please check your internet connection and try again.",
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
          <View style={styles.content}>
            {/* Back Navigation */}
            <Pressable
              onPress={() => router.replace("/")}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Back to welcome"
            >
              <Text style={styles.backText}>← Back to welcome</Text>
            </Pressable>

            {/* Branding */}
            <View style={styles.header}>
              <View style={styles.logoBox}>
                <Text style={styles.logoHeart}>♥</Text>
              </View>

              <Text style={styles.title}>Welcome back</Text>

              <Text style={styles.subtitle}>
                Your journey to a meaningful connection continues here.
              </Text>
            </View>

            {/* Login Form */}
            <View style={styles.form}>
              <Text style={styles.label}>Email address</Text>

              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                accessibilityLabel="Email address"
                editable={!isSubmitting}
              />

              <Text style={styles.label}>Password</Text>

              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showPassword}
                  autoComplete="current-password"
                  value={password}
                  onChangeText={setPassword}
                  accessibilityLabel="Password"
                  editable={!isSubmitting}
                  onSubmitEditing={() => {
                    void handleLogin();
                  }}
                />

                <Pressable
                  style={styles.showButton}
                  onPress={() => setShowPassword(!showPassword)}
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

              {/* Password reset will be implemented next */}

              <Pressable
                onPress={() => router.push("/forgot-password")}
                hitSlop={12}
                accessibilityRole="button"
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>

              {/* Error Message */}
              {error ? (
                <Text style={styles.error} accessibilityRole="alert">
                  {error}
                </Text>
              ) : null}

              {/* Success Message */}
              {message ? (
                <Text style={styles.message} accessibilityRole="alert">
                  {message}
                </Text>
              ) : null}

              {/* Login Button */}
              <View style={styles.loginAction}>
                <AppButton
                  title="Sign In"
                  onPress={handleLogin}
                  loading={isSubmitting}
                  disabled={isSubmitting}
                />
              </View>
            </View>

            {/* Signup Navigation */}
            <Pressable
              onPress={() => router.push("/signup")}
              style={styles.signupLink}
              accessibilityRole="button"
              accessibilityLabel="Create an account"
            >
              <Text style={styles.signupText}>
                New to Rishta App?{" "}
                <Text style={styles.signupHighlight}>Create an account</Text>
              </Text>
            </Pressable>

            {/* Privacy Note */}
            <View style={styles.footer}>
              <Text style={styles.footerIcon}>♡</Text>
              <Text style={styles.footerText}>Your privacy matters to us</Text>
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
    backgroundColor: colors.background,
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },

  content: {
    width: "100%",
    maxWidth: 440,
  },

  backButton: {
    alignSelf: "flex-start",
    paddingVertical: spacing.sm,
    marginBottom: spacing.xxxl,
  },

  backText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },

  header: {
    alignItems: "center",
    marginBottom: spacing.xxxl,
  },

  logoBox: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },

  logoHeart: {
    color: colors.primary,
    fontSize: 42,
  },

  title: {
    color: colors.heading,
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: spacing.md,
  },

  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 25,
    textAlign: "center",
    maxWidth: 300,
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
    paddingHorizontal: spacing.lg,
    minHeight: 54,
    fontSize: 16,
    color: colors.text,
  },

  passwordContainer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    flexDirection: "row",
    alignItems: "center",
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

  forgotText: {
    alignSelf: "flex-end",
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
    marginTop: spacing.xs,
  },

  loginAction: {
    marginTop: spacing.lg,
  },

  error: {
    color: colors.error,
    fontSize: 13,
  },

  message: {
    color: colors.success,
    fontSize: 13,
    lineHeight: 20,
  },

  signupLink: {
    marginTop: spacing.xxl,
    alignItems: "center",
    paddingVertical: spacing.sm,
  },

  signupText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },

  signupHighlight: {
    color: colors.primary,
    fontWeight: "700",
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.xxxl,
  },

  footerIcon: {
    color: colors.success,
    fontSize: 18,
  },

  footerText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
