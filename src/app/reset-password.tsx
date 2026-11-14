import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

export default function ResetPasswordScreen() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [verified, setVerified] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    let recoveryDetected = false;

    if (Platform.OS !== "web" || typeof window === "undefined") {
      setError("Password recovery is currently available on web.");
      setChecking(false);
      return;
    }

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

    const query = new URLSearchParams(window.location.search);

    const isRecoveryLink =
      hash.get("type") === "recovery" || query.get("type") === "recovery";

    const tokenHash = query.get("token_hash");

    // Listen for Supabase's password recovery event.
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!active) return;

        if (event === "PASSWORD_RECOVERY" && session) {
          recoveryDetected = true;
          setVerified(true);
          setError("");
          setChecking(false);
        }
      },
    );

    async function verifyLink() {
      try {
        // Optional support for custom token-hash emails.
        if (tokenHash && query.get("type") === "recovery") {
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          });

          if (verifyError || !data.session) {
            throw new Error("Invalid or expired recovery link.");
          }

          if (active) {
            recoveryDetected = true;
            setVerified(true);
            setChecking(false);
          }
          return;
        }

        // The default Supabase email link creates a
        // recovery session automatically in the browser.
        const { data, error: userError } = await supabase.auth.getUser();

        if (!active || recoveryDetected) return;

        if (userError || !data.user || !isRecoveryLink) {
          throw new Error(
            "Invalid or expired password reset link. Please request a new one.",
          );
        }

        setVerified(true);
      } catch (err) {
        if (active && !recoveryDetected) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to verify your reset link.",
          );
        }
      } finally {
        if (active && !recoveryDetected) {
          setChecking(false);
        }
      }
    }

    void verifyLink();

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleUpdatePassword() {
    if (loading || !verified) return;

    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setPassword("");
      setConfirmPassword("");
      setVerified(false);
      setSuccess(true);

      // End the recovery session after the password update.
      const { error: logoutError } = await supabase.auth.signOut({
        scope: "local",
      });

      if (logoutError) {
        setError(
          "Password updated, but automatic logout failed. Please log out manually.",
        );
        return;
      }

      router.replace("/login");
    } catch {
      setError("Unable to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />

        <Text style={styles.subtitle}>
          Verifying your password reset link...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.logoBox}>
              <Text style={styles.heart}>♥</Text>
            </View>

            <Text style={styles.title}>Reset Password</Text>

            <Text style={styles.subtitle}>
              {verified
                ? "Create a new secure password for your Rishta App account."
                : success
                  ? "Your password has been updated."
                  : "Verify your email reset link to continue."}
            </Text>
          </View>

          {verified ? (
            <>
              <Text style={styles.label}>New Password</Text>

              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                autoComplete="new-password"
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />

              <Text style={styles.label}>Confirm New Password</Text>

              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                autoComplete="new-password"
                autoCapitalize="none"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!loading}
              />

              {error ? (
                <Text style={styles.error} accessibilityRole="alert">
                  {error}
                </Text>
              ) : null}

              <View style={styles.action}>
                <AppButton
                  title="Update Password"
                  onPress={handleUpdatePassword}
                  loading={loading}
                  disabled={loading}
                />
              </View>
            </>
          ) : (
            <>
              {error ? <Text style={styles.error}>{error}</Text> : null}

              <View style={styles.action}>
                <AppButton
                  title="Request New Reset Link"
                  onPress={() => router.replace("/forgot-password")}
                />
              </View>
            </>
          )}

          <Pressable
            style={styles.back}
            onPress={() => router.replace("/login")}
          >
            <Text style={styles.backText}>← Back to Sign In</Text>
          </Pressable>
        </View>
      </ScrollView>
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
  content: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.xl,
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
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
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
    marginBottom: spacing.lg,
  },
  action: {
    marginTop: spacing.md,
  },
  error: {
    color: colors.error,
    fontSize: 14,
    lineHeight: 22,
    marginTop: spacing.lg,
  },
  back: {
    alignItems: "center",
    marginTop: spacing.xl,
    padding: spacing.sm,
  },
  backText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
});
