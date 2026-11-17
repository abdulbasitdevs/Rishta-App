import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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

type Invitation = {
  id: string;
  sender_id: string;
  status: string;
  created_at: string;
};

type SenderProfile = {
  user_id: string;
  display_name: string;
};

function formatRequestDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ReceivedRequestsScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState<Invitation[]>([]);
  const [senderNames, setSenderNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        router.replace("/login");
        return;
      }

      // Only pending invitations addressed to the signed-in user.
      const { data, error: requestError } = await supabase
        .from("rishta_invitations")
        .select("id, sender_id, status, created_at")
        .eq("receiver_id", authData.user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (requestError) throw requestError;

      const pending = (data ?? []) as Invitation[];
      setRequests(pending);
      setSenderNames({});

      if (pending.length > 0) {
        const senderIds = [...new Set(pending.map((item) => item.sender_id))];

        // Sender's public name only, when their Discovery profile is visible.
        const { data: profiles, error: namesError } = await supabase
          .from("rishta_discovery_profiles")
          .select("user_id, display_name")
          .eq("is_visible", true)
          .in("user_id", senderIds);

        if (!namesError && profiles) {
          const names: Record<string, string> = {};
          (profiles as SenderProfile[]).forEach((profile) => {
            names[profile.user_id] = profile.display_name;
          });
          setSenderNames(names);
        }
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load requests.",
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  async function handleResponse(
    invitationId: string,
    decision: "accepted" | "declined",
  ) {
    if (processingId) return;

    setProcessingId(invitationId);
    setError("");
    setMessage("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        router.replace("/login");
        return;
      }

      // Check receiver and pending status before changing an invitation.
      const { data, error: updateError } = await supabase
        .from("rishta_invitations")
        .update({
          status: decision,
          updated_at: new Date().toISOString(),
        })
        .eq("id", invitationId)
        .eq("receiver_id", authData.user.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();

      if (updateError) throw updateError;

      if (!data) {
        throw new Error("This request is no longer pending. Please refresh.");
      }

      setRequests((current) =>
        current.filter((item) => item.id !== invitationId),
      );
      setMessage(
        decision === "accepted"
          ? "Invitation accepted successfully!"
          : "Invitation declined.",
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update invitation.",
      );
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.wrapper}>
          <View pointerEvents="none" style={styles.topGlow} />
          <View pointerEvents="none" style={styles.goldArch} />

          {/* Shared Rishta App header */}
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

          <View style={styles.hero}>
            <View style={styles.ornamentRow}>
              <View style={styles.ornamentLine} />
              <Text style={styles.ornament}>✦ ❦ ✦</Text>
              <View style={styles.ornamentLine} />
            </View>
            <Text style={styles.title}>Received Requests</Text>
            <Text style={styles.subtitle}>
              Review rishta invitations sent to you. You decide who to connect
              with.
            </Text>
            <View style={styles.heroDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerHeart}>♡</Text>
              <View style={styles.dividerLine} />
            </View>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <Text style={styles.summaryIconText}>✉</Text>
            </View>
            <View style={styles.summaryBody}>
              <Text style={styles.summaryTitle}>Pending invitations</Text>
              <Text style={styles.summarySubtitle}>
                {loading
                  ? "Checking your requests..."
                  : requests.length === 1
                    ? "1 invitation waiting for your response"
                    : `${requests.length} invitations waiting for your response`}
              </Text>
            </View>
            <Text style={styles.summaryCount}>
              {loading ? "—" : String(requests.length)}
            </Text>
          </View>

          <View style={styles.listHeader}>
            <View style={styles.listTitleArea}>
              <Text style={styles.listEyebrow}>YOUR CONNECTIONS</Text>
              <Text style={styles.sectionTitle}>Pending Invitations</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => void loadRequests()}
              disabled={loading || processingId !== null}
              style={({ pressed }) => [
                styles.refreshButton,
                (pressed || loading || processingId !== null) && styles.pressed,
              ]}
            >
              <Text style={styles.refreshText}>↻ Refresh</Text>
            </Pressable>
          </View>

          {message ? (
            <View style={styles.successBox}>
              <Text style={styles.successIcon}>✓</Text>
              <Text style={styles.successText} accessibilityRole="alert">
                {message}
              </Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorIcon}>!</Text>
              <Text style={styles.errorText} accessibilityRole="alert">
                {error}
              </Text>
            </View>
          ) : null}

          {loading ? (
            <View style={styles.emptyCard}>
              <ActivityIndicator size="large" color={C.emeraldBright} />
              <Text style={styles.emptyTitle}>Loading invitations...</Text>
              <Text style={styles.emptyDescription}>
                Checking for new requests.
              </Text>
            </View>
          ) : error && requests.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyHeart}>♡</Text>
              <Text style={styles.emptyTitle}>Unable to show requests</Text>
              <Text style={styles.emptyDescription}>
                Try refreshing your invitations.
              </Text>
            </View>
          ) : requests.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyHeart}>♡</Text>
              <Text style={styles.emptyTitle}>No Pending Requests</Text>
              <Text style={styles.emptyDescription}>
                New rishta invitations will appear here when someone sends you a
                connection request.
              </Text>
            </View>
          ) : (
            requests.map((request) => {
              const busy = processingId === request.id;
              const disabled = processingId !== null;
              const name = senderNames[request.sender_id] || "Member";
              const formattedDate = formatRequestDate(request.created_at);

              return (
                <View key={request.id} style={styles.requestCard}>
                  <View style={styles.memberRow}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{name}</Text>
                      <Text style={styles.pendingText}>
                        ● Pending invitation
                      </Text>
                    </View>
                  </View>

                  {formattedDate ? (
                    <Text style={styles.dateText}>
                      Received {formattedDate}
                    </Text>
                  ) : null}

                  <View style={styles.cardRule} />
                  <Text style={styles.requestDescription}>
                    This member has expressed interest in connecting with you
                    for a rishta.
                  </Text>

                  <View style={styles.actions}>
                    <Pressable
                      accessibilityRole="button"
                      disabled={disabled}
                      onPress={() =>
                        void handleResponse(request.id, "accepted")
                      }
                      style={({ pressed }) => [
                        styles.acceptButton,
                        (disabled || pressed) && styles.pressed,
                      ]}
                    >
                      {busy ? (
                        <ActivityIndicator size="small" color={C.white} />
                      ) : null}
                      <Text style={styles.acceptText}>
                        {busy ? "Processing..." : "✓ Accept"}
                      </Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      disabled={disabled}
                      onPress={() =>
                        void handleResponse(request.id, "declined")
                      }
                      style={({ pressed }) => [
                        styles.declineButton,
                        (disabled || pressed) && styles.pressed,
                      ]}
                    >
                      <Text style={styles.declineText}>Decline</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}

          <View style={styles.privacyBox}>
            <View style={styles.privacyHeader}>
              <Text style={styles.privacyIcon}>♡</Text>
              <Text style={styles.privacyTitle}>Privacy First</Text>
            </View>
            <Text style={styles.privacyText}>
              Accepting an invitation does not yet unlock private photos or
              contact details. Secure access will be added separately.
            </Text>
          </View>

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
  screen: { flex: 1, backgroundColor: C.bg },
  content: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 36,
  },
  wrapper: { width: "100%", maxWidth: 640 },
  topGlow: {
    position: "absolute",
    top: -130,
    left: -120,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#074239",
    opacity: 0.6,
  },
  goldArch: {
    position: "absolute",
    top: 22,
    left: 0,
    right: 0,
    height: 435,
    borderTopLeftRadius: 260,
    borderTopRightRadius: 260,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(231,189,121,0.30)",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  backButton: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: C.gold,
    borderRadius: 13,
    backgroundColor: C.surfaceDark,
    justifyContent: "center",
    alignItems: "center",
  },
  backArrow: { color: C.gold, fontSize: 27, lineHeight: 32 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  brandHeart: { color: C.gold, fontSize: 29 },
  brandName: {
    color: C.white,
    fontFamily: serif,
    fontSize: 22,
    fontWeight: "700",
  },
  brandGold: { color: C.gold },
  headerSpacer: { width: 44, height: 44 },
  pressed: { opacity: 0.6 },
  hero: { alignItems: "center", paddingBottom: 28 },
  ornamentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 14,
  },
  ornamentLine: { width: 30, height: 1, backgroundColor: C.gold },
  ornament: { color: C.gold, fontSize: 21 },
  title: {
    color: C.goldLight,
    fontFamily: serif,
    fontSize: 35,
    lineHeight: 44,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    color: C.white,
    fontSize: 14,
    lineHeight: 24,
    textAlign: "center",
    marginTop: 13,
    maxWidth: 410,
  },
  heroDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 20,
  },
  dividerLine: { width: 55, height: 1, backgroundColor: C.gold },
  dividerHeart: { color: C.goldLight, fontSize: 29 },
  summaryCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 22,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    marginBottom: 30,
  },
  summaryIcon: {
    height: 46,
    width: 46,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceDark,
    justifyContent: "center",
    alignItems: "center",
  },
  summaryIconText: { color: C.gold, fontSize: 25 },
  summaryBody: { flex: 1, gap: 5 },
  summaryTitle: { color: C.white, fontSize: 15, fontWeight: "700" },
  summarySubtitle: { color: C.muted, fontSize: 11, lineHeight: 18 },
  summaryCount: {
    color: C.goldLight,
    fontFamily: serif,
    fontSize: 28,
    fontWeight: "700",
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 17,
  },
  listTitleArea: { flex: 1, gap: 5 },
  listEyebrow: {
    color: C.gold,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  sectionTitle: {
    color: C.white,
    fontFamily: serif,
    fontSize: 22,
    fontWeight: "700",
  },
  refreshButton: {
    borderRadius: 14,
    backgroundColor: C.surface,
    borderColor: C.border,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  refreshText: { color: C.gold, fontSize: 12, fontWeight: "700" },
  successBox: {
    backgroundColor: "#083E31",
    borderColor: C.emeraldBright,
    borderWidth: 1,
    borderRadius: 13,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  successIcon: { color: C.success, fontSize: 22, fontWeight: "700" },
  successText: { color: C.success, fontSize: 13, lineHeight: 20, flex: 1 },
  errorBox: {
    backgroundColor: "#30252A",
    borderColor: "#B75A64",
    borderWidth: 1,
    borderRadius: 13,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 16,
  },
  errorIcon: { color: C.error, fontSize: 20, fontWeight: "700" },
  errorText: { color: C.error, fontSize: 13, lineHeight: 20, flex: 1 },
  emptyCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 22,
    paddingVertical: 44,
    paddingHorizontal: 18,
    justifyContent: "center",
    alignItems: "center",
    gap: 13,
    marginBottom: 22,
  },
  emptyHeart: { color: C.gold, fontSize: 55 },
  emptyTitle: {
    color: C.goldLight,
    fontFamily: serif,
    fontSize: 23,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyDescription: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 23,
    textAlign: "center",
    maxWidth: 330,
  },
  requestCard: {
    backgroundColor: C.surface,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    gap: 16,
    marginBottom: 16,
  },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 57,
    height: 57,
    borderRadius: 18,
    backgroundColor: C.surfaceDark,
    borderColor: C.gold,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: C.goldLight, fontSize: 25, fontWeight: "700" },
  memberInfo: { flex: 1, gap: 6 },
  memberName: {
    color: C.white,
    fontFamily: serif,
    fontSize: 21,
    fontWeight: "700",
  },
  pendingText: { color: C.gold, fontSize: 12, fontWeight: "700" },
  dateText: { color: C.muted, fontSize: 12 },
  cardRule: { height: 1, backgroundColor: C.border },
  requestDescription: { color: C.muted, fontSize: 13, lineHeight: 23 },
  actions: { flexDirection: "row", gap: 10, marginTop: 2 },
  acceptButton: {
    flex: 1,
    minHeight: 50,
    backgroundColor: C.emerald,
    borderColor: C.emeraldBright,
    borderWidth: 1.5,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 6,
  },
  acceptText: { color: C.white, fontSize: 14, fontWeight: "800" },
  declineButton: {
    flex: 1,
    minHeight: 50,
    backgroundColor: C.surfaceDark,
    borderColor: C.gold,
    borderWidth: 1,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  declineText: { color: C.goldLight, fontSize: 14, fontWeight: "700" },
  privacyBox: {
    marginTop: 12,
    backgroundColor: C.surfaceDark,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    padding: 17,
    gap: 12,
  },
  privacyHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  privacyIcon: { color: C.gold, fontSize: 27 },
  privacyTitle: {
    color: C.goldLight,
    fontFamily: serif,
    fontSize: 19,
    fontWeight: "700",
  },
  privacyText: { color: C.muted, fontSize: 12, lineHeight: 21 },
  footer: { alignItems: "center", paddingTop: 29, gap: 17 },
  footerText: { color: C.muted, fontSize: 12, textAlign: "center" },
  footerOrnament: { flexDirection: "row", alignItems: "center", gap: 13 },
  footerLine: { width: 65, height: 1, backgroundColor: C.gold },
  footerFlower: { color: C.gold, fontSize: 23 },
});
