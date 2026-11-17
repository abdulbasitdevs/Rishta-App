import { useRouter } from "expo-router";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Same premium colors used on Find Rishta.
const C = {
  background: "#05151D",
  surface: "#10232D",
  emerald: "#086B54",
  emeraldBright: "#12D894",
  gold: "#E7BD79",
  goldLight: "#FFE2AB",
  white: "#F8FBF9",
  muted: "#B1C1C7",
};

const serif = Platform.select({
  ios: "Georgia",
  android: "serif",
  default: "Georgia",
});

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.wrapper}>
          {/* Decorative background */}
          <View pointerEvents="none" style={styles.topDecoration} />

          <View pointerEvents="none" style={styles.bottomDecoration} />

          {/* Elegant golden arch */}
          <View pointerEvents="none" style={styles.arch} />

          {/* Brand section */}
          <View style={styles.brandSection}>
            <View style={styles.logo}>
              <View style={styles.logoPeople}>
                <View style={styles.logoPerson}>
                  <View style={styles.logoHead} />
                  <View style={styles.logoBody} />
                </View>

                <View style={styles.logoPerson}>
                  <View style={styles.logoHead} />
                  <View style={styles.logoBody} />
                </View>
              </View>

              <Text style={styles.logoHeart}>♥</Text>
            </View>

            <Text style={styles.brandName}>
              <Text style={styles.brandWhite}>Rishta </Text>

              <Text style={styles.brandGold}>App</Text>
            </Text>

            <View style={styles.ornamentRow}>
              <View style={styles.ornamentLine} />

              <Text style={styles.ornament}>✧</Text>

              <View style={styles.ornamentLine} />
            </View>
          </View>

          {/* Main welcome message */}
          <View style={styles.heroSection}>
            <Text style={styles.eyebrow}>YOUR JOURNEY BEGINS HERE</Text>

            <Text style={styles.title}>
              <Text style={styles.titleWhite}>Find Your{"\n"}</Text>

              <Text style={styles.titleGold}>Perfect Rishta</Text>
            </Text>

            <View style={styles.heartDivider}>
              <View style={styles.smallLine} />

              <Text style={styles.dividerHeart}>♡</Text>

              <View style={styles.smallLine} />
            </View>

            <Text style={styles.description}>
              Meaningful and private connections
              {"\n"}for a lifelong partnership.
            </Text>
          </View>

          {/* Trust features */}
          <View style={styles.features}>
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>♢</Text>

              <Text style={styles.featureText}>Privacy{"\n"}First</Text>
            </View>

            <View style={styles.featureDivider} />

            <View style={styles.feature}>
              <Text style={styles.featureIcon}>♙</Text>

              <Text style={styles.featureText}>Member{"\n"}Profiles</Text>
            </View>

            <View style={styles.featureDivider} />

            <View style={styles.feature}>
              <Text style={styles.featureIcon}>♡</Text>

              <Text style={styles.featureText}>Meaningful{"\n"}Matches</Text>
            </View>
          </View>

          {/* Main actions */}
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create Account"
              onPress={() => router.push("/account-type")}
              style={({ pressed }) => [
                styles.createButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.createButtonText}>Create Account →</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="I Already Have an Account"
              onPress={() => router.push("/login")}
              style={({ pressed }) => [
                styles.loginButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.loginButtonText}>
                I Already Have an Account
              </Text>
            </Pressable>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerHeart}>♡</Text>

            <Text style={styles.footerText}>
              Pakistan • 18+ • Designed with privacy in mind
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
    backgroundColor: C.background,
  },

  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },

  wrapper: {
    width: "100%",
    maxWidth: 470,
    flexGrow: 1,
    justifyContent: "space-between",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingBottom: 15,
  },

  // Background decoration
  topDecoration: {
    position: "absolute",
    top: -130,
    left: -140,
    width: 290,
    height: 290,
    borderRadius: 145,
    backgroundColor: "#073D37",
    opacity: 0.65,
  },

  bottomDecoration: {
    position: "absolute",
    bottom: -180,
    right: -130,
    width: 290,
    height: 290,
    borderRadius: 145,
    backgroundColor: "#073D37",
    opacity: 0.55,
  },

  arch: {
    position: "absolute",
    top: 28,
    left: 8,
    right: 8,
    height: 490,
    borderTopLeftRadius: 230,
    borderTopRightRadius: 230,
    borderTopWidth: 1.5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(231, 189, 121, 0.40)",
  },

  // Brand
  brandSection: {
    alignItems: "center",
    paddingTop: 65,
    paddingBottom: 25,
  },

  logo: {
    width: 126,
    height: 124,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  logoPeople: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-end",
    justifyContent: "center",
  },

  logoPerson: {
    alignItems: "center",
    gap: 5,
  },

  logoHead: {
    width: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: C.gold,
  },

  logoBody: {
    width: 47,
    height: 47,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    borderWidth: 6,
    borderBottomWidth: 0,
    borderColor: C.gold,
  },

  logoHeart: {
    position: "absolute",
    bottom: 3,
    color: C.goldLight,
    fontSize: 27,
  },

  brandName: {
    fontSize: 42,
    fontFamily: serif,
    fontWeight: "700",
    textAlign: "center",
  },

  brandWhite: {
    color: C.white,
  },

  brandGold: {
    color: C.gold,
  },

  ornamentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 20,
  },

  ornamentLine: {
    width: 60,
    height: 1,
    backgroundColor: C.gold,
  },

  ornament: {
    color: C.gold,
    fontSize: 30,
  },

  // Hero
  heroSection: {
    alignItems: "center",
    paddingVertical: 30,
  },

  eyebrow: {
    color: C.gold,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2.4,
    marginBottom: 20,
    textAlign: "center",
  },

  title: {
    fontFamily: serif,
    fontSize: 43,
    fontWeight: "700",
    lineHeight: 53,
    textAlign: "center",
  },

  titleWhite: {
    color: C.white,
  },

  titleGold: {
    color: C.goldLight,
  },

  heartDivider: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 22,
    gap: 12,
  },

  smallLine: {
    width: 70,
    height: 1,
    backgroundColor: C.gold,
    opacity: 0.75,
  },

  dividerHeart: {
    color: C.gold,
    fontSize: 32,
    lineHeight: 36,
  },

  description: {
    color: C.muted,
    textAlign: "center",
    fontSize: 16,
    lineHeight: 27,
    maxWidth: 380,
  },

  // Features
  features: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 20,
    paddingBottom: 35,
  },

  feature: {
    flex: 1,
    alignItems: "center",
    gap: 10,
  },

  featureIcon: {
    color: C.gold,
    fontSize: 35,
    lineHeight: 43,
  },

  featureText: {
    color: C.white,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 20,
    textAlign: "center",
  },

  featureDivider: {
    width: 1,
    height: 43,
    backgroundColor: "rgba(231, 189, 121, 0.35)",
  },

  // Buttons
  actions: {
    gap: 16,
    paddingTop: 15,
    width: "100%",
  },

  createButton: {
    minHeight: 62,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.emerald,
    borderWidth: 1.5,
    borderColor: C.emeraldBright,
    paddingHorizontal: 16,
  },

  createButtonText: {
    color: C.white,
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
  },

  loginButton: {
    minHeight: 62,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: C.gold,
    paddingHorizontal: 12,
  },

  loginButtonText: {
    color: C.white,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },

  pressed: {
    opacity: 0.78,
  },

  // Footer
  footer: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
    paddingTop: 32,
  },

  footerHeart: {
    color: C.gold,
    fontSize: 17,
  },

  footerText: {
    color: C.muted,
    fontSize: 10,
    textAlign: "center",
  },
});
