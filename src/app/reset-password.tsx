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

// Same colors used on Welcome, Signup and Login.
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

export default function ResetPasswordScreen() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [verified, setVerified] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Verify the existing Supabase password recovery link.
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

    // Listen for Supabase password recovery events.
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
        // Support custom token_hash recovery links.
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
            setError("");
            setChecking(false);
          }

          return;
        }

        // Supabase can establish the recovery
        // session automatically after redirect.
        const { data, error: userError } = await supabase.auth.getUser();

        if (!active || recoveryDetected) return;

        if (userError || !data.user || !isRecoveryLink) {
          throw new Error(
            "Invalid or expired password reset link. Please request a new one.",
          );
        }

        setVerified(true);
        setError("");
      } catch (caughtError) {
        if (active && !recoveryDetected) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
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

  // Update password using Supabase Authentication.
  async function handleUpdatePassword() {
    if (loading || !verified) return;

    setError("");

    if (!password) {
      setError("Please enter your new password.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (!confirmPassword) {
      setError("Please confirm your new password.");
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

      // Clear passwords after successful update.
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirmPassword(false);

      setVerified(false);
      setSuccess(true);

      // Preserve original recovery-session logout.
      const { error: logoutError } = await supabase.auth.signOut({
        scope: "local",
      });

      if (logoutError) {
        setError(
          "Password updated, but automatic logout failed. Please log out manually.",
        );
        return;
      }

      // Return to Login after updating.
      router.replace("/login");
    } catch {
      setError("Unable to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Loading screen while verifying recovery link.
  if (checking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingScreen}>
          <Text style={styles.loadingHeart}>♡</Text>

          <Text style={styles.loadingBrand}>
            Rishta <Text style={styles.brandGold}>App</Text>
          </Text>

          <ActivityIndicator size="large" color={C.emeraldBright} />

          <Text style={styles.loadingText}>
            Verifying your password reset link...
          </Text>
        </View>
      </SafeAreaView>
    );
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
            {/* Decorative background */}
            <View pointerEvents="none" style={styles.topGlow} />

            <View pointerEvents="none" style={styles.bottomGlow} />

            <View pointerEvents="none" style={styles.goldenArch} />

            {/* Header */}
            <View style={styles.topBar}>
              <Pressable
                onPress={() => router.replace("/login")}
                style={styles.backButton}
                accessibilityRole="button"
                accessibilityLabel="Back to Sign In"
              >
                <Text style={styles.backArrow}>←</Text>
              </Pressable>

              <View style={styles.brandGroup}>
                <Text style={styles.brandHeart}>♡</Text>

                <Text style={styles.brandName}>
                  Rishta <Text style={styles.brandGold}>App</Text>
                </Text>
              </View>

              <View style={styles.headerSpacer} />
            </View>

            {/* Hero */}
            <View style={styles.hero}>
              <View style={styles.ornamentRow}>
                <View style={styles.ornamentLine} />

                <Text style={styles.ornament}>✦ ❦ ✦</Text>

                <View style={styles.ornamentLine} />
              </View>

              <Text style={styles.title}>
                {success ? "Password Updated" : "Reset Password"}
              </Text>

              <Text style={styles.subtitle}>
                {verified
                  ? "Create a new secure password for your Rishta App account."
                  : success
                    ? "Your password has been updated successfully."
                    : "Verify your email reset link to continue."}
              </Text>

              <View style={styles.heartDivider}>
                <View style={styles.dividerLine} />

                <Text style={styles.dividerHeart}>♡</Text>

                <View style={styles.dividerLine} />
              </View>
            </View>

            {/* Main Card */}
            <View style={styles.resetCard}>
              {verified ? (
                <>
                  {/* New Password */}
                  <View style={styles.fieldGroup}>
                    <View style={styles.labelRow}>
                      <Text style={styles.labelIcon}>♢</Text>

                      <Text style={styles.label}>New Password</Text>
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.inputIcon}>♢</Text>

                      <TextInput
                        style={styles.input}
                        placeholder="Enter new password"
                        placeholderTextColor={C.muted}
                        secureTextEntry={!showPassword}
                        autoComplete="new-password"
                        autoCapitalize="none"
                        value={password}
                        onChangeText={setPassword}
                        editable={!loading}
                        accessibilityLabel="New password"
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
                  </View>

                  {/* Confirm New Password */}
                  <View style={styles.fieldGroup}>
                    <View style={styles.labelRow}>
                      <Text style={styles.labelIcon}>♢</Text>

                      <Text style={styles.label}>Confirm New Password</Text>
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.inputIcon}>♢</Text>

                      <TextInput
                        style={styles.input}
                        placeholder="Confirm new password"
                        placeholderTextColor={C.muted}
                        secureTextEntry={!showConfirmPassword}
                        autoComplete="new-password"
                        autoCapitalize="none"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        editable={!loading}
                        accessibilityLabel="Confirm new password"
                      />

                      <Pressable
                        onPress={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        style={styles.showButton}
                        accessibilityRole="button"
                        accessibilityLabel={
                          showConfirmPassword
                            ? "Hide confirm password"
                            : "Show confirm password"
                        }
                      >
                        <Text style={styles.showText}>
                          {showConfirmPassword ? "Hide" : "Show"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  <Text style={styles.passwordHint}>
                    Use at least 8 characters for your new password.
                  </Text>

                  {/* Error */}
                  {error ? (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorIcon}>!</Text>

                      <Text style={styles.errorText} accessibilityRole="alert">
                        {error}
                      </Text>
                    </View>
                  ) : null}

                  {/* Update Password */}
                  <Pressable
                    onPress={() => void handleUpdatePassword()}
                    disabled={loading}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.primaryButton,
                      (pressed || loading) && styles.pressed,
                    ]}
                  >
                    {loading ? (
                      <View style={styles.loadingRow}>
                        <ActivityIndicator size="small" color={C.white} />

                        <Text style={styles.primaryButtonText}>
                          Updating...
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.primaryButtonText}>
                        Update Password →
                      </Text>
                    )}
                  </Pressable>
                </>
              ) : (
                <>
                  {/* Invalid or completed link */}
                  <View style={styles.statusSection}>
                    <Text style={styles.statusIcon}>{success ? "✓" : "♡"}</Text>

                    <Text style={styles.statusTitle}>
                      {success ? "Password Updated!" : "Reset Link Required"}
                    </Text>

                    <Text style={styles.statusDescription}>
                      {success
                        ? "Your password has been changed."
                        : "Your password reset link may be invalid or expired."}
                    </Text>
                  </View>

                  {error ? (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorText} accessibilityRole="alert">
                        {error}
                      </Text>
                    </View>
                  ) : null}

                  {!success ? (
                    <Pressable
                      onPress={() => router.replace("/forgot-password")}
                      accessibilityRole="button"
                      style={styles.primaryButton}
                    >
                      <Text style={styles.primaryButtonText}>
                        Request New Reset Link →
                      </Text>
                    </Pressable>
                  ) : null}
                </>
              )}

              {/* Back to Login */}
              <Pressable
                onPress={() => router.replace("/login")}
                accessibilityRole="button"
                style={styles.loginLink}
              >
                <Text style={styles.loginText}>← Back to Sign In</Text>
              </Pressable>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <View style={styles.privacyRow}>
                <Text style={styles.privacyIcon}>♡</Text>

                <Text style={styles.privacyText}>
                  Your privacy matters to us
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

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 20,
  },

  wrapper: {
    width: "100%",
    maxWidth: 520,
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: 25,
  },

  // Background
  topGlow: {
    position: "absolute",
    top: -110,
    left: -130,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#074239",
    opacity: 0.6,
  },

  bottomGlow: {
    position: "absolute",
    bottom: -150,
    right: -130,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#073D37",
    opacity: 0.6,
  },

  goldenArch: {
    position: "absolute",
    top: 25,
    left: 0,
    right: 0,
    height: 560,
    borderTopLeftRadius: 240,
    borderTopRightRadius: 240,
    borderTopWidth: 1.5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(231,189,121,0.45)",
  },

  // Header
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 36,
    zIndex: 2,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: C.gold,
    backgroundColor: C.surfaceDark,
    justifyContent: "center",
    alignItems: "center",
  },

  backArrow: {
    color: C.gold,
    fontSize: 27,
    lineHeight: 33,
  },

  brandGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  brandHeart: {
    color: C.gold,
    fontSize: 32,
  },

  brandName: {
    color: C.white,
    fontFamily: serif,
    fontSize: 24,
    fontWeight: "700",
  },

  brandGold: {
    color: C.gold,
  },

  headerSpacer: {
    width: 44,
  },

  // Hero
  hero: {
    alignItems: "center",
    paddingTop: 27,
    paddingBottom: 32,
  },

  ornamentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 20,
  },

  ornamentLine: {
    width: 30,
    height: 1,
    backgroundColor: C.gold,
  },

  ornament: {
    color: C.gold,
    fontSize: 22,
  },

  title: {
    fontFamily: serif,
    fontSize: 36,
    lineHeight: 46,
    fontWeight: "700",
    color: C.goldLight,
    textAlign: "center",
  },

  subtitle: {
    fontFamily: serif,
    fontSize: 16,
    lineHeight: 26,
    color: C.white,
    textAlign: "center",
    maxWidth: 390,
    marginTop: 13,
  },

  heartDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    marginTop: 20,
  },

  dividerLine: {
    width: 74,
    height: 1,
    backgroundColor: C.gold,
    opacity: 0.8,
  },

  dividerHeart: {
    color: C.goldLight,
    fontSize: 34,
    lineHeight: 40,
  },

  // Reset Card
  resetCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 30,
    gap: 20,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 4,
  },

  fieldGroup: {
    gap: 11,
  },

  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  labelIcon: {
    fontSize: 24,
    color: C.gold,
    width: 28,
    textAlign: "center",
  },

  label: {
    color: C.white,
    fontFamily: serif,
    fontSize: 18,
    fontWeight: "700",
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 57,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    backgroundColor: C.surfaceDark,
    paddingLeft: 15,
  },

  inputIcon: {
    color: C.muted,
    fontSize: 24,
    width: 28,
    textAlign: "center",
    marginRight: 10,
  },

  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 54,
    paddingVertical: 10,
    paddingRight: 10,
    color: C.white,
    fontSize: 15,
  },

  showButton: {
    paddingVertical: 15,
    paddingHorizontal: 14,
  },

  showText: {
    color: C.goldLight,
    fontSize: 14,
    fontWeight: "700",
  },

  passwordHint: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 19,
  },

  // Error Box
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#30252A",
    borderWidth: 1,
    borderColor: "#B75A64",
    borderRadius: 12,
    padding: 14,
  },

  errorIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.error,
    color: C.error,
    textAlign: "center",
    fontWeight: "800",
    lineHeight: 20,
  },

  errorText: {
    flex: 1,
    color: C.error,
    fontSize: 13,
    lineHeight: 21,
  },

  // Primary Button
  primaryButton: {
    minHeight: 63,
    width: "100%",
    borderRadius: 35,
    borderWidth: 2,
    borderColor: C.emeraldBright,
    backgroundColor: C.emerald,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    marginTop: 8,
    shadowColor: C.emeraldBright,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 3,
  },

  primaryButtonText: {
    color: C.white,
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  pressed: {
    opacity: 0.7,
  },

  // Status
  statusSection: {
    alignItems: "center",
    gap: 12,
  },

  statusIcon: {
    color: C.gold,
    fontSize: 43,
  },

  statusTitle: {
    color: C.white,
    fontFamily: serif,
    fontSize: 23,
    fontWeight: "700",
    textAlign: "center",
  },

  statusDescription: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 23,
    textAlign: "center",
  },

  // Back to Login
  loginLink: {
    alignItems: "center",
    paddingVertical: 12,
  },

  loginText: {
    color: C.goldLight,
    fontSize: 15,
    fontWeight: "700",
    textDecorationLine: "underline",
  },

  // Footer
  footer: {
    alignItems: "center",
    gap: 24,
    paddingTop: 37,
  },

  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  privacyIcon: {
    color: C.gold,
    fontSize: 27,
  },

  privacyText: {
    color: C.muted,
    fontSize: 13,
  },

  footerOrnament: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  footerLine: {
    width: 75,
    height: 1,
    backgroundColor: C.gold,
    opacity: 0.75,
  },

  footerFlower: {
    color: C.gold,
    fontSize: 27,
  },

  // Link Verification Loading
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 22,
    padding: 25,
  },

  loadingHeart: {
    color: C.gold,
    fontSize: 58,
  },

  loadingBrand: {
    color: C.white,
    fontFamily: serif,
    fontWeight: "700",
    fontSize: 33,
    marginBottom: 20,
  },

  loadingText: {
    color: C.muted,
    fontSize: 14,
    textAlign: "center",
    marginTop: 12,
  },
});
