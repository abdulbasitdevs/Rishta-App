import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
};

type Invitation = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
};

type Message = {
  id: string;
  invitation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PrivateChatScreen() {
  const router = useRouter();

  const { invitationId } = useLocalSearchParams<{
    invitationId: string;
  }>();

  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);

  const [myId, setMyId] = useState("");
  const [memberName, setMemberName] = useState("Member");

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");

  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [sending, setSending] = useState(false);

  const [error, setError] = useState("");
  const [sendError, setSendError] = useState("");

  // Read messages from Supabase.
  const loadMessages = useCallback(async () => {
    if (!invitationId) return;

    const { data, error: messageError } = await supabase
      .from("rishta_messages")
      .select("id, invitation_id, sender_id, body, created_at")
      .eq("invitation_id", invitationId)
      .order("created_at", {
        ascending: false,
      })
      .limit(100);

    if (messageError) {
      throw messageError;
    }

    // Show messages oldest to newest.
    setMessages(((data ?? []) as Message[]).reverse());
  }, [invitationId]);

  // Verify user and accepted invitation.
  useEffect(() => {
    let active = true;

    async function initializeChat() {
      setLoading(true);
      setReady(false);
      setError("");
      setMessages([]);

      try {
        if (!invitationId) {
          throw new Error("Invalid conversation link.");
        }

        const { data: auth, error: authError } = await supabase.auth.getUser();

        if (!active) return;

        if (authError || !auth.user) {
          router.replace("/login");
          return;
        }

        const currentUserId = auth.user.id;

        const { data: invitation, error: invitationError } = await supabase
          .from("rishta_invitations")
          .select("id, sender_id, receiver_id, status")
          .eq("id", invitationId)
          .maybeSingle();

        if (!active) return;

        if (invitationError) {
          throw invitationError;
        }

        const accepted = invitation as Invitation | null;

        // Both members have equal chat permission.
        const isParticipant =
          accepted?.sender_id === currentUserId ||
          accepted?.receiver_id === currentUserId;

        if (!accepted || accepted.status !== "accepted" || !isParticipant) {
          throw new Error(
            "This conversation is not available. Both members must have an accepted invitation.",
          );
        }

        const otherUserId =
          accepted.sender_id === currentUserId
            ? accepted.receiver_id
            : accepted.sender_id;

        setMyId(currentUserId);

        // Only read the member's public name.
        const { data: publicProfile } = await supabase
          .from("rishta_discovery_profiles")
          .select("display_name")
          .eq("user_id", otherUserId)
          .eq("is_visible", true)
          .maybeSingle();

        if (!active) return;

        setMemberName(publicProfile?.display_name?.trim() || "Member");

        await loadMessages();

        if (!active) return;

        setReady(true);
      } catch (caughtError) {
        if (active) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to open conversation.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void initializeChat();

    return () => {
      active = false;
    };
  }, [invitationId, router, loadMessages]);

  // Listen for incoming messages in real time.
  useEffect(() => {
    if (!ready || !invitationId) return;

    const channel = supabase

      .channel(
        `rishta-chat-${invitationId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      )

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "rishta_messages",
          filter: `invitation_id=eq.${invitationId}`,
        },
        () => {
          void loadMessages().catch(() => {
            setError("Unable to refresh messages.");
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [ready, invitationId, loadMessages]);

  // Send message.
  async function sendMessage() {
    const text = draft.trim();

    if (
      !text ||
      text.length > 2000 ||
      !ready ||
      !myId ||
      !invitationId ||
      sending
    ) {
      return;
    }

    setSending(true);
    setSendError("");

    try {
      // Database RLS also verifies accepted status.
      const { error: insertError } = await supabase
        .from("rishta_messages")
        .insert({
          invitation_id: invitationId,
          sender_id: myId,
          body: text,
        });

      if (insertError) {
        throw insertError;
      }

      setDraft("");

      // Refresh immediately for the sender.
      await loadMessages();
    } catch (caughtError) {
      setSendError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to send message.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.wrapper}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              onPress={() => router.push("/chats")}
              style={styles.backButton}
            >
              <Text style={styles.backText}>←</Text>
            </Pressable>

            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {memberName.charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={styles.headerInfo}>
              <Text style={styles.memberName} numberOfLines={1}>
                {memberName}
              </Text>

              <Text style={styles.connectionStatus}>♡ Accepted Connection</Text>
            </View>
          </View>

          <View style={styles.privacyBanner}>
            <Text style={styles.privacyText}>
              ♡ Private conversation between accepted members
            </Text>
          </View>

          {/* Chat history */}
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={C.emeraldBright} />
              <Text style={styles.muted}>Opening conversation...</Text>
            </View>
          ) : error && !ready ? (
            <View style={styles.centerBox}>
              <Text style={styles.errorText}>{error}</Text>

              <Pressable
                onPress={() => router.push("/chats")}
                style={styles.backToChats}
              >
                <Text style={styles.backToChatsText}>Back to Messages</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <ScrollView
                ref={scrollRef}
                style={styles.messageList}
                contentContainerStyle={styles.messageContent}
                keyboardShouldPersistTaps="handled"
                onContentSizeChange={() =>
                  scrollRef.current?.scrollToEnd({
                    animated: false,
                  })
                }
              >
                {messages.length === 0 ? (
                  <View style={styles.emptyChat}>
                    <Text style={styles.emptyIcon}>♡</Text>

                    <Text style={styles.emptyTitle}>
                      Start Your Conversation
                    </Text>

                    <Text style={styles.muted}>
                      Your invitation has been accepted. You can now exchange
                      messages privately.
                    </Text>
                  </View>
                ) : (
                  messages.map((message) => {
                    const isMine = message.sender_id === myId;

                    return (
                      <View
                        key={message.id}
                        style={[
                          styles.messageRow,
                          isMine ? styles.myMessageRow : styles.theirMessageRow,
                        ]}
                      >
                        <View
                          style={[
                            styles.bubble,
                            isMine ? styles.myBubble : styles.theirBubble,
                          ]}
                        >
                          <Text style={styles.messageText}>{message.body}</Text>

                          <Text
                            style={[
                              styles.messageTime,
                              isMine && styles.myMessageTime,
                            ]}
                          >
                            {formatTime(message.created_at)}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}

                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </ScrollView>

              {/* Message composer */}
              <View style={styles.composerArea}>
                {sendError ? (
                  <Text style={styles.errorText}>{sendError}</Text>
                ) : null}

                <View style={styles.composer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Type a message..."
                    placeholderTextColor={C.muted}
                    value={draft}
                    onChangeText={setDraft}
                    multiline
                    maxLength={2000}
                    editable={!sending}
                    accessibilityLabel="Message"
                  />

                  <Pressable
                    onPress={() => void sendMessage()}
                    disabled={sending || !draft.trim()}
                    style={[
                      styles.sendButton,
                      (sending || !draft.trim()) && styles.disabled,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Send message"
                  >
                    {sending ? (
                      <ActivityIndicator color={C.white} size="small" />
                    ) : (
                      <Text style={styles.sendText}>➤</Text>
                    )}
                  </Pressable>
                </View>

                <Text style={styles.composerNote}>
                  Be respectful. Never share sensitive information with
                  strangers.
                </Text>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  keyboardView: {
    flex: 1,
  },
  wrapper: {
    flex: 1,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: C.surfaceDark,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backButton: {
    width: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    color: C.gold,
    fontSize: 29,
    fontWeight: "600",
  },
  avatar: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: C.emerald,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: C.goldLight,
    fontSize: 20,
    fontWeight: "800",
  },
  headerInfo: {
    flex: 1,
    gap: 4,
  },
  memberName: {
    color: C.white,
    fontSize: 17,
    fontWeight: "800",
  },
  connectionStatus: {
    color: C.emeraldBright,
    fontSize: 11,
  },
  privacyBanner: {
    paddingHorizontal: 15,
    paddingVertical: 11,
    backgroundColor: C.surface,
    borderBottomColor: C.border,
    borderBottomWidth: 1,
    alignItems: "center",
  },
  privacyText: {
    color: C.gold,
    fontSize: 11,
    textAlign: "center",
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 18,
  },
  muted: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 21,
    textAlign: "center",
  },
  errorText: {
    color: C.error,
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 8,
  },
  backToChats: {
    backgroundColor: C.emerald,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backToChatsText: {
    color: C.white,
    fontWeight: "800",
  },
  messageList: {
    flex: 1,
  },
  messageContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 22,
  },
  emptyChat: {
    flex: 1,
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    padding: 18,
  },
  emptyIcon: {
    color: C.gold,
    fontSize: 50,
  },
  emptyTitle: {
    color: C.white,
    fontWeight: "800",
    fontSize: 19,
    textAlign: "center",
  },
  messageRow: {
    flexDirection: "row",
    marginVertical: 5,
  },
  myMessageRow: {
    justifyContent: "flex-end",
  },
  theirMessageRow: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "82%",
    minWidth: 90,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 17,
  },
  myBubble: {
    backgroundColor: C.emerald,
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    color: C.white,
    fontSize: 14,
    lineHeight: 21,
  },
  messageTime: {
    color: C.muted,
    fontSize: 10,
    textAlign: "right",
    marginTop: 6,
  },
  myMessageTime: {
    color: C.goldLight,
  },
  composerArea: {
    backgroundColor: C.surfaceDark,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingHorizontal: 13,
    paddingTop: 12,
    paddingBottom: 14,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: C.surface,
    color: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 17,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
    maxHeight: 120,
    minHeight: 47,
    textAlignVertical: "top",
  },
  sendButton: {
    backgroundColor: C.emerald,
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  sendText: {
    color: C.white,
    fontSize: 24,
  },
  disabled: {
    opacity: 0.45,
  },
  composerNote: {
    color: C.muted,
    fontSize: 10,
    textAlign: "center",
    marginTop: 9,
  },
});
