import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
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
  created_at: string;
};

type PublicProfile = {
  user_id: string;
  display_name: string | null;
};

type MessagePreview = {
  invitation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type ChatSetting = {
  invitation_id: string;
  cleared_at: string;
  hidden_at: string | null;
};

type ChatItem = {
  id: string;
  memberId: string;
  memberName: string;
  latestMessage: string;
  latestTime: string | null;
  isOwnMessage: boolean;
};

type ChatAction = "clear" | "delete";

type ConfirmAction = {
  invitationId: string;
  memberName: string;
  action: ChatAction;
};

function formatTime(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function ChatsScreen() {
  const router = useRouter();

  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [myId, setMyId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);

  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
    null,
  );

  const [workingChatId, setWorkingChatId] = useState<string | null>(null);

  const loadChats = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const { data: auth, error: authError } = await supabase.auth.getUser();

        if (authError || !auth.user) {
          router.replace("/login");
          return;
        }

        const userId = auth.user.id;
        setMyId(userId);

        // Load only accepted invitations
        const { data: invitations, error: invitationError } = await supabase
          .from("rishta_invitations")
          .select("id, sender_id, receiver_id, created_at")
          .eq("status", "accepted")
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          .order("created_at", {
            ascending: false,
          });

        if (invitationError) {
          throw invitationError;
        }

        const accepted = (invitations ?? []) as Invitation[];

        if (accepted.length === 0) {
          setChats([]);
          return;
        }

        const memberIds = [
          ...new Set(
            accepted.map((invitation) =>
              invitation.sender_id === userId
                ? invitation.receiver_id
                : invitation.sender_id,
            ),
          ),
        ];

        // Load public member names
        const { data: profiles, error: profileError } = await supabase
          .from("rishta_discovery_profiles")
          .select("user_id, display_name")
          .eq("is_visible", true)
          .in("user_id", memberIds);

        if (profileError) {
          throw profileError;
        }

        const nameMap: Record<string, string> = {};

        ((profiles ?? []) as PublicProfile[]).forEach((profile) => {
          nameMap[profile.user_id] = profile.display_name || "Member";
        });

        const invitationIds = accepted.map((invitation) => invitation.id);

        // Load only this user's chat settings
        const { data: settings, error: settingsError } = await supabase
          .from("rishta_chat_clears")
          .select("invitation_id, cleared_at, hidden_at")
          .eq("user_id", userId)
          .in("invitation_id", invitationIds);

        if (settingsError) {
          throw settingsError;
        }

        const settingMap = new Map<string, ChatSetting>();

        ((settings ?? []) as ChatSetting[]).forEach((setting) => {
          settingMap.set(setting.invitation_id, setting);
        });

        // Load the latest message per conversation.
        // Small batches avoid missing older conversations.
        const latestByInvitation: Record<string, MessagePreview | null> = {};

        for (let offset = 0; offset < accepted.length; offset += 8) {
          const batch = accepted.slice(offset, offset + 8);

          const latestBatch = await Promise.all(
            batch.map(async (invitation) => {
              const { data, error: messageError } = await supabase
                .from("rishta_messages")
                .select("invitation_id, sender_id, body, created_at")
                .eq("invitation_id", invitation.id)
                .order("created_at", {
                  ascending: false,
                })
                .limit(1);

              if (messageError) {
                throw messageError;
              }

              return {
                id: invitation.id,
                latest: (data?.[0] ?? null) as MessagePreview | null,
              };
            }),
          );

          latestBatch.forEach(({ id, latest }) => {
            latestByInvitation[id] = latest;
          });
        }

        const items: ChatItem[] = accepted.flatMap((invitation) => {
          const otherMember =
            invitation.sender_id === userId
              ? invitation.receiver_id
              : invitation.sender_id;

          const latest = latestByInvitation[invitation.id];

          const setting = settingMap.get(invitation.id);

          const latestMs = latest ? new Date(latest.created_at).getTime() : 0;

          const clearedMs = setting
            ? new Date(setting.cleared_at).getTime()
            : 0;

          const hiddenMs = setting?.hidden_at
            ? new Date(setting.hidden_at).getTime()
            : 0;

          // Deleted chat stays hidden until
          // a new message arrives.
          if (hiddenMs && latestMs <= hiddenMs) {
            return [];
          }

          // Don't show old message previews
          // after clearing a conversation.
          const visibleLatest = latestMs > clearedMs ? latest : null;

          return [
            {
              id: invitation.id,
              memberId: otherMember,
              memberName: nameMap[otherMember] || "Member",
              latestMessage:
                visibleLatest?.body ??
                (setting
                  ? "Chat history cleared. Say hello!"
                  : "Connection accepted. Say hello!"),
              latestTime: visibleLatest?.created_at ?? null,
              isOwnMessage: visibleLatest?.sender_id === userId,
            },
          ];
        });

        // Most recent conversations first
        items.sort((a, b) => {
          const aTime = a.latestTime ? new Date(a.latestTime).getTime() : 0;

          const bTime = b.latestTime ? new Date(b.latestTime).getTime() : 0;

          return bTime - aTime;
        });

        setChats(items);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load conversations.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router],
  );

  // Refresh when returning from a conversation
  useFocusEffect(
    useCallback(() => {
      void loadChats();
    }, [loadChats]),
  );

  function openChat(invitationId: string) {
    setMenuId(null);
    setConfirmAction(null);

    router.push({
      pathname: "/chat/[invitationId]",
      params: { invitationId },
    });
  }

  function toggleMenu(invitationId: string) {
    setConfirmAction(null);

    setMenuId((current) => (current === invitationId ? null : invitationId));
  }

  async function applyChatAction() {
    if (!confirmAction || !myId || workingChatId) {
      return;
    }

    const { invitationId, memberName, action } = confirmAction;

    setWorkingChatId(invitationId);
    setError("");
    setNotice("");

    try {
      const now = new Date().toISOString();

      const hiddenAt = action === "delete" ? now : null;

      // Update existing preferences first.
      const { data: updated, error: updateError } = await supabase
        .from("rishta_chat_clears")
        .update({
          cleared_at: now,
          hidden_at: hiddenAt,
        })
        .eq("invitation_id", invitationId)
        .eq("user_id", myId)
        .select("invitation_id");

      if (updateError) {
        throw updateError;
      }

      // Create preferences if this is
      // the first clear/delete action.
      if (!updated?.length) {
        const { error: insertError } = await supabase
          .from("rishta_chat_clears")
          .insert({
            invitation_id: invitationId,
            user_id: myId,
            cleared_at: now,
            hidden_at: hiddenAt,
          });

        if (insertError) {
          throw insertError;
        }
      }

      setMenuId(null);
      setConfirmAction(null);

      await loadChats(true);

      setNotice(
        action === "delete"
          ? `Chat with ${memberName} removed from your list.`
          : `Chat with ${memberName} cleared for you.`,
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update this conversation.",
      );
    } finally {
      setWorkingChatId(null);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.wrapper}>
          {/* Back Button */}
          <Pressable
            onPress={() => router.replace("/browse-profiles")}
            style={styles.backButton}
          >
            <Text style={styles.backText}>← Find Rishta</Text>
          </Pressable>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>♡</Text>

            <Text style={styles.brand}>
              Rishta <Text style={styles.brandGold}>App</Text>
            </Text>

            <Text style={styles.decoration}>✦ ❦ ✦</Text>

            <Text style={styles.title}>Your Messages</Text>

            <Text style={styles.subtitle}>
              Meaningful connections begin with a conversation.
            </Text>
          </View>

          {/* Conversation Heading */}
          <View style={styles.headingRow}>
            <View>
              <Text style={styles.sectionTitle}>Conversations</Text>

              <Text style={styles.countText}>
                {chats.length}{" "}
                {chats.length === 1 ? "conversation" : "conversations"}
              </Text>
            </View>

            <Pressable
              onPress={() => void loadChats(true)}
              disabled={loading || refreshing}
              style={styles.refreshButton}
            >
              <Text style={styles.refreshText}>
                {refreshing ? "Refreshing..." : "↻ Refresh"}
              </Text>
            </Pressable>
          </View>

          {/* Success Notice */}
          {notice ? (
            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          ) : null}

          {/* Error Notice */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Chat List */}
          {loading ? (
            <View style={styles.emptyCard}>
              <ActivityIndicator size="large" color={C.emeraldBright} />

              <Text style={styles.muted}>Loading your conversations...</Text>
            </View>
          ) : chats.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>♡</Text>

              <Text style={styles.emptyTitle}>No Conversations Yet</Text>

              <Text style={styles.muted}>
                When a rishta invitation is accepted, your conversation will
                appear here.
              </Text>

              <Pressable
                onPress={() => router.push("/browse-profiles")}
                style={styles.findButton}
              >
                <Text style={styles.findButtonText}>
                  Explore Rishta Profiles →
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.chatList}>
              {chats.map((chat) => (
                <View key={chat.id} style={styles.chatEntry}>
                  {/* Chat Card */}
                  <View style={styles.chatCard}>
                    <Pressable
                      onPress={() => openChat(chat.id)}
                      style={styles.chatPressArea}
                      accessibilityRole="button"
                      accessibilityLabel={`Open conversation with ${chat.memberName}`}
                    >
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {chat.memberName.charAt(0).toUpperCase()}
                        </Text>
                      </View>

                      <View style={styles.chatInfo}>
                        <View style={styles.nameRow}>
                          <Text style={styles.memberName} numberOfLines={1}>
                            {chat.memberName}
                          </Text>

                          <Text style={styles.dateText}>
                            {formatTime(chat.latestTime)}
                          </Text>
                        </View>

                        <Text style={styles.preview} numberOfLines={1}>
                          {chat.isOwnMessage ? "You: " : ""}
                          {chat.latestMessage}
                        </Text>

                        <Text style={styles.accepted}>
                          ✓ Accepted Connection
                        </Text>
                      </View>
                    </Pressable>

                    {/* Three-dot Menu */}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`More options for ${chat.memberName}`}
                      onPress={() => toggleMenu(chat.id)}
                      style={styles.moreButton}
                    >
                      <Text style={styles.moreText}>⋮</Text>
                    </Pressable>
                  </View>

                  {/* Menu Options */}
                  {menuId === chat.id ? (
                    <View style={styles.menuPanel}>
                      {confirmAction?.invitationId === chat.id ? (
                        <View style={styles.confirmBox}>
                          <Text style={styles.confirmTitle}>
                            {confirmAction.action === "clear"
                              ? "Clear this conversation?"
                              : "Delete this conversation?"}
                          </Text>

                          <Text style={styles.confirmDescription}>
                            {confirmAction.action === "clear"
                              ? `Previous messages with ${chat.memberName} will be hidden for you. The conversation stays in My Chats. The other member's messages won't be affected.`
                              : `Previous messages with ${chat.memberName} will be hidden and this chat removed from your list. It will reappear when a new message arrives. The other member's messages won't be affected.`}
                          </Text>

                          <View style={styles.confirmActions}>
                            <Pressable
                              disabled={!!workingChatId}
                              onPress={() => setConfirmAction(null)}
                              style={styles.cancelButton}
                            >
                              <Text style={styles.cancelText}>Cancel</Text>
                            </Pressable>

                            <Pressable
                              disabled={!!workingChatId}
                              onPress={() => void applyChatAction()}
                              style={styles.confirmButton}
                            >
                              <Text style={styles.confirmButtonText}>
                                {workingChatId === chat.id
                                  ? "Please wait..."
                                  : confirmAction.action === "clear"
                                    ? "Yes, Clear"
                                    : "Yes, Delete"}
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      ) : (
                        <>
                          {/* Clear Chat */}
                          <Pressable
                            disabled={!!workingChatId}
                            onPress={() =>
                              setConfirmAction({
                                invitationId: chat.id,
                                memberName: chat.memberName,
                                action: "clear",
                              })
                            }
                            style={styles.menuOption}
                          >
                            <Text style={styles.menuOptionText}>
                              ⌫ Clear Chat
                            </Text>
                          </Pressable>

                          <View style={styles.menuDivider} />

                          {/* Delete Chat */}
                          <Pressable
                            disabled={!!workingChatId}
                            onPress={() =>
                              setConfirmAction({
                                invitationId: chat.id,
                                memberName: chat.memberName,
                                action: "delete",
                              })
                            }
                            style={styles.menuOption}
                          >
                            <Text style={styles.menuOptionDanger}>
                              ▣ Delete Chat
                            </Text>
                          </Pressable>
                        </>
                      )}
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          )}

          {/* Privacy */}
          <View style={styles.privacyCard}>
            <Text style={styles.privacyTitle}>♡ Private & Secure</Text>

            <Text style={styles.privacyText}>
              Messaging is available only between members with an accepted
              invitation. Your conversations are private to the two
              participants.
            </Text>
          </View>

          <Text style={styles.footer}>
            Meaningful connections, built on mutual consent.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingVertical: 22,
    alignItems: "center",
  },

  wrapper: {
    width: "100%",
    maxWidth: 620,
  },

  backButton: {
    paddingVertical: 12,
    marginBottom: 10,
  },

  backText: {
    color: C.gold,
    fontWeight: "700",
    fontSize: 14,
  },

  header: {
    alignItems: "center",
    paddingVertical: 20,
    marginBottom: 22,
  },

  logo: {
    color: C.gold,
    fontSize: 43,
  },

  brand: {
    color: C.white,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 4,
  },

  brandGold: {
    color: C.gold,
  },

  decoration: {
    color: C.gold,
    fontSize: 18,
    letterSpacing: 5,
    marginVertical: 13,
  },

  title: {
    color: C.white,
    fontSize: 29,
    fontWeight: "800",
    textAlign: "center",
  },

  subtitle: {
    color: C.muted,
    textAlign: "center",
    lineHeight: 21,
    fontSize: 13,
    marginTop: 9,
    maxWidth: 310,
  },

  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  sectionTitle: {
    color: C.white,
    fontWeight: "800",
    fontSize: 19,
  },

  countText: {
    color: C.muted,
    fontSize: 12,
    marginTop: 5,
  },

  refreshButton: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
  },

  refreshText: {
    color: C.gold,
    fontWeight: "700",
    fontSize: 12,
  },

  chatList: {
    gap: 12,
  },

  chatEntry: {
    gap: 0,
  },

  chatCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  chatPressArea: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: C.emerald,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    color: C.goldLight,
    fontSize: 23,
    fontWeight: "800",
  },

  chatInfo: {
    flex: 1,
    gap: 5,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  memberName: {
    color: C.white,
    fontSize: 16,
    fontWeight: "800",
    flex: 1,
  },

  dateText: {
    color: C.muted,
    fontSize: 10,
  },

  preview: {
    color: C.muted,
    fontSize: 12,
  },

  accepted: {
    color: C.emeraldBright,
    fontSize: 11,
    fontWeight: "700",
  },

  moreButton: {
    width: 37,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceDark,
  },

  moreText: {
    fontSize: 26,
    lineHeight: 30,
    color: C.gold,
    fontWeight: "800",
  },

  menuPanel: {
    marginTop: 6,
    marginHorizontal: 8,
    borderRadius: 14,
    paddingVertical: 5,
    backgroundColor: C.surfaceDark,
    borderWidth: 1,
    borderColor: C.border,
  },

  menuOption: {
    paddingVertical: 14,
    paddingHorizontal: 18,
  },

  menuOptionText: {
    color: C.white,
    fontSize: 14,
    fontWeight: "700",
  },

  menuOptionDanger: {
    color: C.error,
    fontSize: 14,
    fontWeight: "700",
  },

  menuDivider: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: 14,
  },

  confirmBox: {
    padding: 15,
    gap: 12,
  },

  confirmTitle: {
    color: C.white,
    fontWeight: "800",
    fontSize: 15,
  },

  confirmDescription: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 19,
  },

  confirmActions: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },

  cancelButton: {
    flex: 1,
    minWidth: 95,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
  },

  cancelText: {
    color: C.white,
    fontWeight: "700",
  },

  confirmButton: {
    flex: 1,
    minWidth: 110,
    backgroundColor: C.emerald,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    padding: 12,
  },

  confirmButtonText: {
    color: C.white,
    fontWeight: "800",
  },

  noticeBox: {
    padding: 13,
    borderRadius: 12,
    backgroundColor: C.surfaceDark,
    borderWidth: 1,
    borderColor: C.emeraldBright,
    marginBottom: 12,
  },

  noticeText: {
    color: C.white,
    fontSize: 13,
  },

  emptyCard: {
    backgroundColor: C.surface,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    gap: 13,
  },

  emptyIcon: {
    fontSize: 46,
    color: C.gold,
  },

  emptyTitle: {
    fontSize: 19,
    color: C.white,
    fontWeight: "800",
    textAlign: "center",
  },

  muted: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 21,
    textAlign: "center",
  },

  findButton: {
    marginTop: 10,
    backgroundColor: C.emerald,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
  },

  findButtonText: {
    color: C.white,
    fontWeight: "800",
    fontSize: 13,
  },

  privacyCard: {
    marginTop: 24,
    backgroundColor: C.surfaceDark,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
  },

  privacyTitle: {
    color: C.gold,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 9,
  },

  privacyText: {
    color: C.muted,
    lineHeight: 21,
    fontSize: 12,
  },

  errorBox: {
    padding: 15,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.error,
    marginBottom: 15,
  },

  errorText: {
    color: C.error,
    fontSize: 13,
  },

  footer: {
    color: C.muted,
    textAlign: "center",
    fontSize: 11,
    marginTop: 25,
    marginBottom: 15,
  },
});
