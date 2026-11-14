import { useRouter } from "expo-router";
import { useState } from "react";
import {
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

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSendResetEmail() {
    if (loading) return;

    setError("");
    setMessage("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (Platform.OS !== "web" || typeof window === "undefined") {
      setError("Password reset is currently available on the web version.");
      return;
    }

    setLoading(true);

    try {
      const redirectTo = `${window.location.origin}/reset-password`;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        {
          redirectTo,
        },
      );

      if (resetError) {
        if (resetError.status === 429) {
          setError("Too many requests. Please wait before trying again.");
        } else {
          setError(
            resetError.message ||
              "Unable to send reset email. Please try again.",
          );
        }

        return;
      }

      setMessage(
        "If an account exists with this email, " +
          "you will receive a password reset link. " +
          "Please check your inbox and spam folder.",
      );
    } catch {
      setError(
        "Unable to connect. Please check your internet connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Pressable
            style={styles.back}
            onPress={() => router.replace("/login")}
          >
            <Text style={styles.backText}>← Back to Sign In</Text>
          </Pressable>

          <View style={styles.header}>
            <View style={styles.logoBox}>
              <Text style={styles.heart}>♥</Text>
            </View>

            <Text style={styles.title}>Forgot Password?</Text>

            <Text style={styles.subtitle}>
              No worries! Enter your registered email address and we'll send you
              a link to reset your password.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Email Address</Text>

            <TextInput
              style={styles.input}
              placeholder="Enter your email address"
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
            />

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText} accessibilityRole="alert">
                  {error}
                </Text>
              </View>
            ) : null}

            {message ? (
              <View style={styles.successBox}>
                <Text style={styles.successText} accessibilityRole="alert">
                  {message}
                </Text>
              </View>
            ) : null}

            <View style={styles.buttonContainer}>
              <AppButton
                title="Send Reset Link"
                onPress={handleSendResetEmail}
                loading={loading}
                disabled={loading}
              />
            </View>

            <Text style={styles.helpText}>Remember your password?</Text>

            <Pressable
              style={styles.loginLink}
              onPress={() => router.replace("/login")}
            >
              <Text style={styles.loginText}>Sign In</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.footer}>Your privacy matters to us ♡</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  back: {
    marginBottom: spacing.xxl,
    alignSelf: "flex-start",
    paddingVertical: spacing.sm,
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
    lineHeight: 24,
    textAlign: "center",
    color: colors.textSecondary,
    maxWidth: 340,
  },
  form: {
    width: "100%",
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  input: {
    minHeight: 54,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    color: colors.text,
  },
  buttonContainer: {
    marginTop: spacing.xl,
  },
  errorBox: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    lineHeight: 22,
  },
  successBox: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  successText: {
    color: colors.success,
    fontSize: 14,
    lineHeight: 23,
  },
  helpText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    marginTop: spacing.xxl,
  },
  loginLink: {
    alignSelf: "center",
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  loginText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "700",
  },
  footer: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: "center",
    marginTop: spacing.xxl,
  },
});
