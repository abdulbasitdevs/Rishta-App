import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "@/lib/supabase";
import { theme } from "@/theme/tokens";

const { colors, spacing, radius } = theme;
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

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>
        {value === null || value === undefined || value === ""
          ? "Not provided"
          : String(value)}
      </Text>
    </View>
  );
}

export default function MyProfileScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (!active) return;

        if (authError) {
          setError("Unable to verify your account.");
          return;
        }

        if (!authData.user) {
          router.replace("/login");
          return;
        }

        const { data, error: profileError } = await supabase
          .from("rishta_profiles")
          .select(
            "full_name, gender, date_of_birth, city, marital_status, education_level, profession, height_cm, religion, family_overview, preferred_age_min, preferred_age_max, preferred_city, preferred_education, preferred_marital_status, profile_photo_paths, photo_visibility, show_age, show_city, profile_step",
          )
          .eq("user_id", authData.user.id)
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

        const paths: string[] = data.profile_photo_paths ?? [];

        const urls = await Promise.all(
          paths.map(async (path: string) => {
            const { data: signed } = await supabase.storage
              .from(BUCKET)
              .createSignedUrl(path, 600);

            return signed?.signedUrl ?? null;
          }),
        );

        if (active) {
          setPhotoUrls(urls.filter((url): url is string => url !== null));
        }
      } catch {
        if (active) {
          setError("Unable to load your profile.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadProfile();

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

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.muted}>Loading your profile...</Text>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.error}>{error || "Profile not available."}</Text>
        <Pressable onPress={() => router.replace("/dashboard")}>
          <Text style={styles.link}>Back to Dashboard</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.wrapper}>
          <Pressable
            style={styles.back}
            onPress={() => router.replace("/dashboard")}
          >
            <Text style={styles.link}>← Dashboard</Text>
          </Pressable>

          <View style={styles.hero}>
            <View style={styles.avatar}>
              {photoUrls.length > 0 ? (
                <Image
                  source={{ uri: photoUrls[0] }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarPlaceholder}>♥</Text>
              )}
            </View>

            <Text style={styles.title}>{profile.full_name}</Text>
            <Text style={styles.muted}>{profile.city}</Text>

            <Text style={styles.progress}>
              {profile.profile_step >= 4
                ? "Profile Setup Completed"
                : `Profile Setup: Step ${profile.profile_step} of 4`}
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Basic Information</Text>
              <Pressable onPress={() => router.push("/profile-setup")}>
                <Text style={styles.link}>Edit</Text>
              </Pressable>
            </View>

            <DetailRow label="Full Name" value={profile.full_name} />
            <DetailRow label="Gender" value={profile.gender} />
            <DetailRow label="Date of Birth" value={profile.date_of_birth} />
            <DetailRow label="City" value={profile.city} />
            <DetailRow label="Marital Status" value={profile.marital_status} />
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Personal & Family Details</Text>
              <Pressable onPress={() => router.push("/profile-details")}>
                <Text style={styles.link}>Edit</Text>
              </Pressable>
            </View>

            <DetailRow label="Education" value={profile.education_level} />
            <DetailRow label="Profession" value={profile.profession} />
            <DetailRow
              label="Height"
              value={profile.height_cm ? `${profile.height_cm} cm` : null}
            />
            <DetailRow label="Religion" value={profile.religion} />
            <DetailRow
              label="Family Overview"
              value={profile.family_overview}
            />
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Partner Preferences</Text>
              <Pressable onPress={() => router.push("/partner-preferences")}>
                <Text style={styles.link}>Edit</Text>
              </Pressable>
            </View>

            <DetailRow
              label="Preferred Age"
              value={
                profile.preferred_age_min !== null &&
                profile.preferred_age_max !== null
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
            />
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Profile Photos</Text>
              <Pressable onPress={() => router.push("/profile-photos")}>
                <Text style={styles.link}>Edit</Text>
              </Pressable>
            </View>

            <Text style={styles.muted}>
              {profile.profile_photo_paths?.length ?? 0} of 5 photos
            </Text>

            <View style={styles.photoGrid}>
              {photoUrls.map((url, index) => (
                <Image key={index} source={{ uri: url }} style={styles.photo} />
              ))}
            </View>

            <Text style={styles.note}>
              Photos are private and visible only to your account at this stage.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Privacy Preferences</Text>
              <Pressable onPress={() => router.push("/profile-photos")}>
                <Text style={styles.link}>Edit</Text>
              </Pressable>
            </View>

            <DetailRow label="Photo Visibility" value="Private" />
            <DetailRow
              label="Show Age"
              value={profile.show_age ? "Yes" : "No"}
            />
            <DetailRow
              label="Show City"
              value={profile.show_city ? "Yes" : "No"}
            />

            <Text style={styles.note}>
              Age and city visibility preferences will apply when public or
              match profiles are implemented.
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
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.lg,
  },
  content: {
    padding: spacing.xl,
    alignItems: "center",
  },
  wrapper: {
    width: "100%",
    maxWidth: 600,
  },
  back: {
    marginBottom: spacing.xl,
    paddingVertical: spacing.md,
  },
  link: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  hero: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSoft,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    color: colors.primary,
    fontSize: 48,
  },
  title: {
    color: colors.heading,
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  muted: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  progress: {
    color: colors.success,
    fontWeight: "700",
    fontSize: 13,
    marginTop: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    color: colors.heading,
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
  },
  detailRow: {
    marginBottom: spacing.lg,
  },
  detailLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  detailValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 23,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  photo: {
    width: 95,
    height: 105,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
  },
  note: {
    color: colors.textSecondary,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 12,
    lineHeight: 20,
    marginTop: spacing.lg,
  },
  error: {
    color: colors.error,
    fontSize: 14,
    textAlign: "center",
  },
});
