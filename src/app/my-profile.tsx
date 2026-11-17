import { useFocusEffect, useRouter } from "expo-router";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "@/lib/supabase";

// Shared premium palette used throughout Rishta App.
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

// The bucket must remain private in Supabase Storage.
const BUCKET = "Rishta-profile-photos";

type Profile = {
  full_name: string;
  gender: string;
  date_of_birth: string;
  city: string;
  marital_status: string;
  education_level: string | null;
  profession: string | null;
  height_cm: number | null;
  religion: string | null;
  family_overview: string | null;
  preferred_age_min: number | null;
  preferred_age_max: number | null;
  preferred_city: string | null;
  preferred_education: string | null;
  preferred_marital_status: string | null;
  profile_photo_paths: string[];
  photo_visibility: string;
  show_age: boolean;
  show_city: boolean;
  profile_step: number;
};

type DetailRowProps = {
  label: string;
  value: string | number | null | undefined;
  last?: boolean;
};

function DetailRow({ label, value, last = false }: DetailRowProps) {
  const display =
    value === null || value === undefined || value === ""
      ? "Not provided"
      : String(value);

  return (
    <View style={[styles.detailRow, last && styles.lastDetailRow]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{display}</Text>
    </View>
  );
}

type SectionCardProps = {
  title: string;
  subtitle: string;
  symbol: string;
  editLabel?: string;
  onEdit?: () => void;
  children: ReactNode;
};

function SectionCard({
  title,
  subtitle,
  symbol,
  editLabel = "Edit",
  onEdit,
  children,
}: SectionCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionSymbolBox}>
          <Text style={styles.sectionSymbol}>{symbol}</Text>
        </View>
        <View style={styles.sectionHeadingText}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </View>
        {onEdit ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${editLabel} ${title}`}
            onPress={onEdit}
            style={({ pressed }) => [
              styles.editButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.editText}>{editLabel} ›</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

type PrimaryButtonProps = {
  text: string;
  onPress: () => void;
  outline?: boolean;
};

function PrimaryButton({ text, onPress, outline = false }: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        outline && styles.outlineButton,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[styles.primaryButtonText, outline && styles.outlineButtonText]}
      >
        {text}
      </Text>
    </Pressable>
  );
}

function formatBirthDate(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : date;
}

export default function MyProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [discoveryVisible, setDiscoveryVisible] = useState<boolean | null>(
    null,
  );

  // Continue honoring the original sign-out redirect.
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.replace("/login");
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [router]);

  // Refresh whenever this page gets focus, including after editing a step.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError("");
      setPhotoUrls([]);
      setDiscoveryVisible(null);

      async function loadProfile() {
        try {
          const { data: authData, error: authError } =
            await supabase.auth.getUser();

          if (!active) return;

          if (authError || !authData.user) {
            router.replace("/login");
            return;
          }

          const userId = authData.user.id;
          const { data, error: profileError } = await supabase
            .from("rishta_profiles")
            .select(
              "full_name, gender, date_of_birth, city, marital_status, education_level, profession, height_cm, religion, family_overview, preferred_age_min, preferred_age_max, preferred_city, preferred_education, preferred_marital_status, profile_photo_paths, photo_visibility, show_age, show_city, profile_step",
            )
            .eq("user_id", userId)
            .maybeSingle();

          if (!active) return;

          if (profileError) {
            setError(profileError.message);
            return;
          }

          if (!data) {
            router.replace("/profile-setup");
            return;
          }

          setProfile(data as Profile);

          // Signed URLs are for this signed-in owner's own folder only.
          // Never use getPublicUrl() for these private photos.
          const paths: string[] = Array.isArray(data.profile_photo_paths)
            ? data.profile_photo_paths.filter(
                (path: unknown): path is string =>
                  typeof path === "string" && path.startsWith(`${userId}/`),
              )
            : [];

          const urls = await Promise.all(
            paths.map(async (path) => {
              const { data: signed } = await supabase.storage
                .from(BUCKET)
                .createSignedUrl(path, 600);
              return signed?.signedUrl ?? null;
            }),
          );

          if (!active) return;
          setPhotoUrls(urls.filter((url): url is string => url !== null));

          // Optional status display; a failure here must not block My Profile.
          if (data.profile_step >= 4) {
            const { data: discovery, error: discoveryError } = await supabase
              .from("rishta_discovery_profiles")
              .select("is_visible")
              .eq("user_id", userId)
              .maybeSingle();

            if (active && !discoveryError) {
              setDiscoveryVisible(discovery?.is_visible === true);
            }
          }
        } catch {
          if (active)
            setError("Unable to load your profile. Please try again.");
        } finally {
          if (active) setLoading(false);
        }
      }

      void loadProfile();
      return () => {
        active = false;
      };
    }, [router]),
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.loadingHeart}>♡</Text>
        <Text style={styles.loadingBrand}>
          Rishta <Text style={styles.brandGold}>App</Text>
        </Text>
        <ActivityIndicator size="large" color={C.emeraldBright} />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.loadingHeart}>♡</Text>
        <Text style={styles.errorText} accessibilityRole="alert">
          {error || "Profile not available."}
        </Text>
        <View style={styles.errorAction}>
          <PrimaryButton
            text="Back to Dashboard →"
            onPress={() => router.replace("/dashboard")}
          />
        </View>
      </SafeAreaView>
    );
  }

  const step = Math.min(4, Math.max(0, profile.profile_step || 0));
  const isComplete = step >= 4;
  const progressPercent = step * 25;
  const progressWidth: "0%" | "25%" | "50%" | "75%" | "100%" =
    step === 4
      ? "100%"
      : step === 3
        ? "75%"
        : step === 2
          ? "50%"
          : step === 1
            ? "25%"
            : "0%";
  const initials =
    (profile.full_name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "♡";

  const nextStepRoute =
    step < 1
      ? "/profile-setup"
      : step === 1
        ? "/profile-details"
        : step === 2
          ? "/partner-preferences"
          : "/profile-photos";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.wrapper}>
          <View pointerEvents="none" style={styles.topGlow} />
          <View pointerEvents="none" style={styles.goldArch} />

          {/* App header */}
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
            <View style={styles.brandRow}>
              <Text style={styles.brandHeart}>♡</Text>
              <Text style={styles.brandName}>
                Rishta <Text style={styles.brandGold}>App</Text>
              </Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>

          {/* Heading */}
          <View style={styles.headingArea}>
            <View style={styles.ornamentRow}>
              <View style={styles.ornamentLine} />
              <Text style={styles.ornament}>✦ ❦ ✦</Text>
              <View style={styles.ornamentLine} />
            </View>
            <Text style={styles.pageTitle}>My Profile</Text>
            <Text style={styles.pageSubtitle}>
              Your personal details, preferences and privacy controls.
            </Text>
            <View style={styles.heartDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerHeart}>♡</Text>
              <View style={styles.dividerLine} />
            </View>
          </View>

          {/* Profile overview */}
          <View style={styles.heroCard}>
            <View style={styles.avatarBorder}>
              {photoUrls[0] ? (
                <Image
                  source={{ uri: photoUrls[0] }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.avatarInitials}>{initials}</Text>
              )}
            </View>
            <Text style={styles.profileName}>
              {profile.full_name || "My Profile"}
            </Text>
            <Text style={styles.profileCity}>
              {profile.city || "City not provided"}
            </Text>
            <View style={styles.statusChip}>
              <Text style={styles.statusChipText}>
                {isComplete
                  ? "✓ Profile Setup Completed"
                  : `Profile Setup · Step ${step} of 4`}
              </Text>
            </View>
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>PROFILE SETUP</Text>
                <Text style={styles.progressPercent}>{progressPercent}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: progressWidth }]} />
              </View>
            </View>
            <View style={styles.heroActions}>
              <PrimaryButton
                text={isComplete ? "Edit My Profile →" : "Continue Setup →"}
                onPress={() =>
                  router.push(isComplete ? "/profile-setup" : nextStepRoute)
                }
              />
              {isComplete ? (
                <PrimaryButton
                  text="Discovery Settings →"
                  outline
                  onPress={() => router.push("/discovery-settings")}
                />
              ) : null}
            </View>
          </View>

          {/* Basic Information */}
          <SectionCard
            title="Basic Information"
            subtitle="Your essential personal details"
            symbol="♙"
            onEdit={() => router.push("/profile-setup")}
          >
            <DetailRow label="Full Name" value={profile.full_name} />
            <DetailRow label="Gender" value={profile.gender} />
            <DetailRow
              label="Date of Birth"
              value={
                profile.date_of_birth
                  ? formatBirthDate(profile.date_of_birth)
                  : null
              }
            />
            <DetailRow label="City" value={profile.city} />
            <DetailRow
              label="Marital Status"
              value={profile.marital_status}
              last
            />
          </SectionCard>

          {/* Personal and Family */}
          <SectionCard
            title="Personal & Family"
            subtitle="Education, career and background"
            symbol="✦"
            onEdit={() => router.push("/profile-details")}
          >
            <DetailRow label="Education" value={profile.education_level} />
            <DetailRow label="Profession" value={profile.profession} />
            <DetailRow
              label="Height"
              value={
                profile.height_cm != null ? `${profile.height_cm} cm` : null
              }
            />
            <DetailRow label="Religion" value={profile.religion} />
            <DetailRow
              label="Family Overview"
              value={profile.family_overview}
              last
            />
          </SectionCard>

          {/* Partner Preferences */}
          <SectionCard
            title="Partner Preferences"
            subtitle="What you are looking for"
            symbol="♡"
            onEdit={() => router.push("/partner-preferences")}
          >
            <DetailRow
              label="Preferred Age"
              value={
                profile.preferred_age_min != null &&
                profile.preferred_age_max != null
                  ? `${profile.preferred_age_min}–${profile.preferred_age_max} years`
                  : null
              }
            />
            <DetailRow
              label="Preferred City"
              value={profile.preferred_city || "Any City"}
            />
            <DetailRow
              label="Preferred Education"
              value={profile.preferred_education || "Any"}
            />
            <DetailRow
              label="Preferred Marital Status"
              value={profile.preferred_marital_status || "Any"}
              last
            />
          </SectionCard>

          {/* Photos: show signed thumbnails to account owner only. */}
          <SectionCard
            title="Private Photos"
            subtitle="Manage your personal photo gallery"
            symbol="◇"
            onEdit={() => router.push("/profile-photos")}
          >
            <View style={styles.photosCountRow}>
              <Text style={styles.photosCount}>
                {profile.profile_photo_paths?.length ?? 0} of 5 photos added
              </Text>
              <Text style={styles.privateLabel}>PRIVATE</Text>
            </View>
            {photoUrls.length > 0 ? (
              <View style={styles.photoGrid}>
                {photoUrls.map((url, index) => (
                  <Image
                    key={`${index}-${url}`}
                    source={{ uri: url }}
                    style={styles.photo}
                    resizeMode="cover"
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyPhotos}>
                <Text style={styles.emptyPhotosIcon}>♡</Text>
                <Text style={styles.emptyPhotosText}>
                  {profile.profile_photo_paths?.length
                    ? "Photo previews are currently unavailable."
                    : "No profile photos added yet."}
                </Text>
              </View>
            )}
            <View style={styles.privacyNote}>
              <Text style={styles.privacyNoteIcon}>♢</Text>
              <Text style={styles.privacyNoteText}>
                Photos are stored privately. This screen uses temporary signed
                links to preview your own photos; publishing to Discovery does
                not publish them.
              </Text>
            </View>
          </SectionCard>

          {/* Privacy */}
          <SectionCard
            title="Privacy Preferences"
            subtitle="Your saved sharing choices"
            symbol="♢"
            onEdit={() => router.push("/profile-photos")}
          >
            <DetailRow
              label="Photo Visibility"
              value={
                profile.photo_visibility === "private"
                  ? "Private"
                  : "Review Settings"
              }
            />
            <DetailRow
              label="Show Age Preference"
              value={profile.show_age ? "On" : "Off"}
            />
            <DetailRow
              label="Show City Preference"
              value={profile.show_city ? "On" : "Off"}
              last
            />
            <View style={styles.privacyNote}>
              <Text style={styles.privacyNoteIcon}>♡</Text>
              <Text style={styles.privacyNoteText}>
                These are saved preferences. They do not make your photos
                public.
              </Text>
            </View>
          </SectionCard>

          {/* Public Discovery: separate from private details. */}
          {isComplete ? (
            <View style={styles.discoveryCard}>
              <View style={styles.discoveryCardHeader}>
                <Text style={styles.discoverySymbol}>✦</Text>
                <View style={styles.discoveryTextBlock}>
                  <Text style={styles.discoveryTitle}>Public Discovery</Text>
                  <Text style={styles.discoverySubtitle}>
                    Control how other members discover you
                  </Text>
                </View>
              </View>
              {discoveryVisible !== null ? (
                <View style={styles.discoveryStatusRow}>
                  <View
                    style={[
                      styles.discoveryDot,
                      {
                        backgroundColor: discoveryVisible
                          ? C.emeraldBright
                          : C.muted,
                      },
                    ]}
                  />
                  <Text style={styles.discoveryStatusText}>
                    {discoveryVisible
                      ? "Visible to members"
                      : "Hidden from members"}
                  </Text>
                </View>
              ) : (
                <Text style={styles.discoveryStatusText}>
                  Visibility status unavailable
                </Text>
              )}
              <PrimaryButton
                text="Manage Public Profile →"
                onPress={() => router.push("/discovery-settings")}
              />
            </View>
          ) : null}

          <View style={styles.footer}>
            <View style={styles.footerRow}>
              <Text style={styles.footerHeart}>♡</Text>
              <Text style={styles.footerText}>Your privacy matters to us</Text>
            </View>
            <View style={styles.footerOrnament}>
              <View style={styles.footerLine} />
              <Text style={styles.footerFlower}>❦</Text>
              <View style={styles.footerLine} />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 25,
    gap: 18,
    backgroundColor: C.bg,
  },
  loadingHeart: { color: C.gold, fontSize: 58 },
  loadingBrand: {
    color: C.white,
    fontFamily: serif,
    fontSize: 30,
    fontWeight: "700",
  },
  loadingText: { color: C.muted, fontSize: 14, textAlign: "center" },
  errorText: {
    color: C.error,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  errorAction: { width: "100%", maxWidth: 300 },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingTop: 20,
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  wrapper: { width: "100%", maxWidth: 600 },
  topGlow: {
    position: "absolute",
    top: -120,
    left: -130,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#074239",
    opacity: 0.6,
  },
  goldArch: {
    position: "absolute",
    top: 20,
    left: 0,
    right: 0,
    height: 440,
    borderTopLeftRadius: 250,
    borderTopRightRadius: 250,
    borderTopWidth: 1.5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(231,189,121,0.32)",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 29,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: C.gold,
    borderRadius: 13,
    backgroundColor: C.surfaceDark,
  },
  backArrow: { color: C.gold, fontSize: 27, lineHeight: 33 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  brandHeart: { color: C.gold, fontSize: 29 },
  brandName: {
    color: C.white,
    fontFamily: serif,
    fontSize: 22,
    fontWeight: "700",
  },
  brandGold: { color: C.gold },
  headerSpacer: { width: 44 },
  headingArea: { alignItems: "center", paddingBottom: 28 },
  ornamentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 15,
  },
  ornamentLine: { width: 30, height: 1, backgroundColor: C.gold },
  ornament: { color: C.gold, fontSize: 21 },
  pageTitle: {
    color: C.goldLight,
    fontFamily: serif,
    fontSize: 36,
    lineHeight: 46,
    fontWeight: "700",
    textAlign: "center",
  },
  pageSubtitle: {
    color: C.white,
    fontFamily: serif,
    fontSize: 15,
    lineHeight: 25,
    textAlign: "center",
    marginTop: 12,
    maxWidth: 420,
  },
  heartDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    marginTop: 18,
  },
  dividerLine: { width: 65, height: 1, backgroundColor: C.gold },
  dividerHeart: { fontSize: 32, color: C.goldLight },
  heroCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 24,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 29,
    paddingBottom: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 3,
  },
  avatarBorder: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 3,
    borderColor: C.gold,
    backgroundColor: C.surfaceDark,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 17,
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarInitials: {
    color: C.goldLight,
    fontFamily: serif,
    fontSize: 34,
    fontWeight: "700",
  },
  profileName: {
    color: C.goldLight,
    fontFamily: serif,
    fontSize: 29,
    lineHeight: 38,
    textAlign: "center",
    fontWeight: "700",
  },
  profileCity: {
    color: C.muted,
    fontSize: 14,
    marginTop: 7,
    textAlign: "center",
  },
  statusChip: {
    borderWidth: 1,
    borderColor: C.emeraldBright,
    backgroundColor: "#083E31",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginTop: 18,
  },
  statusChipText: {
    color: C.success,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  progressSection: { width: "100%", marginTop: 23 },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  progressLabel: {
    color: C.gold,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  progressPercent: { color: C.white, fontSize: 12, fontWeight: "800" },
  progressTrack: {
    height: 8,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: C.surfaceDark,
  },
  progressFill: {
    height: "100%",
    backgroundColor: C.emeraldBright,
    borderRadius: 8,
  },
  heroActions: { width: "100%", gap: 12, marginTop: 24 },
  primaryButton: {
    width: "100%",
    minHeight: 58,
    borderRadius: 30,
    backgroundColor: C.emerald,
    borderWidth: 2,
    borderColor: C.emeraldBright,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: C.white,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  outlineButton: { backgroundColor: "transparent", borderColor: C.gold },
  outlineButtonText: { color: C.goldLight },
  pressed: { opacity: 0.7 },
  card: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingBottom: 17,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    marginBottom: 14,
  },
  sectionSymbolBox: {
    width: 45,
    height: 45,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceDark,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionSymbol: { color: C.gold, fontSize: 25 },
  sectionHeadingText: { flex: 1, minWidth: 0, gap: 5 },
  sectionTitle: {
    color: C.white,
    fontFamily: serif,
    fontSize: 20,
    fontWeight: "700",
  },
  sectionSubtitle: { color: C.muted, fontSize: 11, lineHeight: 17 },
  editButton: {
    borderWidth: 1,
    borderColor: C.gold,
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: C.surfaceDark,
  },
  editText: { color: C.goldLight, fontSize: 12, fontWeight: "700" },
  detailRow: {
    gap: 6,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#2A4A4D",
  },
  lastDetailRow: { borderBottomWidth: 0, paddingBottom: 4 },
  detailLabel: { color: C.muted, fontSize: 12 },
  detailValue: {
    color: C.white,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 23,
  },
  photosCountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingTop: 8,
  },
  photosCount: { color: C.white, fontSize: 13, fontWeight: "700" },
  privateLabel: {
    color: C.goldLight,
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: "700",
    borderWidth: 1,
    borderColor: C.gold,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16 },
  photo: {
    width: "30%",
    aspectRatio: 1,
    borderRadius: 13,
    backgroundColor: C.surfaceDark,
    borderWidth: 1,
    borderColor: C.border,
  },
  emptyPhotos: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: "dashed",
    borderRadius: 15,
    paddingVertical: 26,
    marginTop: 16,
    backgroundColor: C.surfaceDark,
  },
  emptyPhotosIcon: { color: C.gold, fontSize: 38 },
  emptyPhotosText: { color: C.muted, fontSize: 13, textAlign: "center" },
  privacyNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 13,
    backgroundColor: C.surfaceDark,
  },
  privacyNoteIcon: { color: C.gold, fontSize: 23 },
  privacyNoteText: { flex: 1, color: C.muted, fontSize: 12, lineHeight: 20 },
  discoveryCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 24,
    padding: 20,
    gap: 18,
  },
  discoveryCardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  discoverySymbol: { color: C.gold, fontSize: 36 },
  discoveryTextBlock: { flex: 1, gap: 5 },
  discoveryTitle: {
    color: C.white,
    fontFamily: serif,
    fontSize: 22,
    fontWeight: "700",
  },
  discoverySubtitle: { color: C.muted, fontSize: 12, lineHeight: 19 },
  discoveryStatusRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  discoveryDot: { width: 9, height: 9, borderRadius: 5 },
  discoveryStatusText: { color: C.muted, fontSize: 13 },
  footer: { alignItems: "center", paddingTop: 32, gap: 24 },
  footerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  footerHeart: { color: C.gold, fontSize: 24 },
  footerText: { color: C.muted, fontSize: 12 },
  footerOrnament: { flexDirection: "row", alignItems: "center", gap: 14 },
  footerLine: { width: 70, height: 1, backgroundColor: C.gold },
  footerFlower: { color: C.gold, fontSize: 25 },
});
