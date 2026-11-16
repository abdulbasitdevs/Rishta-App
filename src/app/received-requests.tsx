import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.wrapper}>
          <Pressable
            onPress={() => router.replace("/dashboard")}
            style={styles.backButton}
          >
            <Text style={styles.backText}>← Dashboard</Text>
          </Pressable>

          <View style={styles.header}>
            <Text style={styles.heart}>♡</Text>
            <Text style={styles.title}>Received Requests</Text>
            <Text style={styles.subtitle}>
              Review rishta invitations sent to you. You decide who to connect
              with.
            </Text>
          </View>

          <View style={styles.headingRow}>
            <Text style={styles.sectionTitle}>Pending Invitations</Text>

            <Pressable
              disabled={loading}
              onPress={() => void loadRequests()}
              style={styles.refreshButton}
            >
              <Text style={styles.refreshText}>Refresh</Text>
            </Pressable>
          </View>

          {message ? (
            <View style={styles.messageBox}>
              <Text style={styles.successText}>{message}</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.messageBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {loading ? (
            <View style={styles.emptyCard}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.muted}>Loading invitations...</Text>
            </View>
          ) : requests.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>♡</Text>
              <Text style={styles.emptyTitle}>No pending requests</Text>
              <Text style={styles.muted}>
                New rishta invitations will appear here.
              </Text>
            </View>
          ) : (
            requests.map((request) => {
              const busy = processingId === request.id;
              const name = senderNames[request.sender_id] || "Member";

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

                  <Text style={styles.requestDescription}>
                    This member has expressed interest in connecting with you
                    for a rishta.
                  </Text>

                  <View style={styles.actions}>
                    <Pressable
                      disabled={processingId !== null}
                      onPress={() =>
                        void handleResponse(request.id, "accepted")
                      }
                      style={[
                        styles.acceptButton,
                        processingId !== null && styles.disabled,
                      ]}
                    >
                      <Text style={styles.acceptText}>
                        {busy ? "Processing..." : "✓ Accept"}
                      </Text>
                    </Pressable>

                    <Pressable
                      disabled={processingId !== null}
                      onPress={() =>
                        void handleResponse(request.id, "declined")
                      }
                      style={[
                        styles.declineButton,
                        processingId !== null && styles.disabled,
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
            <Text style={styles.privacyTitle}>Privacy First</Text>

            <Text style={styles.privacyText}>
              Accepting an invitation does not yet unlock private photos or
              contact details. Secure access will be added separately.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
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
    marginBottom: spacing.lg,
  },
  backText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  heart: {
    color: colors.primary,
    fontSize: 46,
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.heading,
    fontSize: 27,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  headingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.heading,
    fontWeight: "800",
    fontSize: 18,
  },
  refreshButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  refreshText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  requestCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: "800",
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    color: colors.heading,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  pendingText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  requestDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 21,
    marginVertical: spacing.xl,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    alignItems: "center",
  },
  acceptText: {
    color: colors.surface,
    fontWeight: "800",
    fontSize: 14,
  },
  declineButton: {
    flex: 1,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    alignItems: "center",
  },
  declineText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 14,
  },
  disabled: {
    opacity: 0.5,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    alignItems: "center",
    gap: spacing.lg,
  },
  emptyIcon: {
    color: colors.primary,
    fontSize: 46,
  },
  emptyTitle: {
    color: colors.heading,
    fontSize: 18,
    fontWeight: "800",
  },
  muted: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
  },
  messageBox: {
    backgroundColor: colors.surfaceSoft,
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
  },
  successText: {
    color: colors.success,
    fontSize: 14,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
  },
  privacyBox: {
    marginTop: spacing.xl,
    backgroundColor: colors.surfaceSoft,
    padding: spacing.xl,
    borderRadius: radius.lg,
  },
  privacyTitle: {
    color: colors.heading,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  privacyText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 21,
  },
});
