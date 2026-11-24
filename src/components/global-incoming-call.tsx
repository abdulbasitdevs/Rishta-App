import { supabase } from "@/lib/supabase";
import { usePathname, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type IncomingCall = {
  id: string;
  call_type: "audio" | "video";
  status: "ringing";
};

type MissedCall = {
  id: string;
  caller_id: string;
  call_type: "audio" | "video";
  status: "missed";
};

export default function GlobalIncomingCall() {
  const router = useRouter();
  const pathname = usePathname();

  const [userId, setUserId] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [missedCall, setMissedCall] = useState<MissedCall | null>(null);
  const [missedCallerName, setMissedCallerName] = useState("");
  const [answering, setAnswering] = useState(false);
  const [error, setError] = useState("");

  // Only show new missed calls during this login.
  const sessionStartRef = useRef(new Date().toISOString());

  // Avoid showing the same missed call repeatedly.
  const shownMissedIdsRef = useRef<Set<string>>(new Set());

  // Detect login and logout.
  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setUserId(data.session?.user.id ?? null);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUserId(session?.user.id ?? null);
      },
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Reset on login/logout or account change.
  useEffect(() => {
    sessionStartRef.current = new Date().toISOString();
    shownMissedIdsRef.current.clear();
    setIncomingCall(null);
    setMissedCall(null);
    setError("");
  }, [userId]);

  // Check incoming and missed calls across the app.
  useEffect(() => {
    if (!userId || pathname === "/call") {
      setIncomingCall(null);
      return;
    }

    let active = true;
    let checking = false;

    async function checkCalls() {
      if (!active || checking) return;

      checking = true;

      try {
        // Check for an active incoming call.
        const { data: ringing, error: ringingError } = await supabase
          .from("rishta_calls")
          .select("id,call_type,status")
          .eq("receiver_id", userId)
          .eq("status", "ringing")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!active) return;

        if (ringingError) {
          throw ringingError;
        }

        const currentIncoming = (ringing as IncomingCall | null) ?? null;

        setIncomingCall(currentIncoming);

        // Check missed calls directly from database.
        const { data: missedRows, error: missedError } = await supabase
          .from("rishta_calls")
          .select("id,caller_id,call_type,status")
          .eq("receiver_id", userId)
          .eq("status", "missed")
          .gte("created_at", sessionStartRef.current)
          .order("created_at", { ascending: false })
          .limit(10);

        if (!active) return;

        if (missedError) {
          throw missedError;
        }

        const newMissedCall = ((missedRows ?? []) as MissedCall[]).find(
          (call) => !shownMissedIdsRef.current.has(call.id),
        );

        if (newMissedCall) {
          // Mark as shown so OK does not reopen it.
          shownMissedIdsRef.current.add(newMissedCall.id);

          setMissedCall((previous) => previous ?? newMissedCall);
        }

        setError("");
      } catch (e) {
        console.error("Call notification check failed:", e);

        if (active) {
          setError("Unable to check calls.");
        }
      } finally {
        checking = false;
      }
    }

    // Check immediately.
    void checkCalls();

    // Realtime listener.
    const channel = supabase
      .channel(`global-calls-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rishta_calls",
          filter: `receiver_id=eq.${userId}`,
        },
        () => {
          void checkCalls();
        },
      )
      .subscribe();

    // Backup check every 5 seconds.
    const interval = setInterval(() => {
      void checkCalls();
    }, 5000);

    return () => {
      active = false;
      clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [userId, pathname]);

  useEffect(() => {
    if (!missedCall?.caller_id) {
      setMissedCallerName("");
      return;
    }

    let active = true;

    setMissedCallerName("");

    async function loadCallerName() {
      const { data, error } = await supabase
        .from("rishta_discovery_profiles")
        .select("display_name")
        .eq("user_id", missedCall!.caller_id)
        .maybeSingle();

      if (!active) return;

      if (error) {
        console.error("Unable to load caller name:", error.message);
      }

      setMissedCallerName(data?.display_name?.trim() || "your match");
    }

    void loadCallerName();

    return () => {
      active = false;
    };
  }, [missedCall?.caller_id]);

  async function respond(action: "accept" | "reject") {
    if (!incomingCall || answering) return;

    setAnswering(true);
    setError("");

    const call = incomingCall;

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        "respond-rishta-call",
        {
          body: {
            callId: call.id,
            action,
          },
        },
      );

      if (functionError) {
        let message = functionError.message;

        if (functionError.context instanceof Response) {
          try {
            const result = await functionError.context.json();

            message = typeof result.error === "string" ? result.error : message;
          } catch {}
        }

        throw new Error(message);
      }

      if (!data?.call?.id) {
        throw new Error("Invalid call response.");
      }

      setIncomingCall(null);

      if (action === "accept") {
        router.push({
          pathname: "/call",
          params: {
            callId: call.id,
            callType: call.call_type,
          },
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to respond to call.");
    } finally {
      setAnswering(false);
    }
  }

  const showIncoming = !!incomingCall && pathname !== "/call";

  const showMissed = !!missedCall && !incomingCall && pathname !== "/call";

  return (
    <Modal
      visible={!!userId && (showIncoming || showMissed)}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (showMissed) {
          setMissedCall(null);
        }
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {showIncoming ? (
            <>
              <Text style={styles.icon}>
                {incomingCall?.call_type === "video" ? "🎥" : "📞"}
              </Text>

              <Text style={styles.title}>
                Incoming{" "}
                {incomingCall?.call_type === "video" ? "Video" : "Audio"} Call
              </Text>

              <Text style={styles.subtitle}>
                Your accepted match is calling...
              </Text>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              {answering ? <ActivityIndicator color="#12D894" /> : null}

              <View style={styles.buttons}>
                <Pressable
                  style={styles.reject}
                  disabled={answering}
                  onPress={() => void respond("reject")}
                >
                  <Text style={styles.buttonText}>❌ Reject</Text>
                </Pressable>

                <Pressable
                  style={styles.accept}
                  disabled={answering}
                  onPress={() => void respond("accept")}
                >
                  <Text style={styles.buttonText}>✅ Accept</Text>
                </Pressable>
              </View>
            </>
          ) : showMissed ? (
            <>
              <Text style={styles.icon}>📵</Text>

              <Text style={styles.title}>
                Missed {missedCall?.call_type === "video" ? "Video" : "Audio"}{" "}
                Call
              </Text>

              <Text style={styles.subtitle}>
                {missedCallerName
                  ? `You missed a call from ${missedCallerName}.`
                  : "You missed an incoming call."}
              </Text>

              <Pressable
                style={styles.okButton}
                onPress={() => setMissedCall(null)}
              >
                <Text style={styles.buttonText}>OK</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  card: {
    width: "100%",
    maxWidth: 380,
    padding: 25,
    borderRadius: 22,
    backgroundColor: "#09242B",
    alignItems: "center",
    gap: 14,
  },

  icon: {
    fontSize: 55,
  },

  title: {
    fontSize: 24,
    color: "#FFFFFF",
    fontWeight: "800",
    textAlign: "center",
  },

  subtitle: {
    color: "#A8B8BF",
    textAlign: "center",
  },

  error: {
    color: "#FF9999",
    textAlign: "center",
  },

  buttons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    width: "100%",
  },

  reject: {
    flex: 1,
    padding: 14,
    backgroundColor: "#A03545",
    borderRadius: 12,
    alignItems: "center",
  },

  accept: {
    flex: 1,
    padding: 14,
    backgroundColor: "#087B58",
    borderRadius: 12,
    alignItems: "center",
  },

  okButton: {
    backgroundColor: "#087B58",
    paddingVertical: 14,
    paddingHorizontal: 50,
    borderRadius: 12,
    marginTop: 10,
    alignItems: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    textAlign: "center",
  },
});
