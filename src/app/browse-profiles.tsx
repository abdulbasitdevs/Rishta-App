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

import { supabase } from "@/lib/supabase";
import { theme } from "@/theme/tokens";

const { colors, spacing, radius } = theme;

type DiscoveryProfile = {
  user_id: string;
  display_name: string;
  gender: string | null;
  education_level: string | null;
  profession: string | null;
  updated_at: string;
};

const genderFilters = ["All", "Male", "Female"];

export default function BrowseProfilesScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<DiscoveryProfile[]>([]);
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("All");
  const [error, setError] = useState("");

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        router.replace("/login");
        return;
      }

      const { data, error: browseError } = await supabase
        .from("rishta_discovery_profiles")
        .select(
          "user_id, display_name, gender, education_level, profession, updated_at",
        )
        .eq("is_visible", true)
        .neq("user_id", authData.user.id)
        .order("updated_at", { ascending: false })
        .limit(50);

      if (browseError) {
        setError(browseError.message);
        return;
      }

      setProfiles(data ?? []);
    } catch {
      setError("Unable to load profiles. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadProfiles();

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.replace("/login");
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [loadProfiles, router]);

  const filteredProfiles = useMemo(() => {
    const query = search.trim().toLowerCase();

    return profiles.filter((profile) => {
      const matchesGender =
        genderFilter === "All" || profile.gender === genderFilter;

      const searchableText = [
        profile.display_name,
        profile.education_level,
        profile.profession,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || searchableText.includes(query);

      return matchesGender && matchesSearch;
    });
  }, [profiles, search, genderFilter]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.wrapper}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.replace("/dashboard")}
          >
            <Text style={styles.backText}>← Dashboard</Text>
          </Pressable>

          <View style={styles.header}>
            <View style={styles.iconBox}>
              <Text style={styles.heart}>♥</Text>
            </View>

            <Text style={styles.title}>Discover Rishta Profiles</Text>

            <Text style={styles.subtitle}>
              Explore profiles shared by members who have opted into discovery.
            </Text>
          </View>

          <View style={styles.searchCard}>
            <Text style={styles.label}>Search Profiles</Text>

            <TextInput
              style={styles.input}
              placeholder="Search name, education or profession"
              placeholderTextColor={colors.textSecondary}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
            />

            <Text style={styles.label}>Gender</Text>

            <View style={styles.filters}>
              {genderFilters.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setGenderFilter(option)}
                  style={[
                    styles.filter,
                    genderFilter === option && styles.filterSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      genderFilter === option && styles.filterTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.resultsHeader}>
              <Text style={styles.resultsText}>
                {filteredProfiles.length} profiles found
              </Text>

              <Pressable onPress={() => void loadProfiles()} disabled={loading}>
                <Text style={styles.refreshText}>Refresh</Text>
              </Pressable>
            </View>
          </View>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.subtitle}>Loading profiles...</Text>
            </View>
          ) : error ? (
            <View style={styles.emptyCard}>
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : filteredProfiles.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>♡</Text>

              <Text style={styles.emptyTitle}>No Profiles Found</Text>

              <Text style={styles.subtitle}>
                No published profiles match your filters yet. Try changing your
                search or check again later.
              </Text>
            </View>
          ) : (
            <View style={styles.profileList}>
              {filteredProfiles.map((profile) => (
                <View key={profile.user_id} style={styles.profileCard}>
                  <View style={styles.profileTop}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {profile.display_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.profileInfo}>
                      <Text style={styles.profileName}>
                        {profile.display_name}
                      </Text>

                      <Text style={styles.profileMeta}>
                        {profile.gender || "Gender not provided"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Education</Text>

                    <Text style={styles.detailValue}>
                      {profile.education_level || "Not provided"}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Profession</Text>

                    <Text style={styles.detailValue}>
                      {profile.profession || "Not provided"}
                    </Text>
                  </View>

                  <Text style={styles.privacyNote}>
                    Only member-approved public details are shown.
                  </Text>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.footer}>
            Private photos, email addresses, birth dates and family information
            are not displayed here.
          </Text>
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
  content: {
    padding: spacing.xl,
    alignItems: "center",
    flexGrow: 1,
  },
  wrapper: {
    width: "100%",
    maxWidth: 620,
  },
  backButton: {
    paddingVertical: spacing.md,
    marginBottom: spacing.xl,
    alignSelf: "flex-start",
  },
  backText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xxxl,
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceSoft,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  heart: {
    color: colors.primary,
    fontSize: 42,
  },
  title: {
    fontSize: 27,
    fontWeight: "800",
    color: colors.heading,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 23,
    textAlign: "center",
  },
  searchCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    fontSize: 15,
    color: colors.text,
    marginBottom: spacing.xl,
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  filter: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
  },
  filterSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceSoft,
  },
  filterText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  filterTextSelected: {
    color: colors.primary,
    fontWeight: "700",
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultsText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  refreshText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  centered: {
    padding: spacing.xxxl,
    alignItems: "center",
    gap: spacing.lg,
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    padding: spacing.xxxl,
    alignItems: "center",
    gap: spacing.lg,
  },
  emptyIcon: {
    fontSize: 48,
    color: colors.primary,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.heading,
  },
  profileList: {
    gap: spacing.lg,
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  profileTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.primary,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 19,
    color: colors.heading,
    fontWeight: "800",
    marginBottom: spacing.xs,
  },
  profileMeta: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    flex: 1,
    textAlign: "right",
  },
  privacyNote: {
    backgroundColor: colors.surfaceSoft,
    padding: spacing.md,
    borderRadius: radius.md,
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: spacing.md,
  },
  error: {
    color: colors.error,
    textAlign: "center",
    fontSize: 14,
  },
  footer: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 20,
    textAlign: "center",
    marginVertical: spacing.xxxl,
  },
});
