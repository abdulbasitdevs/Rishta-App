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

// Same premium theme used across Rishta App.
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

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState("");

  // Existing Supabase Login functionality.
  async function handleLogin() {
    if (isSubmitting) return;

    setError("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);

    try {
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

      if (!data.session || !data.user) {
        setError("Unable to establish a login session. Please try again.");
        return;
      }

      // Clear password from the form after login.
      setPassword("");
      setShowPassword(false);

      // Preserve existing Dashboard navigation.
      router.replace("/dashboard");
    } catch {
      setError(
        "Unable to connect right now. Please check your internet connection.",
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
            {/* Decorative background */}
            <View pointerEvents="none" style={styles.topGlow} />

            <View pointerEvents="none" style={styles.bottomGlow} />

            <View pointerEvents="none" style={styles.goldenArch} />

            {/* Header */}
            <View style={styles.topBar}>
              <Pressable
                onPress={() => router.replace("/")}
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Back to welcome"
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

              <Text style={styles.title}>Welcome Back</Text>

              <Text style={styles.subtitle}>
                Continue your journey to a meaningful
                {"\n"}connection.
              </Text>

              <View style={styles.heartDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerHeart}>♡</Text>
                <View style={styles.dividerLine} />
              </View>
            </View>

            {/* Login card */}
            <View style={styles.loginCard}>
              {/* Email Address */}
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
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    accessibilityLabel="Email address"
                    editable={!isSubmitting}
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.labelIcon}>♢</Text>
                  <Text style={styles.label}>Password</Text>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputIcon}>♢</Text>

                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor={C.muted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="current-password"
                    accessibilityLabel="Password"
                    editable={!isSubmitting}
                    returnKeyType="go"
                    onSubmitEditing={() => {
                      void handleLogin();
                    }}
                  />

                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showPassword ? "Hide password" : "Show password"
                    }
                    style={styles.showButton}
                  >
                    <Text style={styles.showText}>
                      {showPassword ? "Hide" : "Show"}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Forgot Password */}
              <Pressable
                onPress={() => router.push("/forgot-password")}
                hitSlop={12}
                accessibilityRole="button"
                style={styles.forgotButton}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </Pressable>

              {/* Login error */}
              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText} accessibilityRole="alert">
                    {error}
                  </Text>
                </View>
              ) : null}

              {/* Sign In Button */}
              <Pressable
                onPress={() => void handleLogin()}
                disabled={isSubmitting}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.signInButton,
                  (pressed || isSubmitting) && styles.pressed,
                ]}
              >
                {isSubmitting ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color={C.white} size="small" />
                    <Text style={styles.signInText}>Signing In...</Text>
                  </View>
                ) : (
                  <Text style={styles.signInText}>Sign In →</Text>
                )}
              </Pressable>

              {/* Create Account */}
              <Pressable
                onPress={() => router.push("/account-type")}
                accessibilityRole="button"
                accessibilityLabel="Create an account"
                style={styles.createAccountLink}
              >
                <Text style={styles.createAccountText}>
                  New to Rishta App?{" "}
                  <Text style={styles.createAccountHighlight}>
                    Create an Account
                  </Text>
                </Text>
              </Pressable>
            </View>

            {/* Privacy footer */}
            <View style={styles.footer}>
              <View style={styles.privacyRow}>
                <Text style={styles.privacyIcon}>♢</Text>

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
    flexGrow: 1,
    width: "100%",
    maxWidth: 520,
    justifyContent: "center",
    paddingBottom: 25,
  },

  // Background decorations
  topGlow: {
    position: "absolute",
    top: -100,
    left: -130,
    width: 270,
    height: 270,
    borderRadius: 135,
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

  // Top navigation
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 34,
    zIndex: 2,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: C.gold,
    backgroundColor: C.surfaceDark,
    alignItems: "center",
    justifyContent: "center",
  },

  backArrow: {
    color: C.gold,
    fontSize: 27,
    lineHeight: 32,
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
    fontSize: 24,
    fontFamily: serif,
    fontWeight: "700",
  },

  brandGold: {
    color: C.gold,
  },

  headerSpacer: {
    width: 44,
  },

  // Welcome heading
  hero: {
    alignItems: "center",
    paddingTop: 28,
    paddingBottom: 30,
  },

  ornamentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },

  ornamentLine: {
    width: 32,
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
    color: C.goldLight,
    fontSize: 39,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 48,
  },

  subtitle: {
    color: C.white,
    fontFamily: serif,
    fontSize: 17,
    lineHeight: 27,
    textAlign: "center",
    maxWidth: 350,
    marginTop: 12,
  },

  heartDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    marginTop: 21,
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

  // Login card
  loginCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 26,
    gap: 16,
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
    gap: 10,
  },

  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  labelIcon: {
    color: C.gold,
    fontSize: 23,
    width: 27,
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
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.surfaceDark,
    paddingLeft: 15,
  },

  inputIcon: {
    fontSize: 23,
    color: C.muted,
    width: 28,
    textAlign: "center",
    marginRight: 10,
  },

  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 54,
    paddingVertical: 10,
    paddingRight: 12,
    color: C.white,
    fontSize: 15,
  },

  showButton: {
    paddingHorizontal: 14,
    paddingVertical: 15,
  },

  showText: {
    color: C.goldLight,
    fontSize: 14,
    fontWeight: "700",
  },

  // Forgot password
  forgotButton: {
    alignSelf: "flex-end",
    paddingVertical: 5,
    marginTop: -3,
  },

  forgotText: {
    color: C.goldLight,
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },

  // Error
  errorBox: {
    backgroundColor: "#3A252A",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#8D4448",
    padding: 12,
  },

  errorText: {
    color: C.error,
    fontSize: 13,
    lineHeight: 20,
  },

  // Sign in button
  signInButton: {
    minHeight: 62,
    width: "100%",
    borderRadius: 34,
    borderWidth: 2,
    borderColor: C.emeraldBright,
    backgroundColor: C.emerald,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    shadowColor: C.emeraldBright,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 3,
  },

  signInText: {
    color: C.white,
    fontSize: 21,
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

  // Signup link
  createAccountLink: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 2,
  },

  createAccountText: {
    color: C.white,
    fontSize: 13,
    lineHeight: 22,
    textAlign: "center",
  },

  createAccountHighlight: {
    color: C.goldLight,
    fontWeight: "800",
    textDecorationLine: "underline",
  },

  // Privacy footer
  footer: {
    alignItems: "center",
    paddingTop: 32,
    gap: 22,
  },

  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  privacyIcon: {
    color: C.gold,
    fontSize: 25,
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
    width: 70,
    height: 1,
    backgroundColor: C.gold,
    opacity: 0.7,
  },

  footerFlower: {
    fontSize: 27,
    color: C.gold,
  },
});
