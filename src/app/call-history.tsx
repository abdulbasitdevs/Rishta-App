import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type CallRecord = {
  id: string;
  caller_id: string;
  receiver_id: string;
  call_type: "audio" | "video";
  status: "ringing" | "accepted" | "rejected" | "missed" | "ended";
  created_at: string;
  answered_at: string | null;
  ended_at: string | null;
};

const HISTORY_LIMIT = 20;

export default function CallHistoryScreen() {
  const router = useRouter();

  const [myId, setMyId] = useState<string | null>(null);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadUser() {
      const { data, error: authError } = await supabase.auth.getUser();

      if (!active) return;

      if (authError || !data.user) {
        setError("Please log in to view call history.");
        setLoading(false);
        return;
      }

      setMyId(data.user.id);
    }

    void loadUser();

    return () => {
      active = false;
    };
  }, []);

  const loadHistory = useCallback(
    async (isRefresh = false) => {
      if (!myId) return;

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        // Fetch only the latest 20 calls involving this user.
        const { data, error: callsError } = await supabase
          .from("rishta_calls")
          .select(
            "id,caller_id,receiver_id,call_type,status,created_at,answered_at,ended_at",
          )
          .or(`caller_id.eq.${myId},receiver_id.eq.${myId}`)
          .order("created_at", { ascending: false })
          .limit(HISTORY_LIMIT);

        if (callsError) throw callsError;

        const records = (data ?? []) as CallRecord[];
        setCalls(records);

        // Find the other member in each call.
        const otherUserIds = [
          ...new Set(
            records.map((call) =>
              call.caller_id === myId ? call.receiver_id : call.caller_id,
            ),
          ),
        ];

        if (otherUserIds.length === 0) {
          setNames({});
          return;
        }

        // Fetch names for these members.
        const { data: profiles, error: profilesError } = await supabase
          .from("rishta_discovery_profiles")
          .select("user_id,display_name")
          .in("user_id", otherUserIds);

        if (profilesError) {
          console.warn(
            "Could not load call history names:",
            profilesError.message,
          );
        }

        const nameMap: Record<string, string> = {};

        for (const profile of profiles ?? []) {
          nameMap[profile.user_id] = profile.display_name?.trim() || "Member";
        }

        setNames(nameMap);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Unable to load call history.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [myId],
  );

  useEffect(() => {
    if (myId) {
      void loadHistory();
    }
  }, [myId, loadHistory]);

  function getCallLabel(call: CallRecord) {
    const outgoing = call.caller_id === myId;
    const direction = outgoing ? "Outgoing" : "Incoming";

    if (call.status === "missed") {
      return outgoing ? "No Answer" : "Missed Call";
    }

    if (call.status === "rejected") {
      return outgoing ? "Declined" : "Rejected Call";
    }

    if (call.status === "ended") {
      return call.answered_at
        ? `${direction} Call`
        : outgoing
          ? "Cancelled Call"
          : "Cancelled Incoming Call";
    }

    if (call.status === "ringing") {
      return "Ringing";
    }

    return "Accepted Call";
  }

  function getIcon(call: CallRecord) {
    if (call.status === "missed") return "📵";
    if (call.status === "rejected") return "❌";
    if (call.call_type === "video") return "🎥";
    return call.caller_id === myId ? "↗️" : "↙️";
  }

  function getCallDuration(call: CallRecord): string | null {
    if (call.status !== "ended" || !call.answered_at || !call.ended_at) {
      return null;
    }

    const start = new Date(call.answered_at).getTime();
    const end = new Date(call.ended_at).getTime();

    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
      return null;
    }

    const totalSeconds = Math.floor((end - start) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes} min ${String(seconds).padStart(2, "0")} sec`;
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function renderCall({ item }: { item: CallRecord }) {
    const otherId = item.caller_id === myId ? item.receiver_id : item.caller_id;

    const memberName = names[otherId] || "Member";
    const callType = item.call_type === "video" ? "Video" : "Audio";

    return (
      <View style={styles.callCard}>
        <Text style={styles.callIcon}>{getIcon(item)}</Text>

        <View style={styles.callDetails}>
          <Text style={styles.memberName}>{memberName}</Text>

          <Text style={styles.callLabel}>
            {getCallLabel(item)} · {callType}
          </Text>

          {getCallDuration(item) !== null && (
            <Text style={styles.callLabel}>⏱ {getCallDuration(item)}</Text>
          )}

          <Text style={styles.callDate}>{formatDate(item.created_at)}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <Text style={styles.title}>📞 Call History</Text>

        <Text style={styles.subtitle}>Your latest {HISTORY_LIMIT} calls</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#12D894" />
          <Text style={styles.muted}>Loading call history...</Text>
        </View>
      ) : error && calls.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable
            style={styles.refreshButton}
            onPress={() => void loadHistory(true)}
          >
            <Text style={styles.refreshText}>Try Again</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <FlatList
            data={calls}
            keyExtractor={(item) => item.id}
            renderItem={renderCall}
            contentContainerStyle={
              calls.length === 0 ? styles.emptyList : styles.list
            }
            refreshing={refreshing}
            onRefresh={() => void loadHistory(true)}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyIcon}>📞</Text>
                <Text style={styles.emptyTitle}>No Call History</Text>
                <Text style={styles.muted}>
                  Your recent calls will appear here.
                </Text>
              </View>
            }
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#05151D",
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1E3B43",
    gap: 8,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 6,
  },
  backText: {
    color: "#12D894",
    fontSize: 15,
    fontWeight: "700",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "800",
  },
  subtitle: {
    color: "#A8B8BF",
    fontSize: 13,
  },
  list: {
    padding: 15,
    paddingBottom: 30,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: "center",
  },
  callCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#102A32",
    borderRadius: 14,
    padding: 15,
    marginBottom: 10,
    gap: 14,
  },
  callIcon: {
    fontSize: 27,
  },
  callDetails: {
    flex: 1,
    gap: 5,
  },
  memberName: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  callLabel: {
    color: "#12D894",
    fontSize: 13,
  },
  callDate: {
    color: "#A8B8BF",
    fontSize: 12,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 25,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 42,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  muted: {
    color: "#A8B8BF",
    fontSize: 14,
    textAlign: "center",
  },
  error: {
    color: "#FF9999",
    padding: 15,
    textAlign: "center",
  },
  refreshButton: {
    backgroundColor: "#087B58",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  refreshText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
