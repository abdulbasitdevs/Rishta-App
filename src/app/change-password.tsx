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

export default function ChangePasswordScreen() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function checkUser() {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (!active) return;

        if (error || !data.user) {
          router.replace("/login");
          return;
        }
      } catch {
        if (active) {
          setError("Unable to verify your session. Please try again.");
        }
      } finally {
        if (active) setChecking(false);
      }
    }

    void checkUser();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleChangePassword() {
    if (loading) return;

    setError("");
    setMessage("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setError("New password must be different from current password.");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
        current_password: currentPassword,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setMessage("Your password has been updated successfully!");
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
        <Text style={styles.subtitle}>Checking your account...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Pressable onPress={() => router.replace("/dashboard")}>
              <Text style={styles.backText}>← Back to Dashboard</Text>
            </Pressable>

            <View style={styles.header}>
              <View style={styles.logoBox}>
                <Text style={styles.logoHeart}>♥</Text>
              </View>

              <Text style={styles.title}>Change Password</Text>

              <Text style={styles.subtitle}>
                Keep your Rishta App account secure by updating your password.
              </Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>Current Password</Text>

              <TextInput
                style={styles.input}
                placeholder="Enter current password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showPasswords}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                autoCapitalize="none"
                autoComplete="current-password"
                editable={!loading}
              />

              <Text style={styles.label}>New Password</Text>

              <TextInput
                style={styles.input}
                placeholder="At least 8 characters"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showPasswords}
                value={newPassword}
                onChangeText={setNewPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                editable={!loading}
              />

              <Text style={styles.label}>Confirm New Password</Text>

              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showPasswords}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                editable={!loading}
              />

              <Pressable
                style={styles.showRow}
                onPress={() => setShowPasswords(!showPasswords)}
              >
                <Text style={styles.showText}>
                  {showPasswords ? "Hide passwords" : "Show passwords"}
                </Text>
              </Pressable>

              {error ? (
                <Text style={styles.error} accessibilityRole="alert">
                  {error}
                </Text>
              ) : null}

              {message ? (
                <Text style={styles.message} accessibilityRole="alert">
                  {message}
                </Text>
              ) : null}

              <View style={styles.action}>
                <AppButton
                  title="Update Password"
                  onPress={handleChangePassword}
                  loading={loading}
                  disabled={loading}
                />
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
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
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
  backText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: spacing.xxl,
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
  logoHeart: {
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
    marginTop: spacing.sm,
  },
  form: {
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    minHeight: 54,
    fontSize: 16,
    color: colors.text,
  },
  showRow: {
    alignSelf: "flex-end",
    paddingVertical: spacing.sm,
  },
  showText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 13,
  },
  action: {
    marginTop: spacing.md,
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
});
