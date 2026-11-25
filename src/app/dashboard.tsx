import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "@/lib/supabase";

// Same premium colors used on all Rishta App pages.
const C = {
  bg: "#05151D",
  surface: "#102A30",
  surfaceDark: "#08252C",
  panel: "#0A3031",
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

type QuickActionProps = {
  icon: string;
  title: string;
  description: string;
  onPress: () => void;
  featured?: boolean;
};

function QuickAction({
  icon,
  title,
  description,
  onPress,
  featured = false,
}: QuickActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickCard,
        featured && styles.quickCardFeatured,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.quickIconCircle}>
        <Text style={styles.quickIcon}>{icon}</Text>
      </View>

      <Text style={styles.quickTitle}>{title}</Text>

      <Text style={styles.quickDescription}>{description}</Text>
    </Pressable>
  );
}

type BottomItemProps = {
  icon: string;
  label: string;
  active?: boolean;
  onPress: () => void;
};

function BottomItem({ icon, label, active = false, onPress }: BottomItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.bottomItem,
        active && styles.bottomItemActive,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.bottomIcon, active && styles.bottomIconActive]}>
        {icon}
      </Text>

      <Text
        style={[styles.bottomLabel, active && styles.bottomLabelActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [fullName, setFullName] = useState("Member");
  const [profileComplete, setProfileComplete] = useState(false);

  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  // Check real Supabase user session.
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

        const user = data.user;

        const savedName =
          typeof user.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name.trim()
            : "";

        setFullName(savedName || "Member");
        setAuthenticated(true);

        // Read existing profile without changing any saved profile data.
        // Supports the common user_id key, with id fallback for schemas using auth UID as PK.
        let { data: savedProfile, error: profileError } = await supabase
          .from("rishta_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        if (
          profileError?.code === "42703" ||
          profileError?.code === "PGRST204"
        ) {
          const fallback = await supabase
            .from("rishta_profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();
          savedProfile = fallback.data;
          profileError = fallback.error;
        }
        if (active && !profileError && savedProfile) {
          const profile = savedProfile as Record<string, unknown>;
          const explicitStatus =
            profile.profile_completed ??
            profile.is_profile_complete ??
            profile.is_complete ??
            profile.onboarding_completed;
          const basicProfileReady =
            Boolean(profile.gender) &&
            Boolean(
              profile.date_of_birth ?? profile.dob ?? profile.birth_date,
            ) &&
            Boolean(profile.marital_status) &&
            Boolean(profile.city ?? profile.current_city ?? profile.location) &&
            Boolean(
              profile.education ??
              profile.education_level ??
              profile.qualification,
            ) &&
            Boolean(profile.profession ?? profile.occupation);
          setProfileComplete(
            typeof explicitStatus === "boolean"
              ? explicitStatus
              : basicProfileReady,
          );
        }
        setError("");
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
      if (!active) return;

      if (event === "SIGNED_OUT") {
        setAuthenticated(false);
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
    setMenuOpen(false);

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

  const firstName = fullName.split(/\s+/)[0] || "Member";

  const initials =
    fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "R";

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.loadingHeart}>♡</Text>

        <Text style={styles.loadingBrand}>
          Rishta <Text style={styles.brandGold}>App</Text>
        </Text>

        <ActivityIndicator size="large" color={C.emeraldBright} />

        <Text style={styles.loadingText}>Checking your account...</Text>
      </SafeAreaView>
    );
  }

  if (!authenticated) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.loadingHeart}>♡</Text>

        <Text style={styles.loadingText}>{error || "Opening login..."}</Text>

        {error ? (
          <Pressable
            accessibilityRole="button"
            style={styles.primaryButton}
            onPress={() => router.replace("/login")}
          >
            <Text style={styles.primaryButtonText}>Go to Login →</Text>
          </Pressable>
        ) : (
          <ActivityIndicator color={C.emeraldBright} />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.wrapper}>
          {/* Background decorations */}
          <View pointerEvents="none" style={styles.topGlow} />

          <View pointerEvents="none" style={styles.goldenArch} />

          {/* Header */}
          <View style={styles.topBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open menu"
              accessibilityState={{
                expanded: menuOpen,
              }}
              onPress={() => setMenuOpen(!menuOpen)}
              style={styles.menuButton}
            >
              <Text style={styles.menuIcon}>☰</Text>
            </Pressable>

            <View style={styles.brandGroup}>
              <Text style={styles.brandHeart}>♡</Text>

              <Text style={styles.brandName}>
                Rishta <Text style={styles.brandGold}>App</Text>
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="My Profile"
              onPress={() => router.push("/my-profile")}
              style={styles.smallAvatar}
            >
              <Text style={styles.smallAvatarText}>{initials}</Text>
            </Pressable>
          </View>

          {/* Expandable account menu */}
          {menuOpen ? (
            <View style={styles.menuPanel}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setMenuOpen(false);
                  router.push("/my-profile");
                }}
                style={styles.menuLink}
              >
                <Text style={styles.menuLinkText}>♙ My Profile</Text>
              </Pressable>

              <View style={styles.menuDivider} />

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setMenuOpen(false);
                  router.push("/change-password");
                }}
                style={styles.menuLink}
              >
                <Text style={styles.menuLinkText}>♢ Change Password</Text>
              </Pressable>

              <View style={styles.menuDivider} />

              <Pressable
                accessibilityRole="button"
                disabled={signingOut}
                onPress={() => void handleLogout()}
                style={styles.menuLink}
              >
                <Text style={styles.logoutText}>
                  {signingOut ? "Signing Out..." : "↪  Log Out"}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/* Ornamental heading */}
          <View style={styles.ornamentRow}>
            <View style={styles.ornamentLine} />

            <Text style={styles.ornament}>✦ ❦ ✦</Text>

            <View style={styles.ornamentLine} />
          </View>

          {/* Personalized greeting */}
          <View style={styles.greeting}>
            <View style={styles.largeAvatar}>
              <Text style={styles.largeAvatarText}>{initials}</Text>
            </View>

            <View style={styles.greetingText}>
              <Text style={styles.salaam}>Assalamu Alaikum,</Text>

              <Text style={styles.userName}>{firstName}</Text>

              <Text style={styles.greetingSubtitle}>
                Your journey towards a meaningful connection continues here.
              </Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Access</Text>

            <Text style={styles.sectionOrnament}>✧</Text>
          </View>

          <View style={styles.quickGrid}>
            <QuickAction
              icon="⌕"
              title="Find Rishta"
              description="Discover profiles"
              featured
              onPress={() => router.push("/browse-profiles")}
            />

            <QuickAction
              icon="♡"
              title="Matches"
              description="See accepted matches"
              onPress={() => router.push("/browse-profiles")}
            />

            <QuickAction
              icon="✉"
              title="Invitations"
              description="View received requests"
              onPress={() => router.push("/received-requests")}
            />

            <QuickAction
              icon="♙"
              title="My Profile"
              description="View your details"
              onPress={() => router.push("/my-profile")}
            />
          </View>

          {/* Profile setup card */}
          <View style={styles.profileCard}>
            <View style={styles.profileCardTop}>
              <View style={styles.profileCardIcon}>
                <Text style={styles.profileIconText}>♡</Text>
              </View>

              <View style={styles.profileCardText}>
                <Text style={styles.profileCardTitle}>
                  {profileComplete
                    ? "Your Profile Is Complete"
                    : "Complete Your Profile"}
                </Text>

                <Text style={styles.profileCardDescription}>
                  {profileComplete
                    ? "Your profile is ready. Keep your details up to date."
                    : "Tell us about yourself and your preferences to help others get to know you."}
                </Text>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/profile-setup")}
              style={({ pressed }) => [
                styles.profileButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.profileButtonText}>
                {profileComplete
                  ? "Edit Your Profile →"
                  : "Set Up My Profile →"}
              </Text>
            </Pressable>
          </View>

          {/* Error message */}
          {error ? (
            <Text style={styles.errorText} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}

          <View style={styles.footer}>
            <Text style={styles.footerHeart}>♡</Text>

            <Text style={styles.footerText}>Your privacy matters to us</Text>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Navigation */}
      <View style={styles.bottomNavOuter}>
        <View style={styles.bottomNav}>
          <BottomItem icon="⌂" label="Home" active onPress={() => {}} />

          <BottomItem
            icon="⌕"
            label="Find Rishta"
            onPress={() => router.push("/browse-profiles")}
          />

          <BottomItem
            icon="✉"
            label="Requests"
            onPress={() => router.push("/received-requests")}
          />

          <BottomItem
            icon="♙"
            label="Profile"
            onPress={() => router.push("/my-profile")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

  centered: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
    gap: 15,
  },

  loadingHeart: {
    color: C.gold,
    fontSize: 56,
  },

  loadingBrand: {
    color: C.white,
    fontFamily: serif,
    fontSize: 30,
    fontWeight: "700",
  },

  loadingText: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },

  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 35,
  },

  wrapper: {
    width: "100%",
    maxWidth: 620,
  },

  // Background decorations
  topGlow: {
    position: "absolute",
    top: -140,
    left: -130,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#074239",
    opacity: 0.6,
  },

  goldenArch: {
    position: "absolute",
    top: 35,
    left: 0,
    right: 0,
    height: 385,
    borderTopLeftRadius: 280,
    borderTopRightRadius: 280,
    borderTopWidth: 1.5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(231,189,121,0.35)",
  },

  // Header
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingBottom: 22,
    zIndex: 2,
  },

  menuButton: {
    width: 44,
    height: 44,
    borderWidth: 1.5,
    borderColor: C.gold,
    borderRadius: 13,
    backgroundColor: C.surfaceDark,
    alignItems: "center",
    justifyContent: "center",
  },

  menuIcon: {
    color: C.gold,
    fontSize: 24,
  },

  brandGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  brandHeart: {
    color: C.gold,
    fontSize: 32,
  },

  brandName: {
    fontFamily: serif,
    color: C.white,
    fontSize: 23,
    fontWeight: "700",
  },

  brandGold: {
    color: C.gold,
  },

  smallAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.emerald,
    borderWidth: 1.5,
    borderColor: C.gold,
    alignItems: "center",
    justifyContent: "center",
  },

  smallAvatarText: {
    color: C.white,
    fontSize: 15,
    fontWeight: "800",
  },

  // Account menu
  menuPanel: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginBottom: 12,
  },

  menuLink: {
    paddingVertical: 14,
  },

  menuLinkText: {
    color: C.white,
    fontSize: 14,
    fontWeight: "600",
  },

  menuDivider: {
    height: 1,
    backgroundColor: C.border,
    opacity: 0.5,
  },

  logoutText: {
    color: C.goldLight,
    fontSize: 14,
    fontWeight: "700",
  },

  // Decorative heading
  ornamentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 20,
  },

  ornamentLine: {
    width: 35,
    height: 1,
    backgroundColor: C.gold,
  },

  ornament: {
    color: C.gold,
    fontSize: 24,
  },

  // Greeting
  greeting: {
    flexDirection: "row",
    alignItems: "center",
    gap: 17,
    marginBottom: 25,
  },

  largeAvatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "#17483C",
    borderWidth: 2,
    borderColor: C.gold,
    alignItems: "center",
    justifyContent: "center",
  },

  largeAvatarText: {
    fontSize: 28,
    fontWeight: "800",
    color: C.goldLight,
  },

  greetingText: {
    flex: 1,
    gap: 4,
  },

  salaam: {
    color: C.white,
    fontFamily: serif,
    fontSize: 17,
  },

  userName: {
    color: C.goldLight,
    fontFamily: serif,
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 35,
  },

  greetingSubtitle: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 20,
  },

  // Profile setup card
  profileCard: {
    backgroundColor: C.panel,
    borderWidth: 1.5,
    borderColor: C.emeraldBright,
    borderRadius: 22,
    padding: 19,
    marginBottom: 30,
    gap: 19,
  },

  profileCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },

  profileCardIcon: {
    width: 61,
    height: 61,
    borderRadius: 17,
    backgroundColor: "#17483C",
    borderWidth: 1,
    borderColor: C.gold,
    alignItems: "center",
    justifyContent: "center",
  },

  profileIconText: {
    color: C.gold,
    fontSize: 36,
  },

  profileCardText: {
    flex: 1,
    gap: 7,
  },

  profileCardTitle: {
    color: C.white,
    fontFamily: serif,
    fontSize: 22,
    fontWeight: "700",
  },

  profileCardDescription: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 20,
  },

  profileButton: {
    minHeight: 49,
    backgroundColor: C.emerald,
    borderWidth: 1.5,
    borderColor: C.emeraldBright,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  profileButtonText: {
    color: C.white,
    fontSize: 15,
    fontWeight: "800",
  },

  // Section headings
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    marginTop: 2,
  },

  sectionTitle: {
    color: C.goldLight,
    fontFamily: serif,
    fontSize: 25,
    fontWeight: "700",
    flexShrink: 1,
  },

  sectionOrnament: {
    color: C.gold,
    fontSize: 26,
  },

  // Quick Action Grid
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 34,
  },

  quickCard: {
    width: "48%",
    minHeight: 160,
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.gold,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  quickCardFeatured: {
    backgroundColor: "#06493C",
    borderColor: C.emeraldBright,
  },

  quickIconCircle: {
    width: 53,
    height: 53,
    borderRadius: 27,
    backgroundColor: "#16483F",
    alignItems: "center",
    justifyContent: "center",
  },

  quickIcon: {
    color: C.gold,
    fontSize: 34,
    lineHeight: 42,
  },

  quickTitle: {
    fontFamily: serif,
    color: C.white,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },

  quickDescription: {
    color: C.muted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
  },
  primaryButton: {
    width: "100%",
    minHeight: 57,
    backgroundColor: C.emerald,
    borderWidth: 2,
    borderColor: C.emeraldBright,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },

  primaryButtonText: {
    color: C.white,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  pressed: {
    opacity: 0.72,
  },

  errorText: {
    color: C.error,
    fontSize: 13,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 15,
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingTop: 30,
  },

  footerHeart: {
    color: C.gold,
    fontSize: 20,
  },

  footerText: {
    color: C.muted,
    fontSize: 12,
  },

  // Fixed Bottom Navigation
  bottomNavOuter: {
    backgroundColor: C.surfaceDark,
    borderTopWidth: 1.5,
    borderTopColor: C.gold,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 5,
    alignItems: "center",
  },

  bottomNav: {
    width: "100%",
    maxWidth: 620,
    flexDirection: "row",
    gap: 4,
    justifyContent: "space-around",
  },

  bottomItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    borderRadius: 17,
    gap: 3,
  },

  bottomItemActive: {
    backgroundColor: C.emerald,
    borderWidth: 1,
    borderColor: C.emeraldBright,
  },

  bottomIcon: {
    color: C.muted,
    fontSize: 27,
    lineHeight: 32,
  },

  bottomIconActive: {
    color: C.goldLight,
  },

  bottomLabel: {
    color: C.muted,
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },

  bottomLabelActive: {
    color: C.white,
    fontWeight: "800",
  },
});
