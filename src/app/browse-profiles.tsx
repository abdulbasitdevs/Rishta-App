import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Tab = "Discover" | "Received" | "Sent" | "Matches";
type Sort = "Newest" | "Name A-Z";

type DiscoveryProfile = {
  user_id: string;
  display_name: string;
  gender: string | null;
  education_level: string | null;
  profession: string | null;
  faith_category: string | null;
  muslim_sect: string | null;
  updated_at: string;
};

type Invitation = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  created_at: string;
};

const C = {
  bg: "#05151D",
  panel: "#101F29",
  panel2: "#152A34",
  border: "#31434A",
  white: "#F8FBF9",
  muted: "#A8B8BF",
  emerald: "#12D894",
  emeraldDark: "#086B54",
  gold: "#E7BD79",
  red: "#F2A1A4",
};

const tabs: Tab[] = ["Discover", "Received", "Sent", "Matches"];
const genderOptions = ["All", "Male", "Female"];
const religionOptions = [
  "All",
  "Muslim",
  "Christian",
  "Hindu",
  "Sikh",
  "Other",
];
const sectOptions = [
  "All",
  "Ahl-e-Hadith",
  "Barelvi",
  "Deobandi",
  "Shia",
  "Other",
];

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <View style={styles.avatar}>
      <View style={styles.avatarInner}>
        <Text style={styles.avatarLetter}>
          {(name || "M").charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={styles.avatarLock}>
        <Text style={styles.avatarLockText}>⌑</Text>
      </View>
    </View>
  );
}

