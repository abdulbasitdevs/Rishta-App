import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type AccountType = "single" | "guardian";

const C = {
  bg: "#05151D",
  surface: "#102A30",
  emerald: "#086B54",
  emeraldBright: "#12D894",
  gold: "#E7BD79",
  goldLight: "#FFE2AB",
  white: "#F8FBF9",
  muted: "#B1C1C7",
  border: "#36535A",
};

const serif = Platform.select({
  ios: "Georgia",
  android: "serif",
  default: "Georgia",
});

// Simple person icon built with React Native.
function PersonIcon({ small = false }: { small?: boolean }) {
  return (
    <View style={styles.person}>
      <View style={[styles.personHead, small && styles.personHeadSmall]} />
      <View style={[styles.personBody, small && styles.personBodySmall]} />
    </View>
  );
}

export default function AccountTypeScreen() {
  const router = useRouter();

  const [selected, setSelected] = useState<AccountType>("single");

  function handleContinue() {
    router.push({
      pathname: "/signup",
      params: {
        accountType: selected,
      },
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.wrapper}>
          {/* Decorative backgrounds */}
          <View pointerEvents="none" style={styles.topGlow} />

          <View pointerEvents="none" style={styles.bottomGlow} />

          <View pointerEvents="none" style={styles.arch} />

          {/* Top navigation */}
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace("/")}
              style={styles.backButton}
            >
              <Text style={styles.backText}>←</Text>
            </Pressable>

            <Text style={styles.brand}>
              <Text style={styles.brandGold}>♡</Text>
              {"  "}Rishta <Text style={styles.brandGold}>App</Text>
            </Text>

            <View style={styles.stepBox}>
              <Text style={styles.stepText}>Step 1</Text>
              <View style={styles.progress}>
                <View style={styles.progressActive} />
                <View style={styles.progressDot} />
                <View style={styles.progressDot} />
                <View style={styles.progressDot} />
              </View>
            </View>
          </View>

          {/* Main heading */}
          <View style={styles.intro}>
            <Text style={styles.ornament}>❧</Text>

            <Text style={styles.title}>Create Your{"\n"}Account</Text>

            <Text style={styles.subtitle}>
              Let's get started with a few simple steps.
            </Text>

            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.dividerHeart}>♡</Text>
              <View style={styles.line} />
            </View>

            <Text style={styles.question}>Who is creating this account?</Text>

            <Text style={styles.helper}>
              Choose the option that best describes you.
            </Text>
          </View>

          {/* Role selection cards */}
          <View style={styles.cards}>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{
                checked: selected === "single",
              }}
              onPress={() => setSelected("single")}
              style={[
                styles.roleCard,
                selected === "single" && styles.roleCardActive,
              ]}
            >
              {selected === "single" ? (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              ) : null}

              <View style={styles.iconCircle}>
                <PersonIcon />
              </View>

              <Text style={styles.roleTitle}>I am Single</Text>

              <Text style={styles.roleDescription}>
                I want to create my own rishta profile.
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="radio"
              accessibilityState={{
                checked: selected === "guardian",
              }}
              onPress={() => setSelected("guardian")}
              style={[
                styles.roleCard,
                selected === "guardian" && styles.roleCardActive,
              ]}
            >
              {selected === "guardian" ? (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              ) : null}

              <View style={styles.iconCircle}>
                <View style={styles.peopleGroup}>
                  <PersonIcon small />
                  <PersonIcon small />
                </View>
              </View>

              <Text style={styles.roleTitle}>
                I am a Parent{"\n"}or Guardian
              </Text>

              <Text style={styles.roleDescription}>
                I want to create a profile for my son or daughter.
              </Text>
            </Pressable>
          </View>

          {/* Continue button */}
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={handleContinue}
              style={({ pressed }) => [
                styles.continueButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.continueText}>Continue →</Text>
            </Pressable>

            <View style={styles.privacyRow}>
              <Text style={styles.lockIcon}>♢</Text>

              <Text style={styles.privacyText}>
                Your information is private and secure.
              </Text>
            </View>
          </View>

          {/* Decorative footer */}
          <View style={styles.footer}>
            <Text style={styles.footerDecoration}>✧ ♡ ✧</Text>

            <Text style={styles.footerText}>
              Meaningful connections start here.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 18,
    alignItems: "center",
  },
  wrapper: {
    width: "100%",
    maxWidth: 760,
    flexGrow: 1,
    overflow: "hidden",
    paddingBottom: 30,
  },

  // Decorative backgrounds
  topGlow: {
    position: "absolute",
    top: -130,
    left: -130,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#064337",
    opacity: 0.7,
  },
  bottomGlow: {
    position: "absolute",
    bottom: -170,
    right: -120,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#064337",
    opacity: 0.65,
  },
  arch: {
    position: "absolute",
    top: 95,
    left: 4,
    right: 4,
    height: 610,
    borderTopLeftRadius: 350,
    borderTopRightRadius: 350,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "rgba(231, 189, 121, 0.4)",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 30,
    gap: 6,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  backText: {
    color: C.white,
    fontSize: 25,
  },
  brand: {
    color: C.white,
    fontSize: 20,
    fontFamily: serif,
    fontWeight: "700",
  },
  brandGold: {
    color: C.gold,
  },
  stepBox: {
    alignItems: "center",
    gap: 7,
  },
  stepText: {
    color: C.white,
    fontSize: 11,
  },
  progress: {
    flexDirection: "row",
    gap: 5,
  },
  progressActive: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: C.emeraldBright,
  },
  progressDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: C.muted,
  },

  // Intro
  intro: {
    alignItems: "center",
    paddingVertical: 22,
  },
  ornament: {
    color: C.gold,
    fontSize: 38,
    marginBottom: 10,
  },
  title: {
    fontFamily: serif,
    fontSize: 39,
    fontWeight: "700",
    color: C.white,
    textAlign: "center",
    lineHeight: 49,
  },
  subtitle: {
    color: C.muted,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 23,
    marginTop: 13,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginVertical: 25,
  },
  line: {
    width: 65,
    height: 1,
    backgroundColor: C.gold,
  },
  dividerHeart: {
    color: C.goldLight,
    fontSize: 30,
  },
  question: {
    color: C.white,
    fontFamily: serif,
    fontWeight: "700",
    fontSize: 26,
    textAlign: "center",
    lineHeight: 34,
  },
  helper: {
    color: C.muted,
    fontSize: 14,
    textAlign: "center",
    marginTop: 10,
  },

  // Role cards
  cards: {
    flexDirection: "row",
    gap: 12,
    marginTop: 25,
  },
  roleCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 250,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 22,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 24,
  },
  roleCardActive: {
    borderColor: C.emeraldBright,
    backgroundColor: "#073B35",
    borderWidth: 2,
  },
  checkmark: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 27,
    height: 27,
    backgroundColor: C.emeraldBright,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmarkText: {
    color: C.bg,
    fontSize: 17,
    fontWeight: "900",
  },
  iconCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#174B42",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  person: {
    alignItems: "center",
    justifyContent: "center",
  },
  personHead: {
    width: 24,
    height: 24,
    backgroundColor: C.gold,
    borderRadius: 12,
    marginBottom: 5,
  },
  personHeadSmall: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  personBody: {
    width: 47,
    height: 34,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: C.gold,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  personBodySmall: {
    width: 32,
    height: 30,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  peopleGroup: {
    flexDirection: "row",
    gap: 2,
  },
  roleTitle: {
    fontFamily: serif,
    color: C.white,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 25,
    marginBottom: 12,
  },
  roleDescription: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },

  // Continue
  actions: {
    paddingTop: 35,
    gap: 20,
    alignItems: "center",
  },
  continueButton: {
    width: "100%",
    maxWidth: 560,
    minHeight: 63,
    borderRadius: 36,
    backgroundColor: C.emerald,
    borderWidth: 2,
    borderColor: C.emeraldBright,
    alignItems: "center",
    justifyContent: "center",
  },
  continueText: {
    color: C.white,
    fontSize: 21,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.75,
  },
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  lockIcon: {
    color: C.gold,
    fontSize: 23,
  },
  privacyText: {
    color: C.muted,
    fontSize: 13,
    textAlign: "center",
    flexShrink: 1,
  },

  // Footer
  footer: {
    alignItems: "center",
    paddingTop: 45,
  },
  footerDecoration: {
    color: C.gold,
    fontSize: 22,
  },
  footerText: {
    color: C.muted,
    fontSize: 12,
    marginTop: 10,
  },
});
