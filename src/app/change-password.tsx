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

// Same premium colors used across Rishta App.
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

export default function ChangePasswordScreen() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPasswords, setShowPasswords] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Check the existing Supabase session.
  useEffect(() => {
    let active = true;

    async function checkUser() {
      try {
        const { data, error: authError } = await supabase.auth.getUser();

        if (!active) return;

        if (authError || !data.user) {
          if (
            authError &&
            !["session_not_found", "bad_jwt"].includes(authError.code ?? "")
          ) {
            setError("Unable to verify your session. Please try again.");
            return;
          }

          router.replace("/login");
          return;
        }

        setAuthenticated(true);
      } catch {
        if (active) {
          setError("Unable to verify your session. Please try again.");
        }
      } finally {
        if (active) {
          setChecking(false);
        }
      }
    }

    void checkUser();

    return () => {
      active = false;
    };
  }, [router]);

  // Change password through Supabase.
  async function handleChangePassword() {
    if (loading || !authenticated) return;

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

      // Clear all sensitive fields after success.
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswords(false);

      setMessage("Your password has been updated successfully!");
    } catch {
      setError("Unable to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Loading screen.
  if (checking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingScreen}>
          <Text style={styles.loadingHeart}>♡</Text>

          <Text style={styles.loadingBrand}>
            Rishta <Text style={styles.brandGold}>App</Text>
          </Text>

          <ActivityIndicator size="large" color={C.emeraldBright} />

          <Text style={styles.loadingText}>Checking your account...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!authenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingScreen}>
          <Text style={styles.loadingHeart}>♡</Text>

          <Text style={styles.loadingText}>{error || "Opening Login..."}</Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/login")}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Go to Login →</Text>
          </Pressable>
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
            {/* Background decoration */}
            <View pointerEvents="none" style={styles.topGlow} />

            <View pointerEvents="none" style={styles.bottomGlow} />

            <View pointerEvents="none" style={styles.goldenArch} />

            {/* Top header */}
            <View style={styles.topBar}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to Dashboard"
                onPress={() => router.replace("/dashboard")}
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && styles.pressed,
                ]}
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

            {/* Main heading */}
            <View style={styles.hero}>
              <View style={styles.ornamentRow}>
                <View style={styles.ornamentLine} />

                <Text style={styles.ornament}>✦ ❦ ✦</Text>

                <View style={styles.ornamentLine} />
              </View>

              <Text style={styles.title}>Change Password</Text>

              <Text style={styles.subtitle}>
                Keep your Rishta App account secure by updating your password.
              </Text>

              <View style={styles.heartDivider}>
                <View style={styles.dividerLine} />

                <Text style={styles.dividerHeart}>♡</Text>

                <View style={styles.dividerLine} />
              </View>
            </View>

            {/* Password form */}
            <View style={styles.formCard}>
              {/* Current Password */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.labelIcon}>♢</Text>

                  <Text style={styles.label}>Current Password</Text>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputIcon}>♢</Text>

                  <TextInput
                    style={styles.input}
                    placeholder="Enter current password"
                    placeholderTextColor={C.muted}
                    secureTextEntry={!showPasswords}
                    value={currentPassword}
                    onChangeText={(text) => {
                      setCurrentPassword(text);
                      setError("");
                      setMessage("");
                    }}
                    autoCapitalize="none"
                    autoComplete="current-password"
                    editable={!loading}
                    accessibilityLabel="Current password"
                  />
                </View>
              </View>

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
                    placeholder="At least 8 characters"
                    placeholderTextColor={C.muted}
                    secureTextEntry={!showPasswords}
                    value={newPassword}
                    onChangeText={(text) => {
                      setNewPassword(text);
                      setError("");
                      setMessage("");
                    }}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    editable={!loading}
                    accessibilityLabel="New password"
                  />
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
                    secureTextEntry={!showPasswords}
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      setError("");
                      setMessage("");
                    }}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    editable={!loading}
                    accessibilityLabel="Confirm new password"
                    onSubmitEditing={() => {
                      void handleChangePassword();
                    }}
                  />
                </View>
              </View>

              {/* Show / Hide Passwords */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  showPasswords ? "Hide all passwords" : "Show all passwords"
                }
                onPress={() => setShowPasswords(!showPasswords)}
                style={styles.showRow}
              >
                <Text style={styles.showIcon}>{showPasswords ? "◉" : "◎"}</Text>

                <Text style={styles.showText}>
                  {showPasswords ? "Hide Passwords" : "Show Passwords"}
                </Text>
              </Pressable>

              {/* Security information */}
              <View style={styles.securityBox}>
                <Text style={styles.securityIcon}>♡</Text>

                <Text style={styles.securityText}>
                  Choose a strong password with at least 8 characters. Use a
                  password you haven't used before.
                </Text>
              </View>

              {/* Error */}
              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorIcon}>!</Text>

                  <Text style={styles.errorText} accessibilityRole="alert">
                    {error}
                  </Text>
                </View>
              ) : null}

              {/* Success */}
              {message ? (
                <View style={styles.successBox}>
                  <Text style={styles.successIcon}>✓</Text>

                  <Text style={styles.successText} accessibilityRole="alert">
                    {message}
                  </Text>
                </View>
              ) : null}

              {/* Update Password */}
              <Pressable
                accessibilityRole="button"
                onPress={() => void handleChangePassword()}
                disabled={loading}
                style={({ pressed }) => [
                  styles.primaryButton,
                  (pressed || loading) && styles.pressed,
                ]}
              >
                {loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={C.white} />

                    <Text style={styles.primaryButtonText}>Updating...</Text>
                  </View>
                ) : (
                  <Text style={styles.primaryButtonText}>
                    Update Password →
                  </Text>
                )}
              </Pressable>

              {/* Back to Dashboard */}
              <Pressable
                accessibilityRole="button"
                onPress={() => router.replace("/dashboard")}
                style={styles.dashboardLink}
              >
                <Text style={styles.dashboardLinkText}>
                  ← Back to Dashboard
                </Text>
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

  // Background decorations
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
    marginBottom: 35,
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
    paddingTop: 25,
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
    lineHeight: 45,
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
    paddingHorizontal: 8,
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

  // Form Card
  formCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 30,
    gap: 18,
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
    color: C.gold,
    fontSize: 24,
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

  // Show / Hide
  showRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 8,
    paddingVertical: 6,
  },

  showIcon: {
    color: C.gold,
    fontSize: 20,
  },

  showText: {
    color: C.goldLight,
    fontSize: 13,
    fontWeight: "700",
  },

  // Security note
  securityBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    backgroundColor: C.surfaceDark,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 14,
  },

  securityIcon: {
    color: C.gold,
    fontSize: 23,
  },

  securityText: {
    flex: 1,
    color: C.muted,
    fontSize: 12,
    lineHeight: 20,
  },

  // Error
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

  // Success
  successBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#083E31",
    borderWidth: 1,
    borderColor: "#24B77E",
    borderRadius: 12,
    padding: 14,
  },

  successIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.success,
    color: C.success,
    textAlign: "center",
    fontWeight: "800",
    lineHeight: 20,
  },

  successText: {
    flex: 1,
    color: C.success,
    fontSize: 13,
    lineHeight: 21,
  },

  // Update Password button
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

  // Dashboard link
  dashboardLink: {
    alignItems: "center",
    paddingVertical: 12,
  },

  dashboardLinkText: {
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

  // Loading screen
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
