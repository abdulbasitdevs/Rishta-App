import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppButton } from "@/components/ui/AppButton";
import { supabase } from "@/lib/supabase";
import { theme } from "@/theme/tokens";

const { colors, spacing, radius } = theme;

export default function DashboardScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function checkAuthentication() {
      try {
        const { data, error: authError } = await supabase.auth.getUser();

        if (!active) return;

        if (authError || !data.user) {
          if (
            authError &&
            !["session_not_found", "bad_jwt"].includes(authError.code ?? "")
          ) {
            setError(
              "Unable to verify your session. Please check your connection.",
            );
            return;
          }

          router.replace("/login");
          return;
        }

        setEmail(data.user.email ?? "");
        setFullName(
          typeof data.user.user_metadata?.full_name === "string"
            ? data.user.user_metadata.full_name
            : "Welcome",
        );
      } catch {
        if (active) {
          setError("Unable to verify your session. Please try again.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void checkAuthentication();

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.replace("/login");
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  async function handleLogout() {
    if (signingOut) return;

    setSigningOut(true);
    setError("");

    try {
      const { error: logoutError } = await supabase.auth.signOut({
        scope: "local",
      });

      if (logoutError) {
        setError(logoutError.message);
        return;
      }

      router.replace("/login");
    } catch {
      setError("Unable to log out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Checking your account...</Text>
      </SafeAreaView>
    );
  }

  if (error && !email) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
        <View style={styles.action}>
          <AppButton
            title="Go to Login"
            onPress={() => router.replace("/login")}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoHeart}>♥</Text>
          </View>

          <Text style={styles.title}>Welcome to Rishta App</Text>

          <Text style={styles.subtitle}>
            Your journey towards a meaningful connection starts here.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Account</Text>

          <Text style={styles.label}>Full Name</Text>
          <Text style={styles.value}>{fullName}</Text>

          <View style={styles.divider} />

          <Text style={styles.label}>Email Address</Text>
          <Text style={styles.value}>{email}</Text>

          <View style={styles.divider} />

          <Text style={styles.label}>Account Status</Text>
          <Text style={styles.status}>✓ Signed In</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>What's Next?</Text>

          <Text style={styles.infoText}>
            Your account is ready. Soon you'll be able to create your
            matrimonial profile, set partner preferences, and discover
            meaningful matches.
          </Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.action}>
          <AppButton
            title="Create My Profile"
            onPress={() => router.push("/profile-setup")}
          />
        </View>

        <View style={{ marginTop: 12 }}>
          <AppButton
            title="My Profile"
            onPress={() => router.push("/my-profile")}
          />
        </View>

        <View style={styles.action}>
          <AppButton
            title="Change Password"
            onPress={() => router.push("/change-password")}
          />
        </View>

        <View style={styles.action}>
          <AppButton
            title="Log Out"
            variant="secondary"
            onPress={handleLogout}
            loading={signingOut}
            disabled={signingOut}
          />
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
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },
  content: {
    flexGrow: 1,
    padding: spacing.xl,
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginTop: spacing.xxl,
    marginBottom: spacing.xxl,
    width: "100%",
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
    maxWidth: 340,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  cardTitle: {
    color: colors.heading,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: spacing.xl,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  value: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  status: {
    color: colors.success,
    fontSize: 15,
    fontWeight: "700",
  },
  infoCard: {
    width: "100%",
    maxWidth: 440,
    padding: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceSoft,
    marginBottom: spacing.xl,
  },
  infoTitle: {
    color: colors.heading,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  infoText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 23,
  },
  action: {
    width: "100%",
    maxWidth: 440,
    marginTop: spacing.md,
  },
  error: {
    color: colors.error,
    fontSize: 14,
    textAlign: "center",
    marginVertical: spacing.md,
  },
  footer: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: spacing.xxl,
    textAlign: "center",
  },
});
