import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
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

const PHOTO_BUCKET = "Rishta-profile-photos";

type PublicProfile = {
  user_id: string;
  display_name: string;
  gender: string | null;
  education_level: string | null;
  profession: string | null;
  faith_category: string | null;
  muslim_sect: string | null;
};

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || "Not provided"}</Text>
    </View>
  );
}

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
  const [interestFailed, setInterestFailed] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadMemberProfile() {
      setLoading(true);
      setError("");
      setProfile(null);
      setAcceptedMatch(false);
      setPhotoUrls([]);
      setPhotoError("");
      setInterestSent(false);
      setInterestMessage("");
      setInterestFailed(false);

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
        if (profileError) throw profileError;
        if (!data) {
          throw new Error(
            "This profile is unavailable or is no longer public.",
          );
        }

        setProfile(data as PublicProfile);
        setIsOwnProfile(data.user_id === authData.user.id);

        // Only an accepted invitation is allowed to trigger a photo lookup.
        // Storage access must ALSO be restricted by Supabase RLS policies.
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
          return;
        }

        if (!invitation) return;
        setAcceptedMatch(true);

        const bucket = supabase.storage.from(PHOTO_BUCKET);
        const { data: files, error: listError } = await bucket.list(
          data.user_id,
          { limit: 10 },
        );

        if (!active) return;

        if (listError) {
          setPhotoError(listError.message);
          return;
        }

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
          setPhotoUrls(
            urls.filter((url): url is string => typeof url === "string"),
          );
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
        if (active) setLoading(false);
      }
    }

    void loadMemberProfile();

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.replace("/login");
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [userId, router]);

  async function handleSendInterest() {
    if (!profile || sendingInterest || interestSent) return;

    setSendingInterest(true);
    setInterestMessage("");
    setInterestFailed(false);

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
      setInterestFailed(true);
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
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.wrapper}>
          <View pointerEvents="none" style={styles.topGlow} />
          <View pointerEvents="none" style={styles.arch} />

          <View style={styles.topBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to Find Rishta"
              onPress={() => router.replace("/browse-profiles")}
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

            <View style={styles.topSide} />
          </View>

          <View style={styles.hero}>
            <Text style={styles.ornament}>✦ ❦ ✦</Text>
            <Text style={styles.eyebrow}>DISCOVER CONNECTIONS</Text>
            <Text style={styles.pageTitle}>Member Profile</Text>
            <Text style={styles.pageSubtitle}>
              Get to know a member through the details they chose to share.
            </Text>
            <View style={styles.heroDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerHeart}>♡</Text>
              <View style={styles.dividerLine} />
            </View>
          </View>

          {loading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator size="large" color={C.emeraldBright} />
              <Text style={styles.muted}>Loading member profile...</Text>
            </View>
          ) : error ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateIcon}>♡</Text>
              <Text style={styles.stateHeading}>Profile Unavailable</Text>
              <Text style={styles.errorText} accessibilityRole="alert">
                {error}
              </Text>
              <Pressable
                onPress={() => router.replace("/browse-profiles")}
                style={styles.stateButton}
              >
                <Text style={styles.stateButtonText}>
                  Back to Find Rishta →
                </Text>
              </Pressable>
            </View>
          ) : profile ? (
            <>
              <View style={styles.profileCard}>
                <View style={styles.avatarOuter}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(
                        profile.display_name?.trim().charAt(0) || "M"
                      ).toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.memberName}>
                  {profile.display_name || "Member"}
                </Text>
                <Text style={styles.memberSubtitle}>
                  {profile.gender || "Member"}
                </Text>
                <View style={styles.publicChip}>
                  <Text style={styles.publicChipText}>
                    ✦ Public Discovery Profile
                  </Text>
                </View>
              </View>

              <View style={styles.card}>
                <View style={styles.cardTitleRow}>
                  <View style={styles.cardIconBox}>
                    <Text style={styles.cardIcon}>✦</Text>
                  </View>
                  <View style={styles.cardTitleContent}>
                    <Text style={styles.sectionTitle}>About This Member</Text>
                    <Text style={styles.sectionSubtitle}>
                      Information shared by this member
                    </Text>
                  </View>
                </View>

                <InfoRow label="Gender" value={profile.gender} />
                <InfoRow label="Education" value={profile.education_level} />
                <InfoRow label="Profession" value={profile.profession} />

                {profile.faith_category ? (
                  <InfoRow label="Religion" value={profile.faith_category} />
                ) : null}

                {profile.faith_category === "Muslim" && profile.muslim_sect ? (
                  <InfoRow label="Firqa / Sect" value={profile.muslim_sect} />
                ) : null}
              </View>

              <View style={styles.card}>
                <View style={styles.cardTitleRow}>
                  <View style={styles.cardIconBox}>
                    <Text style={styles.cardIcon}>♡</Text>
                  </View>
                  <View style={styles.cardTitleContent}>
                    <Text style={styles.sectionTitle}>
                      Express Your Interest
                    </Text>
                    <Text style={styles.sectionSubtitle}>
                      Send a respectful connection invitation
                    </Text>
                  </View>
                </View>

                <Text style={styles.bodyText}>
                  If you would like to connect, send this member a rishta
                  invitation. They can accept or decline it.
                </Text>

                <Pressable
                  accessibilityRole="button"
                  disabled={sendingInterest || interestSent || isOwnProfile}
                  onPress={() => void handleSendInterest()}
                  style={({ pressed }) => [
                    styles.interestButton,
                    (sendingInterest || interestSent || isOwnProfile) &&
                      styles.interestButtonDisabled,
                    pressed && styles.pressed,
                  ]}
                >
                  {sendingInterest ? (
                    <ActivityIndicator size="small" color={C.white} />
                  ) : (
                    <Text style={styles.interestIcon}>
                      {interestSent ? "✓" : "♡"}
                    </Text>
                  )}
                  <Text style={styles.interestButtonText}>
                    {isOwnProfile
                      ? "Your Own Profile"
                      : sendingInterest
                        ? "Sending..."
                        : interestSent
                          ? "Interest Sent"
                          : "Send Interest"}
                  </Text>
                </Pressable>

                {interestMessage ? (
                  <View
                    style={[
                      styles.messageBox,
                      interestFailed ? styles.errorBox : styles.successBox,
                    ]}
                  >
                    <Text
                      style={
                        interestFailed ? styles.errorText : styles.successText
                      }
                      accessibilityRole="alert"
                    >
                      {interestMessage}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.card}>
                <View style={styles.cardTitleRow}>
                  <View style={styles.cardIconBox}>
                    <Text style={styles.cardIcon}>◇</Text>
                  </View>
                  <View style={styles.cardTitleContent}>
                    <Text style={styles.sectionTitle}>Member Photos</Text>
                    <Text style={styles.sectionSubtitle}>
                      Private until an invitation is accepted
                    </Text>
                  </View>
                </View>

                {acceptedMatch ? (
                  photoUrls.length > 0 ? (
                    <View style={styles.photoGrid}>
                      {photoUrls.map((url) => (
                        <Image
                          key={url}
                          source={{ uri: url }}
                          style={styles.photo}
                          resizeMode="cover"
                        />
                      ))}
                    </View>
                  ) : (
                    <View style={styles.photoNotice}>
                      <Text style={styles.photoNoticeIcon}>♡</Text>
                      <Text style={styles.photoNoticeText}>
                        {photoError || "No photos available for this match."}
                      </Text>
                    </View>
                  )
                ) : (
                  <View style={styles.photoNotice}>
                    <Text style={styles.photoNoticeIcon}>♢</Text>
                    <Text style={styles.photoNoticeTitle}>
                      Photos Are Private
                    </Text>
                    <Text style={styles.photoNoticeText}>
                      {photoError ||
                        "Photos can only be viewed after a rishta invitation is accepted."}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.privacyCard}>
                <Text style={styles.privacyTitle}>♡ Privacy First</Text>
                <Text style={styles.privacyText}>
                  Only information approved for public discovery is shown here.
                  Contact details and other personal information remain hidden.
                  Photo access requires an accepted invitation and permission
                  from the private storage system.
                </Text>
              </View>
            </>
          ) : null}

          <View style={styles.footer}>
            <Text style={styles.footerText}>♡ Your privacy matters to us</Text>
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
  content: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 35,
  },
  wrapper: { width: "100%", maxWidth: 650 },
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
  arch: {
    position: "absolute",
    top: 25,
    left: 0,
    right: 0,
    height: 400,
    borderTopLeftRadius: 250,
    borderTopRightRadius: 250,
    borderTopWidth: 1.5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(231,189,121,0.35)",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 28,
  },
  backButton: {
    width: 44,
    height: 44,
    borderWidth: 1.5,
    borderColor: C.gold,
    borderRadius: 13,
    backgroundColor: C.surfaceDark,
    alignItems: "center",
    justifyContent: "center",
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
  topSide: { width: 44, height: 44 },
  hero: { alignItems: "center", marginBottom: 26 },
  ornament: { color: C.gold, fontSize: 22, marginBottom: 13 },
  eyebrow: {
    color: C.emeraldBright,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  pageTitle: {
    color: C.goldLight,
    fontFamily: serif,
    fontSize: 35,
    lineHeight: 45,
    fontWeight: "700",
    textAlign: "center",
  },
  pageSubtitle: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 23,
    textAlign: "center",
    marginTop: 10,
    maxWidth: 430,
  },
  heroDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    marginTop: 17,
  },
  dividerLine: { width: 58, height: 1, backgroundColor: C.gold },
  dividerHeart: { color: C.goldLight, fontSize: 27 },
  stateCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    gap: 16,
  },
  stateIcon: { color: C.gold, fontSize: 40 },
  stateHeading: {
    color: C.white,
    fontFamily: serif,
    fontSize: 23,
    fontWeight: "700",
  },
  stateButton: {
    backgroundColor: C.emerald,
    borderWidth: 1,
    borderColor: C.emeraldBright,
    paddingVertical: 14,
    paddingHorizontal: 21,
    borderRadius: 26,
    marginTop: 8,
  },
  stateButtonText: { color: C.white, fontWeight: "800" },
  muted: { color: C.muted, fontSize: 13, lineHeight: 20 },
  errorText: { color: C.error, fontSize: 13, lineHeight: 21 },
  profileCard: {
    alignItems: "center",
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 24,
    padding: 25,
    marginBottom: 20,
  },
  avatarOuter: {
    width: 102,
    height: 102,
    borderRadius: 51,
    borderWidth: 1.5,
    borderColor: C.gold,
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 47,
    backgroundColor: C.surfaceDark,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: C.goldLight, fontFamily: serif, fontSize: 43 },
  memberName: {
    color: C.goldLight,
    fontSize: 27,
    fontFamily: serif,
    fontWeight: "700",
    textAlign: "center",
  },
  memberSubtitle: { color: C.muted, fontSize: 14, marginTop: 7 },
  publicChip: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceDark,
    borderRadius: 30,
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginTop: 17,
  },
  publicChipText: { color: C.success, fontSize: 12, fontWeight: "700" },
  card: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    gap: 18,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  cardIconBox: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: C.surfaceDark,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cardIcon: { color: C.gold, fontSize: 27 },
  cardTitleContent: { flex: 1, gap: 4 },
  sectionTitle: {
    color: C.white,
    fontFamily: serif,
    fontSize: 22,
    fontWeight: "700",
  },
  sectionSubtitle: { color: C.muted, fontSize: 12, lineHeight: 19 },
  infoRow: {
    paddingBottom: 13,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(66,115,111,0.65)",
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  infoLabel: { color: C.muted, fontSize: 13, flex: 1 },
  infoValue: {
    color: C.white,
    fontSize: 14,
    fontWeight: "700",
    flex: 1.4,
    textAlign: "right",
    lineHeight: 20,
  },
  bodyText: { color: C.muted, fontSize: 13, lineHeight: 22 },
  interestButton: {
    minHeight: 58,
    backgroundColor: C.emerald,
    borderWidth: 1.5,
    borderColor: C.emeraldBright,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 15,
  },
  interestButtonDisabled: {
    backgroundColor: C.surfaceDark,
    borderColor: C.border,
    opacity: 0.75,
  },
  interestIcon: { color: C.white, fontSize: 23 },
  interestButtonText: { color: C.white, fontSize: 17, fontWeight: "800" },
  pressed: { opacity: 0.7 },
  messageBox: { borderWidth: 1, padding: 13, borderRadius: 12 },
  successBox: { borderColor: C.emeraldBright, backgroundColor: "#083E31" },
  errorBox: { borderColor: "#B75A64", backgroundColor: "#30252A" },
  successText: { color: C.success, fontSize: 13, lineHeight: 21 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 11 },
  photo: {
    width: "47%",
    height: 165,
    borderRadius: 13,
    backgroundColor: C.surfaceDark,
    borderWidth: 1,
    borderColor: C.border,
  },
  photoNotice: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceDark,
    borderRadius: 14,
    padding: 22,
    alignItems: "center",
    gap: 8,
  },
  photoNoticeIcon: { color: C.gold, fontSize: 38 },
  photoNoticeTitle: {
    color: C.goldLight,
    fontFamily: serif,
    fontSize: 19,
    fontWeight: "700",
  },
  photoNoticeText: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 22,
    textAlign: "center",
  },
  privacyCard: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 19,
    backgroundColor: C.surfaceDark,
    padding: 21,
    gap: 11,
  },
  privacyTitle: { color: C.goldLight, fontSize: 16, fontWeight: "800" },
  privacyText: { color: C.muted, fontSize: 12, lineHeight: 21 },
  footer: { alignItems: "center", gap: 19, paddingTop: 30 },
  footerText: { color: C.muted, fontSize: 12 },
  footerOrnament: { flexDirection: "row", alignItems: "center", gap: 13 },
  footerLine: { backgroundColor: C.gold, height: 1, width: 65 },
  footerFlower: { color: C.gold, fontSize: 24 },
});