function Action({
  label,
  onPress,
  outline = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  outline?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.action,
        outline && styles.actionOutline,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.actionText, outline && styles.actionOutlineText]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function BrowseProfilesScreen() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("Discover");
  const [myId, setMyId] = useState<string | null>(null);

  const [profiles, setProfiles] = useState<DiscoveryProfile[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [gender, setGender] = useState("All");
  const [religion, setReligion] = useState("All");
  const [sect, setSect] = useState("All");
  const [education, setEducation] = useState("");
  const [profession, setProfession] = useState("");
  const [sort, setSort] = useState<Sort>("Newest");

  // Load real public profiles and existing invitations.
  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();

      if (authError || !auth.user) {
        router.replace("/login");
        return;
      }

      const uid = auth.user.id;
      setMyId(uid);

      const [discovery, requests] = await Promise.all([
        supabase
          .from("rishta_discovery_profiles")
          .select(
            "user_id,display_name,gender,education_level,profession,faith_category,muslim_sect,updated_at",
          )
          .eq("is_visible", true)
          .neq("user_id", uid)
          .order("updated_at", { ascending: false })
          .limit(100),

        supabase
          .from("rishta_invitations")
          .select("id,sender_id,receiver_id,status,created_at")
          .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

      if (discovery.error) throw discovery.error;
      if (requests.error) throw requests.error;

      setProfiles((discovery.data ?? []) as DiscoveryProfile[]);
      setInvitations((requests.data ?? []) as Invitation[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load profiles.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadData();

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.replace("/login");
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [loadData, router]);

  const profileMap = useMemo(
    () => new Map(profiles.map((p) => [p.user_id, p])),
    [profiles],
  );

  // Search and filter only approved public details.
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const e = education.trim().toLowerCase();
    const job = profession.trim().toLowerCase();

    return profiles
      .filter((p) => {
        const text = [p.display_name, p.education_level, p.profession]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return (
          (!q || text.includes(q)) &&
          (gender === "All" || p.gender === gender) &&
          (religion === "All" || p.faith_category === religion) &&
          (religion !== "Muslim" || sect === "All" || p.muslim_sect === sect) &&
          (!e || (p.education_level || "").toLowerCase().includes(e)) &&
          (!job || (p.profession || "").toLowerCase().includes(job))
        );
      })
      .sort((a, b) =>
        sort === "Name A-Z"
          ? a.display_name.localeCompare(b.display_name)
          : b.updated_at.localeCompare(a.updated_at),
      );
  }, [profiles, search, gender, religion, sect, education, profession, sort]);

  const received = invitations.filter(
    (i) => i.receiver_id === myId && i.status === "pending",
  );

  const sent = invitations.filter((i) => i.sender_id === myId);

  const matches = invitations.filter((i) => i.status === "accepted");

  const getOtherId = (i: Invitation) =>
    i.sender_id === myId ? i.receiver_id : i.sender_id;

  const getExisting = (userId: string) =>
    invitations.find(
      (i) =>
        (i.sender_id === myId && i.receiver_id === userId) ||
        (i.receiver_id === myId && i.sender_id === userId),
    );

  function openProfile(id: string) {
    router.push({
      pathname: "/member-profile",
      params: { userId: id },
    });
  }

  // Send a new interest request.
  async function sendInterest(userId: string) {
    if (!myId || workingId || getExisting(userId)) {
      return;
    }

    setWorkingId(userId);
    setNotice("");

    try {
      const { data, error: sendError } = await supabase
        .from("rishta_invitations")
        .insert({
          sender_id: myId,
          receiver_id: userId,
          status: "pending",
        })
        .select("id,sender_id,receiver_id,status,created_at")
        .single();

      if (sendError) throw sendError;

      setInvitations((previous) => [data as Invitation, ...previous]);

      setNotice("Interest sent successfully. Waiting for a response.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Unable to send request.");
    } finally {
      setWorkingId(null);
    }
  }

  // Only the receiver may accept or decline.
  async function respond(i: Invitation, decision: "accepted" | "declined") {
    if (!myId || workingId) return;

    setWorkingId(i.id);
    setNotice("");

    try {
      const { data, error: updateError } = await supabase
        .from("rishta_invitations")
        .update({
          status: decision,
          updated_at: new Date().toISOString(),
        })
        .eq("id", i.id)
        .eq("receiver_id", myId)
        .eq("status", "pending")
        .select("id,sender_id,receiver_id,status,created_at")
        .maybeSingle();

      if (updateError) throw updateError;

      if (!data) {
        throw new Error(
          "This request has already been processed. Refresh the page.",
        );
      }

      setInvitations((previous) =>
        previous.map((row) => (row.id === i.id ? (data as Invitation) : row)),
      );

      setNotice(
        decision === "accepted"
          ? "Invitation accepted. This member is now in Matches."
          : "Invitation declined.",
      );
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "Unable to update invitation.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  function renderProfile(p: DiscoveryProfile) {
    const existing = getExisting(p.user_id);

    const label =
      existing?.status === "accepted"
        ? "✓ Matched"
        : existing?.status === "pending" && existing.sender_id === myId
          ? "✓ Request Sent"
          : existing?.status === "pending"
            ? "View Received"
            : existing
              ? "Request Closed"
              : "➤ Send Request";

    return (
      <View key={p.user_id} style={styles.card}>
        <View style={styles.cardRow}>
          <Avatar name={p.display_name} />

          <View style={styles.cardInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.cardName}>{p.display_name}</Text>

              <Text style={styles.statusPill}>PUBLIC PROFILE</Text>
            </View>

            <Text style={styles.detail}>
              ♙ {p.gender || "Gender not shared"}
            </Text>

            <Text style={styles.detail}>
              ✦ {p.education_level || "Education not shared"}
            </Text>

            <Text style={styles.detail}>
              ▣ {p.profession || "Profession not shared"}
            </Text>

            {p.faith_category ? (
              <Text style={styles.detail}>
                ◈ {p.faith_category}
                {p.muslim_sect ? ` · ${p.muslim_sect}` : ""}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.privateNotice}>
          <Text style={styles.privateNoticeText}>
            ♧ Private photos stay locked until an invitation is accepted.
          </Text>
        </View>

        <View style={styles.actionRow}>
          <Action
            label="◎ View Profile"
            outline
            onPress={() => openProfile(p.user_id)}
          />

          <Action
            label={workingId === p.user_id ? "Please wait..." : label}
            disabled={
              !!workingId ||
              (!!existing && existing.status !== "pending") ||
              (!!existing && existing.sender_id === myId)
            }
            onPress={() => {
              if (
                existing?.status === "pending" &&
                existing.receiver_id === myId
              ) {
                setTab("Received");
              } else {
                void sendInterest(p.user_id);
              }
            }}
          />
        </View>
      </View>
    );
  }

  function renderInvitation(
    i: Invitation,
    kind: "Received" | "Sent" | "Matches",
  ) {
    const other = getOtherId(i);
    const profile = profileMap.get(other);
    const name = profile?.display_name || "Private member";
    const busy = workingId === i.id;

    return (
      <View key={i.id} style={styles.card}>
        <View style={styles.cardRow}>
          <Avatar name={name} />

          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{name}</Text>

            <Text style={styles.detail}>
              {profile?.profession || "Shared profile details unavailable"}
            </Text>

            <Text style={styles.detail}>Request status: {i.status}</Text>
          </View>
        </View>

        {kind === "Received" ? (
          <View style={styles.actionRow}>
            <Action
              label={busy ? "Please wait..." : "Decline"}
              outline
              disabled={!!workingId}
              onPress={() => void respond(i, "declined")}
            />

            <Action
              label={busy ? "Please wait..." : "✓ Accept"}
              disabled={!!workingId}
              onPress={() => void respond(i, "accepted")}
            />
          </View>
        ) : kind === "Matches" ? (
          <View style={styles.actionRow}>
            <Action
              label={
                profile ? "◎ View Profile & Photos" : "Profile Unavailable"
              }
              disabled={!profile}
              onPress={() => openProfile(other)}
            />
          </View>
        ) : profile ? (
          <View style={styles.actionRow}>
            <Action
              label="◎ View Profile"
              outline
              onPress={() => openProfile(other)}
            />
          </View>
        ) : null}
      </View>
    );
  }

  const tabTotal = (t: Tab) =>
    t === "Received"
      ? received.length
      : t === "Sent"
        ? sent.length
        : t === "Matches"
          ? matches.length
          : shown.length;

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          {/* Top navigation */}
          <View style={styles.topRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace("/dashboard")}
              style={styles.backButton}
            >
              <Text style={styles.backText}>←</Text>
            </Pressable>

            <Text style={styles.brand}>♡ RISHTA APP</Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => setFiltersOpen(!filtersOpen)}
              style={styles.backButton}
            >
              <Text style={styles.backText}>☷</Text>
            </Pressable>
          </View>

          {/* Premium header */}
          <View style={styles.hero}>
            <Text style={styles.gold}>✧ ♥ ✧</Text>

            <Text style={styles.title}>Find Rishta</Text>

            <Text style={styles.subtitle}>
              Pakistan's Trusted Matrimonial Platform
            </Text>

            <View style={styles.accentLine} />
          </View>

          {/* Four working tabs */}
          <View style={styles.tabs}>
            {tabs.map((t) => (
              <Pressable
                key={t}
                accessibilityRole="tab"
                accessibilityState={{
                  selected: tab === t,
                }}
                onPress={() => {
                  setTab(t);
                  setNotice("");
                }}
                style={[styles.tab, tab === t && styles.tabActive]}
              >
                <Text
                  style={[styles.tabText, tab === t && styles.tabTextActive]}
                >
                  {t}
                </Text>

                {t === "Received" && received.length > 0 ? (
                  <View style={styles.countDot}>
                    <Text style={styles.countDotText}>{received.length}</Text>
                  </View>
                ) : null}
              </Pressable>
            ))}
          </View>

          {notice ? (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          ) : null}

          {/* Discover search and filters */}
          {tab === "Discover" ? (
            <>
              <View style={styles.searchRow}>
                <View style={styles.searchBox}>
                  <Text style={styles.searchIcon}>⌕</Text>

                  <TextInput
                    style={styles.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search name, education or profession..."
                    placeholderTextColor={C.muted}
                    autoCapitalize="none"
                  />
                </View>

                <Pressable
                  accessibilityRole="button"
                  style={styles.filterButton}
                  onPress={() => setFiltersOpen(!filtersOpen)}
                >
                  <Text style={styles.filterIcon}>☷</Text>
                </Pressable>
              </View>

              {filtersOpen ? (
                <View style={styles.filterPanel}>
                  <Text style={styles.filterTitle}>Discover Filters</Text>

                  <Text style={styles.filterLabel}>Gender</Text>

                  <View style={styles.chipRow}>
                    {genderOptions.map((x) => (
                      <Chip
                        key={x}
                        label={x}
                        active={gender === x}
                        onPress={() => setGender(x)}
                      />
                    ))}
                  </View>

                  <Text style={styles.filterLabel}>Religion</Text>

                  <View style={styles.chipRow}>
                    {religionOptions.map((x) => (
                      <Chip
                        key={x}
                        label={x}
                        active={religion === x}
                        onPress={() => {
                          setReligion(x);
                          setSect("All");
                        }}
                      />
                    ))}
                  </View>

                  {religion === "Muslim" ? (
                    <>
                      <Text style={styles.filterLabel}>Firqa</Text>

                      <View style={styles.chipRow}>
                        {sectOptions.map((x) => (
                          <Chip
                            key={x}
                            label={x}
                            active={sect === x}
                            onPress={() => setSect(x)}
                          />
                        ))}
                      </View>
                    </>
                  ) : null}

                  <Text style={styles.filterLabel}>Education</Text>

                  <TextInput
                    style={styles.filterInput}
                    value={education}
                    onChangeText={setEducation}
                    placeholder="e.g. BS, MBA"
                    placeholderTextColor={C.muted}
                  />

                  <Text style={styles.filterLabel}>Profession</Text>

                  <TextInput
                    style={styles.filterInput}
                    value={profession}
                    onChangeText={setProfession}
                    placeholder="e.g. Teacher"
                    placeholderTextColor={C.muted}
                  />

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setGender("All");
                      setReligion("All");
                      setSect("All");
                      setEducation("");
                      setProfession("");
                      setSearch("");
                    }}
                  >
                    <Text style={styles.clearText}>Clear all filters</Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          ) : null}

          {/* Result count and sort */}
          <View style={styles.resultHeader}>
            <Text style={styles.resultText}>
              {tab === "Discover"
                ? `♙  ${shown.length} Matching Profiles`
                : `${tab} · ${tabTotal(tab)}`}
            </Text>

            {tab === "Discover" ? (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  setSort(sort === "Newest" ? "Name A-Z" : "Newest")
                }
              >
                <Text style={styles.sortText}>Sort: {sort} ⌄</Text>
              </Pressable>
            ) : null}
          </View>

          {/* Tab content */}
          {loading ? (
            <View style={styles.empty}>
              <ActivityIndicator color={C.emerald} size="large" />

              <Text style={styles.emptyText}>Loading...</Text>
            </View>
          ) : error ? (
            <View style={styles.empty}>
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : tab === "Discover" ? (
            shown.length > 0 ? (
              shown.map(renderProfile)
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No profiles found</Text>

                <Text style={styles.emptyText}>
                  Try adjusting your filters or refresh.
                </Text>
              </View>
            )
          ) : tab === "Received" ? (
            received.length > 0 ? (
              received.map((i) => renderInvitation(i, "Received"))
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No pending requests</Text>

                <Text style={styles.emptyText}>
                  New invitations will appear here.
                </Text>
              </View>
            )
          ) : tab === "Sent" ? (
            sent.length > 0 ? (
              sent.map((i) => renderInvitation(i, "Sent"))
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No sent requests</Text>

                <Text style={styles.emptyText}>
                  Send an interest from Discover to get started.
                </Text>
              </View>
            )
          ) : matches.length > 0 ? (
            matches.map((i) => renderInvitation(i, "Matches"))
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No accepted matches yet</Text>

              <Text style={styles.emptyText}>
                Accepted invitations will appear here.
              </Text>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            style={styles.refresh}
            onPress={() => void loadData()}
            disabled={loading}
          >
            <Text style={styles.refreshText}>
              ↻ Refresh profiles & requests
            </Text>
          </Pressable>

          <Text style={styles.privacyFooter}>
            ♡ Photos and private details are protected. Only accepted members
            may access photos.
          </Text>

          {/* Bottom navigation */}
          <View style={styles.bottomNav}>
            <Pressable
              style={styles.navItem}
              onPress={() => router.replace("/dashboard")}
            >
              <Text style={styles.navIcon}>⌂</Text>
              <Text style={styles.navText}>Home</Text>
            </Pressable>

            <Pressable
              style={styles.navItem}
              onPress={() => setTab("Discover")}
            >
              <Text style={styles.navIconActive}>⌕</Text>
              <Text style={styles.navActive}>Find Rishta</Text>
            </Pressable>

            <Pressable
              style={styles.navItem}
              onPress={() => setTab("Received")}
            >
              <Text style={styles.navIcon}>✉</Text>
              <Text style={styles.navText}>Received</Text>
            </Pressable>

            <Pressable style={styles.navItem} onPress={() => setTab("Matches")}>
              <Text style={styles.navIcon}>♡</Text>
              <Text style={styles.navText}>Matches</Text>
            </Pressable>

            <Pressable
              style={styles.navItem}
              onPress={() => router.push("/my-profile")}
            >
              <Text style={styles.navIcon}>♙</Text>
              <Text style={styles.navText}>Profile</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 15,
    paddingTop: 14,
    paddingBottom: 30,
  },
  container: {
    width: "100%",
    maxWidth: 960,
    alignSelf: "center",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.panel,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    fontSize: 23,
    color: C.white,
  },
  brand: {
    color: C.gold,
    fontWeight: "900",
    fontSize: 15,
    letterSpacing: 2,
  },
  hero: {
    paddingTop: 20,
    paddingBottom: 22,
    alignItems: "center",
  },
  gold: {
    color: C.gold,
    fontSize: 25,
  },
  title: {
    fontSize: 39,
    color: C.white,
    fontWeight: "800",
    marginTop: 5,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
    color: C.muted,
    marginTop: 8,
    textAlign: "center",
  },
  accentLine: {
    width: 76,
    height: 2,
    backgroundColor: C.emerald,
    marginTop: 19,
    borderRadius: 4,
  },
  tabs: {
    flexDirection: "row",
    gap: 7,
    marginBottom: 21,
  },
  tab: {
    flex: 1,
    minHeight: 51,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.panel,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 2,
  },
  tabActive: {
    backgroundColor: C.emeraldDark,
    borderColor: C.emerald,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "700",
    color: C.white,
  },
  tabTextActive: {
    color: C.white,
  },
  countDot: {
    backgroundColor: C.emerald,
    borderRadius: 9,
    minWidth: 16,
    paddingHorizontal: 3,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  countDotText: {
    color: C.bg,
    fontSize: 10,
    fontWeight: "900",
  },
  searchRow: {
    flexDirection: "row",
    gap: 9,
    marginBottom: 16,
  },
  searchBox: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.panel,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  searchIcon: {
    color: C.white,
    fontSize: 27,
    marginRight: 7,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    height: 54,
    color: C.white,
    fontSize: 14,
  },
  filterButton: {
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.emerald,
    borderRadius: 14,
    backgroundColor: C.panel,
  },
  filterIcon: {
    color: C.emerald,
    fontSize: 25,
  },
  filterPanel: {
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 17,
    padding: 16,
    marginBottom: 18,
  },
  filterTitle: {
    color: C.white,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 15,
  },
  filterLabel: {
    color: C.muted,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 9,
  },
  chipRow: {
    flexDirection: "row",
    gap: 7,
    flexWrap: "wrap",
    marginBottom: 8,
  },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  chipActive: {
    borderColor: C.emerald,
    backgroundColor: C.emeraldDark,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: C.muted,
  },
  chipTextActive: {
    color: C.white,
  },
  filterInput: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    minHeight: 44,
    paddingHorizontal: 12,
    fontSize: 13,
    color: C.white,
    marginBottom: 7,
  },
  clearText: {
    color: C.emerald,
    fontWeight: "700",
    paddingTop: 12,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 16,
    gap: 8,
  },
  resultText: {
    color: C.white,
    fontSize: 15,
    fontWeight: "700",
    flexShrink: 1,
  },
  sortText: {
    color: C.muted,
    fontSize: 12,
  },
  card: {
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  avatar: {
    width: 88,
    height: 102,
    backgroundColor: "#104039",
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#2A7760",
  },
  avatarInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#236552",
  },
  avatarLetter: {
    color: C.gold,
    fontSize: 34,
    fontWeight: "800",
  },
  avatarLock: {
    position: "absolute",
    bottom: 7,
    right: 7,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLockText: {
    color: C.emerald,
    fontSize: 15,
    fontWeight: "900",
  },
  cardInfo: {
    flex: 1,
    gap: 5,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 3,
  },
  cardName: {
    color: C.white,
    fontSize: 19,
    fontWeight: "800",
  },
  statusPill: {
    overflow: "hidden",
    backgroundColor: "#173C34",
    color: C.emerald,
    fontSize: 9,
    fontWeight: "800",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 12,
  },
  detail: {
    color: C.muted,
    fontSize: 12.5,
    lineHeight: 19,
  },
  privateNotice: {
    marginTop: 14,
    padding: 10,
    backgroundColor: "#14302F",
    borderRadius: 10,
  },
  privateNoticeText: {
    color: "#C1DDCF",
    fontSize: 12,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginTop: 15,
  },
  action: {
    flex: 1,
    minWidth: 120,
    minHeight: 45,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.emeraldDark,
    borderWidth: 1,
    borderColor: C.emerald,
    paddingHorizontal: 9,
  },
  actionOutline: {
    backgroundColor: "transparent",
    borderColor: C.emerald,
  },
  actionText: {
    color: C.white,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  actionOutlineText: {
    color: C.emerald,
  },
  disabled: {
    opacity: 0.52,
  },
  empty: {
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 19,
    padding: 35,
    alignItems: "center",
    marginTop: 10,
    gap: 10,
  },
  emptyTitle: {
    color: C.white,
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyText: {
    color: C.muted,
    textAlign: "center",
    lineHeight: 21,
  },
  error: {
    color: C.red,
    textAlign: "center",
  },
  notice: {
    backgroundColor: "#14342B",
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.emeraldDark,
    borderRadius: 10,
  },
  noticeText: {
    color: C.white,
    fontSize: 13,
  },
  refresh: {
    alignItems: "center",
    paddingVertical: 16,
  },
  refreshText: {
    color: C.emerald,
    fontSize: 13,
    fontWeight: "700",
  },
  privacyFooter: {
    color: C.muted,
    textAlign: "center",
    lineHeight: 19,
    fontSize: 11,
    marginBottom: 22,
  },
  bottomNav: {
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    paddingVertical: 13,
    flexDirection: "row",
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  navIcon: {
    color: C.muted,
    fontSize: 24,
  },
  navIconActive: {
    color: C.emerald,
    fontSize: 24,
  },
  navText: {
    color: C.muted,
    fontSize: 10,
  },
  navActive: {
    color: C.emerald,
    fontSize: 10,
    fontWeight: "800",
  },
});
