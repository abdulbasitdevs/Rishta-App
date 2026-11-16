import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "@/lib/supabase";
import { theme } from "@/theme/tokens";

const { colors, spacing, radius } = theme;

type PublicProfile = {
  user_id: string;
  display_name: string;
  gender: string | null;
  education_level: string | null;
  profession: string | null;
  faith_category: string | null;
  muslim_sect: string | null;
};

export default function MemberProfileScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId?: string }>();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [acceptedMatch, setAcceptedMatch] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState("");

  const [sendingInterest, setSendingInterest] = useState(false);
  const [interestSent, setInterestSent] = useState(false);
  const [interestMessage, setInterestMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadMemberProfile() {
      setLoading(true);
      setError("");

      try {
        if (!userId || typeof userId !== "string") {
          throw new Error("Invalid profile link.");
        }

        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (!active) return;

        if (authError || !authData.user) {
          router.replace("/login");
          return;
        }

        const { data, error: profileError } = await supabase
          .from("rishta_discovery_profiles")
          .select(
            "user_id, display_name, gender, education_level, profession, faith_category, muslim_sect",
          )
          .eq("user_id", userId)
          .eq("is_visible", true)
          .maybeSingle();

        if (!active) return;

        if (profileError) {
          throw profileError;
        }

        if (!data) {
          throw new Error(
            "This profile is unavailable or is no longer public.",
          );
        }

        setProfile(data);

        setAcceptedMatch(false);
        setPhotoUrls([]);
        setPhotoError("");

        const { data: invitation, error: invitationError } = await supabase
          .from("rishta_invitations")
          .select("id")
          .eq("status", "accepted")
          .or(
            `and(sender_id.eq.${authData.user.id},receiver_id.eq.${data.user_id}),and(receiver_id.eq.${authData.user.id},sender_id.eq.${data.user_id})`,
          )
          .limit(1)
          .maybeSingle();

        if (!active) return;

        if (invitationError) {
          setPhotoError("Unable to verify match status.");
        } else if (invitation) {
          setAcceptedMatch(true);

          const bucket = supabase.storage.from("Rishta-profile-photos");

          const { data: files, error: listError } = await bucket.list(
            data.user_id,
            {
              limit: 10,
            },
          );

          if (!active) return;

          if (listError) {
            setPhotoError(listError.message);
          } else {
            const paths = (files ?? [])
              .filter((file) => file.id !== null)
              .map((file) => `${data.user_id}/${file.name}`);

            const urls = await Promise.all(
              paths.map(async (path) => {
                const { data: signed, error: signedError } =
                  await bucket.createSignedUrl(path, 180);

                return signedError ? null : (signed?.signedUrl ?? null);
              }),
            );

            if (active) {
              setPhotoUrls(urls.filter((url): url is string => Boolean(url)));
            }
          }
        }
      } catch (caughtError) {
        if (active) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load member profile.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadMemberProfile();

    return () => {
      active = false;
    };
  }, [userId, router]);

  async function handleSendInterest() {
    if (!profile || sendingInterest || interestSent) return;

    setSendingInterest(true);
    setInterestMessage("");

    try {
      const { data, error: authError } = await supabase.auth.getUser();

      if (authError || !data.user) {
        router.replace("/login");
        return;
      }

      if (data.user.id === profile.user_id) {
        throw new Error("You cannot send interest to yourself.");
      }

      const { error: sendError } = await supabase
        .from("rishta_invitations")
        .insert({
          sender_id: data.user.id,
          receiver_id: profile.user_id,
          status: "pending",
        });

      if (sendError) {
        if (sendError.code === "23505") {
          setInterestSent(true);
          setInterestMessage("Interest already sent.");
          return;
        }

        throw sendError;
      }

      setInterestSent(true);
      setInterestMessage("Interest sent successfully! Waiting for a response.");
    } catch (caughtError) {
      setInterestMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to send interest. Please try again.",
      );
    } finally {
      setSendingInterest(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.wrapper}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.replace("/browse-profiles")}
          >
            <Text style={styles.backText}>← Back to Find Rishta</Text>
          </Pressable>

          <Text style={styles.pageTitle}>Member Profile</Text>

          <Text style={styles.pageSubtitle}>
            Discover more about this member.
          </Text>

          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.muted}>Loading profile...</Text>
            </View>
          ) : error ? (
            <View style={styles.card}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : profile ? (
            <>
              <View style={styles.card}>
                <View style={styles.profileHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {profile.display_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.nameArea}>
                    <Text style={styles.memberName}>
                      {profile.display_name}
                    </Text>

                    <Text style={styles.muted}>
                      {profile.gender || "Member"}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <Text style={styles.sectionTitle}>About This Member</Text>

                <InfoRow label="Gender" value={profile.gender} />

                <InfoRow label="Education" value={profile.education_level} />

                <InfoRow label="Profession" value={profile.profession} />

                {profile.faith_category ? (
                  <InfoRow label="Religion" value={profile.faith_category} />
                ) : null}

                {profile.faith_category === "Muslim" && profile.muslim_sect ? (
                  <InfoRow label="Firqa" value={profile.muslim_sect} />
                ) : null}
              </View>

              <View style={{ marginBottom: spacing.xl }}>
                <Pressable
                  accessibilityRole="button"
                  disabled={sendingInterest || interestSent}
                  onPress={() => void handleSendInterest()}
                  style={{
                    backgroundColor: interestSent
                      ? colors.surfaceSoft
                      : colors.primary,
                    padding: spacing.lg,
                    borderRadius: radius.lg,
                    alignItems: "center",
                    opacity: sendingInterest ? 0.6 : 1,
                  }}
                >
                  <Text
                    style={{
                      color: interestSent ? colors.primary : colors.surface,
                      fontSize: 15,
                      fontWeight: "800",
                    }}
                  >
                    {sendingInterest
                      ? "Sending..."
                      : interestSent
                        ? "✓ Interest Sent"
                        : "♡ Send Interest"}
                  </Text>
                </Pressable>

                {interestMessage ? (
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 13,
                      textAlign: "center",
                      marginTop: spacing.md,
                    }}
                  >
                    {interestMessage}
                  </Text>
                ) : null}
              </View>

              <View style={styles.privacyCard}>
                <Text style={styles.privacyTitle}>♡ Privacy First</Text>

                <Text style={styles.privacyText}>
                  Only information approved for public discovery is displayed
                  here. Private photos, contact details and other personal
                  information remain hidden.
                </Text>
              </View>
            </>
          ) : null}
        </View>

        <View
          style={{
            marginTop: 20,
            padding: 16,
            borderWidth: 1,
            borderColor: "#E2E8F0",
            borderRadius: 12,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              marginBottom: 12,
            }}
          >
            Member Photos
          </Text>

          {acceptedMatch ? (
            photoUrls.length > 0 ? (
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                {photoUrls.map((url) => (
                  <Image
                    key={url}
                    source={{ uri: url }}
                    style={{
                      width: 140,
                      height: 160,
                      borderRadius: 10,
                    }}
                    resizeMode="cover"
                  />
                ))}
              </View>
            ) : (
              <Text>{photoError || "No photos available for this match."}</Text>
            )
          ) : (
            <Text>
              🔒 Photos are private. They become visible only after the
              invitation is accepted.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>

      <Text style={styles.infoValue}>{value || "Not provided"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    padding: spacing.xl,
    alignItems: "center",
  },
  wrapper: {
    width: "100%",
    maxWidth: 720,
  },
  backButton: {
    paddingVertical: spacing.md,
    marginBottom: spacing.xl,
  },
  backText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  pageTitle: {
    color: colors.heading,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  pageSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: spacing.xl,
  },
  centerBox: {
    alignItems: "center",
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: "800",
  },
  nameArea: {
    flex: 1,
  },
  memberName: {
    color: colors.heading,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  muted: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xl,
  },
  sectionTitle: {
    color: colors.heading,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  infoLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    flex: 1,
  },
  infoValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
    flex: 1,
  },
  privacyCard: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  privacyTitle: {
    color: colors.heading,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: spacing.md,
  },
  privacyText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 21,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    textAlign: "center",
  },
});
