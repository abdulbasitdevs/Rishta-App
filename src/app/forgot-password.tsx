import { useRouter } from "expo-router";
import { useState } from "react";
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

// Same premium theme used throughout Rishta App.
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

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Preserve existing Supabase Password Reset logic.
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

    // Preserve the existing web-only reset flow.
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
                accessibilityRole="button"
                accessibilityLabel="Back to Sign In"
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

            {/* Welcome section */}
            <View style={styles.hero}>
              <View style={styles.ornamentRow}>
                <View style={styles.ornamentLine} />

                <Text style={styles.ornament}>✦ ❦ ✦</Text>

                <View style={styles.ornamentLine} />
              </View>

              <Text style={styles.title}>Forgot Password?</Text>

              <Text style={styles.subtitle}>
                No worries! Enter your registered email address and we'll send
                you a link to reset your password.
              </Text>

              <View style={styles.heartDivider}>
                <View style={styles.dividerLine} />

                <Text style={styles.dividerHeart}>♡</Text>

                <View style={styles.dividerLine} />
              </View>
            </View>

            {/* Reset password card */}
            <View style={styles.resetCard}>
              {/* Email field */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.labelIcon}>✉</Text>

                  <Text style={styles.label}>Email Address</Text>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputIcon}>✉</Text>

                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email address"
                    placeholderTextColor={C.muted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);

                      if (error) setError("");
                      if (message) setMessage("");
                    }}
                    accessibilityLabel="Email address"
                    editable={!loading}
                    returnKeyType="send"
                    onSubmitEditing={() => {
                      void handleSendResetEmail();
                    }}
                  />
                </View>
              </View>

              {/* Error message */}
              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorIcon}>!</Text>

                  <Text style={styles.errorText} accessibilityRole="alert">
                    {error}
                  </Text>
                </View>
              ) : null}

              {/* Success message */}
              {message ? (
                <View style={styles.successBox}>
                  <Text style={styles.successIcon}>✓</Text>

                  <Text style={styles.successText} accessibilityRole="alert">
                    {message}
                  </Text>
                </View>
              ) : null}

              {/* Send Reset Link */}
              <Pressable
                onPress={() => void handleSendResetEmail()}
                disabled={loading}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.resetButton,
                  (pressed || loading) && styles.pressed,
                ]}
              >
                {loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={C.white} />

                    <Text style={styles.resetButtonText}>Sending...</Text>
                  </View>
                ) : (
                  <Text style={styles.resetButtonText}>Send Reset Link →</Text>
                )}
              </Pressable>

              {/* Back to Login */}
              <View style={styles.loginSection}>
                <Text style={styles.rememberText}>Remember your password?</Text>

                <Pressable
                  onPress={() => router.replace("/login")}
                  accessibilityRole="button"
                  accessibilityLabel="Sign In"
                  style={({ pressed }) => [
                    styles.loginLink,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.loginText}>Sign In</Text>
                </Pressable>
              </View>
            </View>

            {/* Privacy footer */}
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
  // Main layout
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
    paddingVertical: 22,
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
    top: -120,
    left: -125,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#074239",
    opacity: 0.6,
  },

  bottomGlow: {
    position: "absolute",
    bottom: -155,
    right: -120,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#073D37",
    opacity: 0.6,
  },

  goldenArch: {
    position: "absolute",
    top: 28,
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

  // Top Header
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

  // Hero Section
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
    textAlign: "center",
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

  // Reset Card
  resetCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 30,
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
    gap: 13,
  },

  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  labelIcon: {
    color: C.gold,
    fontSize: 25,
    width: 30,
    textAlign: "center",
  },

  label: {
    color: C.white,
    fontFamily: serif,
    fontSize: 19,
    fontWeight: "700",
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.surfaceDark,
    paddingLeft: 15,
  },

  inputIcon: {
    fontSize: 24,
    color: C.muted,
    width: 30,
    marginRight: 10,
    textAlign: "center",
  },

  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 55,
    fontSize: 15,
    color: C.white,
    paddingVertical: 12,
    paddingRight: 12,
  },

  // Error message
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#30252A",
    borderWidth: 1,
    borderColor: "#B75A64",
    borderRadius: 12,
    padding: 15,
  },

  errorIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.error,
    color: C.error,
    textAlign: "center",
    textAlignVertical: "center",
    fontWeight: "800",
    fontSize: 15,
    lineHeight: 20,
  },

  errorText: {
    flex: 1,
    color: C.error,
    fontSize: 13,
    lineHeight: 21,
  },

  // Success message
  successBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#083E31",
    borderWidth: 1,
    borderColor: "#24B77E",
    borderRadius: 12,
    padding: 15,
  },

  successIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.success,
    color: C.success,
    textAlign: "center",
    textAlignVertical: "center",
    fontWeight: "800",
    fontSize: 15,
    lineHeight: 20,
  },

  successText: {
    flex: 1,
    color: C.success,
    fontSize: 13,
    lineHeight: 21,
  },

  // Reset Button
  resetButton: {
    minHeight: 63,
    width: "100%",
    borderRadius: 35,
    borderWidth: 2,
    borderColor: C.emeraldBright,
    backgroundColor: C.emerald,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingHorizontal: 10,
    shadowColor: C.emeraldBright,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 3,
  },

  resetButtonText: {
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

  // Sign In Link
  loginSection: {
    alignItems: "center",
    gap: 9,
    paddingTop: 7,
  },

  rememberText: {
    color: C.white,
    fontFamily: serif,
    fontSize: 16,
    textAlign: "center",
  },

  loginLink: {
    paddingHorizontal: 14,
    paddingVertical: 7,
  },

  loginText: {
    color: C.goldLight,
    fontFamily: serif,
    fontSize: 19,
    fontWeight: "700",
    textDecorationLine: "underline",
    textAlign: "center",
  },

  // Privacy Footer
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
});
