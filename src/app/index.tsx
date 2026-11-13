import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppButton } from "@/components/ui/AppButton";
import { theme } from "@/theme/tokens";

const { colors, spacing, radius } = theme;

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.brand}>
              <View style={styles.brandIcon}>
                <Text style={styles.brandHeart}>♥</Text>
              </View>
              <Text style={styles.brandName}>rishta.</Text>
            </View>

            <View style={styles.countryBadge}>
              <Text style={styles.countryText}>PAKISTAN • 18+</Text>
            </View>
          </View>

          {/* Hero Illustration */}
          <View style={styles.heroSection}>
            <View style={styles.heroCircle}>
              <View style={styles.matchCard}>
                <Text style={styles.cardLabel}>A meaningful connection</Text>

                <View style={styles.profileRow}>
                  <View style={[styles.avatar, styles.avatarOne]}>
                    <Text style={styles.avatarText}>♡</Text>
                  </View>

                  <View style={styles.connectionHeart}>
                    <Text style={styles.connectionIcon}>♥</Text>
                  </View>

                  <View style={[styles.avatar, styles.avatarTwo]}>
                    <Text style={styles.avatarText}>♡</Text>
                  </View>
                </View>

                <View style={styles.matchBadge}>
                  <Text style={styles.matchBadgeText}>
                    Built for lasting bonds
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.heroText}>
              <Text style={styles.eyebrow}>YOUR STORY BEGINS HERE</Text>

              <Text style={styles.title}>
                A beautiful{"\n"}
                beginning to{"\n"}
                forever.
              </Text>

              <Text style={styles.description}>
                Find someone who shares your values, dreams and vision for a
                meaningful marriage.
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <AppButton
              title="Create My Profile"
              onPress={() => router.push("/signup")}
            />

            <AppButton
              title="I Already Have an Account"
              variant="secondary"
              onPress={() => router.push("/login")}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerIcon}>♡</Text>
            <Text style={styles.footerText}>Designed with privacy in mind</Text>
          </View>
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

  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },

  content: {
    width: "100%",
    maxWidth: 440,
    flexGrow: 1,
    justifyContent: "space-between",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  brandIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  brandHeart: {
    color: colors.primary,
    fontSize: 24,
  },

  brandName: {
    color: colors.heading,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -1,
  },

  countryBadge: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  countryText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  heroSection: {
    alignItems: "center",
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },

  heroCircle: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xxl,
  },

  matchCard: {
    width: 205,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    alignItems: "center",
    gap: spacing.lg,
    shadowColor: colors.heading,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },

  cardLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "center",
  },

  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },

  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarOne: {
    backgroundColor: "#EAD9D3",
  },

  avatarTwo: {
    backgroundColor: "#F1DCE5",
  },

  avatarText: {
    fontSize: 30,
    color: colors.primary,
    fontWeight: "600",
  },

  connectionHeart: {
    alignItems: "center",
    justifyContent: "center",
  },

  connectionIcon: {
    fontSize: 20,
    color: colors.primary,
  },

  matchBadge: {
    backgroundColor: "#FFF4F6",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },

  matchBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.primary,
  },

  heroText: {
    alignItems: "center",
  },

  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: spacing.lg,
  },

  title: {
    color: colors.heading,
    fontSize: 38,
    lineHeight: 46,
    fontWeight: "800",
    letterSpacing: -1.2,
    textAlign: "center",
    marginBottom: spacing.lg,
  },

  description: {
    fontSize: 15,
    lineHeight: 25,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 340,
  },

  actions: {
    width: "100%",
    gap: spacing.md,
    paddingTop: spacing.md,
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingTop: spacing.xxl,
  },

  footerIcon: {
    fontSize: 16,
    color: colors.success,
  },

  footerText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
