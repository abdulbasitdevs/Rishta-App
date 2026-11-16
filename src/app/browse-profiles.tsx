import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
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
  faith_category: string | null;
  muslim_sect: string | null;
  updated_at: string;
};

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

type ChipGroupProps = {
  title: string;
  options: string[];
  selected: string;
  onChange: (value: string) => void;
};

function ChipGroup({ title, options, selected, onChange }: ChipGroupProps) {
  return (
    <View style={styles.filterGroup}>
      <Text style={styles.filterLabel}>{title}</Text>

      <View style={styles.chips}>
        {options.map((option) => {
          const active = selected === option;

          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(option)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function BrowseProfilesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 700;

  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<DiscoveryProfile[]>([]);
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("All");
  const [religionFilter, setReligionFilter] = useState("All");
  const [sectFilter, setSectFilter] = useState("All");
  const [educationFilter, setEducationFilter] = useState("All");
  const [professionFilter, setProfessionFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(true);
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
          "user_id, display_name, gender, education_level, profession, faith_category, muslim_sect, updated_at",
        )
        .eq("is_visible", true)
        .neq("user_id", authData.user.id)
        .order("updated_at", { ascending: false })
        .limit(50);

      if (browseError) throw browseError;

      setProfiles(data ?? []);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load profiles. Please try again.",
      );
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

  const educationOptions = useMemo(() => {
    const values = profiles
      .map((profile) => profile.education_level?.trim())
      .filter((value): value is string => Boolean(value));

    return ["All", ...Array.from(new Set(values)).sort()];
  }, [profiles]);

  const professionOptions = useMemo(() => {
    const values = profiles
      .map((profile) => profile.profession?.trim())
      .filter((value): value is string => Boolean(value));

    return ["All", ...Array.from(new Set(values)).sort()];
  }, [profiles]);

  const filteredProfiles = useMemo(() => {
    const query = search.trim().toLowerCase();

    return profiles.filter((profile) => {
      const searchable = [
        profile.display_name,
        profile.education_level,
        profile.profession,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!query || searchable.includes(query)) &&
        (genderFilter === "All" || profile.gender === genderFilter) &&
        (religionFilter === "All" ||
          profile.faith_category === religionFilter) &&
        (religionFilter !== "Muslim" ||
          sectFilter === "All" ||
          profile.muslim_sect === sectFilter) &&
        (educationFilter === "All" ||
          profile.education_level?.trim() === educationFilter) &&
        (professionFilter === "All" ||
          profile.profession?.trim() === professionFilter)
      );
    });
  }, [
    profiles,
    search,
    genderFilter,
    religionFilter,
    sectFilter,
    educationFilter,
    professionFilter,
  ]);

  const activeCount =
    Number(Boolean(search.trim())) +
    Number(genderFilter !== "All") +
    Number(religionFilter !== "All") +
    Number(religionFilter === "Muslim" && sectFilter !== "All") +
    Number(educationFilter !== "All") +
    Number(professionFilter !== "All");

  function resetFilters() {
    setSearch("");
    setGenderFilter("All");
    setReligionFilter("All");
    setSectFilter("All");
    setEducationFilter("All");
    setProfessionFilter("All");
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.page}>
          <View style={styles.topBar}>
            <Pressable
              onPress={() => router.replace("/dashboard")}
              style={styles.backButton}
              accessibilityRole="button"
            >
              <Text style={styles.backText}>← Dashboard</Text>
            </Pressable>

            <Text style={styles.topBrand}>RISHTA APP ♥</Text>
          </View>

          <View style={[styles.hero, isWide && styles.heroWide]}>
            <View style={styles.heroIcon}>
              <Text style={styles.heroHeart}>♥</Text>
            </View>

            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>DISCOVER YOUR CONNECTION</Text>

              <Text
                style={[styles.heroTitle, !isWide && styles.heroTitleSmall]}
              >
                Find Your Rishta
              </Text>

              <Text style={styles.heroSubtitle}>
                Explore profiles shared by members. Choose your preferences and
                find a meaningful match.
              </Text>

              <View style={styles.privacyBadge}>
                <Text style={styles.privacyBadgeText}>
                  ♡ Only member-approved public details
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.searchPanel}>
            <View style={styles.panelTop}>
              <View style={styles.panelHeading}>
                <Text style={styles.panelTitle}>Search & Filters</Text>

                <Text style={styles.panelDescription}>
                  Every filter is optional.
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() => setShowFilters((value) => !value)}
                style={styles.toggleButton}
              >
                <Text style={styles.toggleText}>
                  {showFilters ? "Hide filters  −" : "Show filters  +"}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.filterLabel}>Search by name or background</Text>

            <View style={styles.searchBox}>
              <Text style={styles.searchIcon}>⌕</Text>

              <TextInput
                accessibilityLabel="Search by name, education or profession"
                placeholder="e.g. Doctor, Ayesha, Master's"
                placeholderTextColor={colors.textSecondary}
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
                returnKeyType="search"
              />

              {search.length > 0 ? (
                <Pressable
                  onPress={() => setSearch("")}
                  style={styles.clearSearch}
                >
                  <Text style={styles.clearSearchText}>×</Text>
                </Pressable>
              ) : null}
            </View>

            <Text style={styles.searchHint}>
              Results update automatically as you type or select a filter.
            </Text>

            {showFilters ? (
              <>
                <View style={styles.sectionHeading}>
                  <Text style={styles.sectionTitle}>Your preferences</Text>

                  <Text style={styles.sectionSubtitle}>
                    Select only what matters to you
                  </Text>
                </View>

                <View style={styles.filterGrid}>
                  <View style={isWide ? styles.halfWidth : styles.fullWidth}>
                    <ChipGroup
                      title="Gender"
                      options={genderOptions}
                      selected={genderFilter}
                      onChange={setGenderFilter}
                    />
                  </View>

                  <View style={isWide ? styles.halfWidth : styles.fullWidth}>
                    <ChipGroup
                      title="Religion"
                      options={religionOptions}
                      selected={religionFilter}
                      onChange={(value) => {
                        setReligionFilter(value);
                        setSectFilter("All");
                      }}
                    />
                  </View>

                  {religionFilter === "Muslim" ? (
                    <View style={isWide ? styles.halfWidth : styles.fullWidth}>
                      <ChipGroup
                        title="Firqa (only if shared)"
                        options={sectOptions}
                        selected={sectFilter}
                        onChange={setSectFilter}
                      />
                    </View>
                  ) : null}

                  <View style={isWide ? styles.halfWidth : styles.fullWidth}>
                    <ChipGroup
                      title="Education"
                      options={educationOptions}
                      selected={educationFilter}
                      onChange={setEducationFilter}
                    />
                  </View>

                  <View style={isWide ? styles.halfWidth : styles.fullWidth}>
                    <ChipGroup
                      title="Profession"
                      options={professionOptions}
                      selected={professionFilter}
                      onChange={setProfessionFilter}
                    />
                  </View>
                </View>

                <View style={styles.comingSoon}>
                  <Text style={styles.comingSoonTitle}>
                    More filters are planned
                  </Text>

                  <Text style={styles.comingSoonText}>
                    Age, City, Marital Status and Height will be available after
                    public-sharing controls are ready.
                  </Text>
                </View>
              </>
            ) : null}

            <View style={styles.filterFooter}>
              <Text style={styles.activeText}>
                {activeCount === 0
                  ? "No filters applied"
                  : `${activeCount} filter${
                      activeCount === 1 ? "" : "s"
                    } applied`}
              </Text>

              <Pressable
                disabled={activeCount === 0}
                accessibilityRole="button"
                onPress={resetFilters}
                style={[
                  styles.resetButton,
                  activeCount === 0 && styles.disabled,
                ]}
              >
                <Text style={styles.resetText}>Reset all</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.resultsBar}>
            <View>
              <Text style={styles.resultsTitle}>Matching Profiles</Text>

              <Text style={styles.resultsSubtitle}>
                {loading
                  ? "Looking for public profiles..."
                  : `${filteredProfiles.length} matches from ${profiles.length} loaded profiles`}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => void loadProfiles()}
              disabled={loading}
              style={[styles.refreshButton, loading && styles.disabled]}
            >
              <Text style={styles.refreshText}>⌕ Find Matches</Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.centerCard}>
              <ActivityIndicator size="large" color={colors.primary} />

              <Text style={styles.centerTitle}>Finding profiles...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerCard}>
              <Text style={styles.errorText}>{error}</Text>

              <Pressable
                onPress={() => void loadProfiles()}
                style={styles.retryButton}
              >
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : filteredProfiles.length === 0 ? (
            <View style={styles.centerCard}>
              <Text style={styles.emptyHeart}>♡</Text>

              <Text style={styles.centerTitle}>
                {profiles.length === 0
                  ? "No public profiles yet"
                  : "No matching profiles"}
              </Text>

              <Text style={styles.centerDescription}>
                {profiles.length === 0
                  ? "When other members publish their profiles, they will appear here."
                  : "Try changing your search or removing a filter."}
              </Text>

              {activeCount > 0 ? (
                <Pressable onPress={resetFilters} style={styles.retryButton}>
                  <Text style={styles.retryText}>Clear filters</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View style={styles.profileGrid}>
              {filteredProfiles.map((profile) => {
                const name = profile.display_name?.trim() || "Member";

                return (
                  <View
                    key={profile.user_id}
                    style={[
                      styles.profileCard,
                      isWide ? styles.cardHalf : styles.cardFull,
                    ]}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarLetter}>
                          {name.charAt(0).toUpperCase()}
                        </Text>
                      </View>

                      <View style={styles.cardIdentity}>
                        <Text style={styles.memberName} numberOfLines={2}>
                          {name}
                        </Text>

                        <Text style={styles.memberGender}>
                          {profile.gender || "Gender not provided"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.profileDivider} />

                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Education</Text>

                      <Text style={styles.infoValue} numberOfLines={2}>
                        {profile.education_level || "Not provided"}
                      </Text>
                    </View>

                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Profession</Text>

                      <Text style={styles.infoValue} numberOfLines={2}>
                        {profile.profession || "Not provided"}
                      </Text>
                    </View>

                    {profile.faith_category ? (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Religion</Text>

                        <Text style={styles.infoValue}>
                          {profile.faith_category}
                        </Text>
                      </View>
                    ) : null}

                    {profile.faith_category === "Muslim" &&
                    profile.muslim_sect ? (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Firqa</Text>

                        <Text style={styles.infoValue}>
                          {profile.muslim_sect}
                        </Text>
                      </View>
                    ) : null}

                    <Pressable
                      style={styles.viewProfileButton}
                      onPress={() =>
                        router.push({
                          pathname: "/member-profile",
                          params: { userId: profile.user_id },
                        })
                      }
                    >
                      <Text style={styles.viewProfileText}>View Profile →</Text>
                    </Pressable>

                    <View style={styles.cardFooter}>
                      <Text style={styles.publicText}>
                        ♡ Public details shared by this member
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.bottomNote}>
            <Text style={styles.bottomTitle}>Privacy comes first</Text>

            <Text style={styles.bottomText}>
              Only opted-in public profiles appear here. Private photos, email
              addresses, dates of birth and family details are not shown.
              Results currently include up to 50 recent public profiles.
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
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    alignItems: "center",
  },
  page: {
    width: "100%",
    maxWidth: 1100,
    paddingBottom: spacing.xxl,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  backButton: {
    paddingVertical: spacing.md,
    paddingRight: spacing.lg,
  },
  backText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "700",
  },
  topBrand: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  hero: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  heroWide: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xl,
  },
  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  heroHeart: {
    color: colors.primary,
    fontSize: 32,
  },
  heroCopy: {
    flex: 1,
  },
  eyebrow: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 1.3,
    marginBottom: spacing.sm,
  },
  heroTitle: {
    color: colors.heading,
    fontWeight: "800",
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  heroTitleSmall: {
    fontSize: 26,
  },
  heroSubtitle: {
    color: colors.textSecondary,
    lineHeight: 22,
    fontSize: 14,
    maxWidth: 650,
  },
  privacyBadge: {
    alignSelf: "flex-start",
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  privacyBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  searchPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderColor: colors.border,
    borderWidth: 1,
    marginBottom: spacing.xxl,
  },
  panelTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  panelHeading: {
    flex: 1,
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.heading,
    marginBottom: spacing.xs,
  },
  panelDescription: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  toggleButton: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  toggleText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 12,
  },
  filterLabel: {
    color: colors.heading,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: spacing.md,
  },
  searchBox: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    minHeight: 54,
    paddingHorizontal: spacing.lg,
  },
  searchIcon: {
    color: colors.primary,
    fontSize: 25,
    marginRight: spacing.md,
  },
  searchInput: {
    flex: 1,
    minHeight: 52,
    color: colors.text,
    fontSize: 14,
    paddingVertical: spacing.md,
  },
  clearSearch: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  clearSearchText: {
    color: colors.textSecondary,
    fontSize: 23,
  },
  searchHint: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: spacing.sm,
  },
  sectionHeading: {
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.heading,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  filterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  halfWidth: {
    width: "48%",
  },
  fullWidth: {
    width: "100%",
  },
  filterGroup: {
    marginBottom: spacing.xl,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.surface,
    fontWeight: "800",
  },
  comingSoon: {
    backgroundColor: colors.surfaceSoft,
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
  },
  comingSoonTitle: {
    color: colors.heading,
    fontWeight: "700",
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  comingSoonText: {
    color: colors.textSecondary,
    lineHeight: 19,
    fontSize: 12,
  },
  filterFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.md,
    paddingTop: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  activeText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  resetButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  resetText: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 12,
  },
  disabled: {
    opacity: 0.45,
  },
  resultsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  resultsTitle: {
    color: colors.heading,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: spacing.xs,
  },
  resultsSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  refreshButton: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  refreshText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  centerCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.xxxl,
    alignItems: "center",
    gap: spacing.lg,
  },
  centerTitle: {
    color: colors.heading,
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
  },
  centerDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 21,
    textAlign: "center",
    maxWidth: 430,
  },
  emptyHeart: {
    fontSize: 42,
    color: colors.primary,
  },
  errorText: {
    color: colors.error,
    textAlign: "center",
    fontSize: 13,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  retryText: {
    color: colors.surface,
    fontWeight: "800",
    fontSize: 13,
  },
  profileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: spacing.lg,
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  cardHalf: {
    width: "48%",
  },
  cardFull: {
    width: "100%",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    color: colors.primary,
    fontSize: 23,
    fontWeight: "800",
  },
  cardIdentity: {
    flex: 1,
  },
  memberName: {
    color: colors.heading,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: spacing.xs,
  },
  memberGender: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  profileDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  infoLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  infoValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
    flex: 1,
  },
  cardFooter: {
    marginTop: spacing.lg,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  publicText: {
    color: colors.textSecondary,
    fontSize: 11,
  },

  viewProfileButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xl,
  },
  viewProfileText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "800",
  },

  bottomNote: {
    marginTop: spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.lg,
  },
  bottomTitle: {
    color: colors.heading,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  bottomText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 20,
  },
});
