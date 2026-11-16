import { useRouter } from "expo-router";
import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { AppButton } from "@/components/ui/AppButton";
import { supabase } from "@/lib/supabase";
import { theme } from "@/theme/tokens";

const { colors, spacing, radius } = theme;

type BasicProfile = {
  full_name: string;
  gender: string;
  education_level: string | null;
  profession: string | null;
  profile_step: number;
  faith_category: string | null;
  muslim_sect: string | null;
};

export default function DiscoverySettingsScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const [shareReligion, setShareReligion] = useState(false);
  const [shareSect, setShareSect] = useState(false);

  const [profile, setProfile] = useState<BasicProfile | null>(null);
  const [displayName, setDisplayName] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        const { data, error: authError } = await supabase.auth.getUser();

        if (!active) return;

        if (authError || !data.user) {
          router.replace("/login");
          return;
        }

        const { data: basic, error: basicError } = await supabase
          .from("rishta_profiles")

          .select(
            "full_name, gender, education_level, profession, profile_step, faith_category, muslim_sect",
          )

          .eq("user_id", data.user.id)
          .maybeSingle();

        if (!active) return;

        if (basicError) {
          setError(basicError.message);
          return;
        }

        if (!basic || basic.profile_step < 4) {
          router.replace("/profile-photos");
          return;
        }

        setProfile(basic);

        // Default to first name, not full name.
        const firstName = basic.full_name.trim().split(/\s+/)[0];

        setDisplayName(firstName);

        const { data: discovery, error: discoveryError } = await supabase
          .from("rishta_discovery_profiles")

          .select("display_name, is_visible, faith_category, muslim_sect")

          .eq("user_id", data.user.id)
          .maybeSingle();

        if (!active) return;

        if (discoveryError) {
          setError(discoveryError.message);
          return;
        }

        if (discovery) {
          setDisplayName(discovery.display_name);
          setIsVisible(discovery.is_visible);

          setShareReligion(Boolean(discovery.faith_category));
          setShareSect(Boolean(discovery.muslim_sect));
        }
      } catch {
        if (active) {
          setError("Unable to load discovery settings.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSettings();

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.replace("/login");
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  async function handlePublish() {
    if (saving || !profile) return;

    setError("");
    setMessage("");

    const cleanName = displayName.trim();

    if (cleanName.length < 2 || cleanName.length > 60) {
      setError("Display name must be 2 to 60 characters.");
      return;
    }

    setSaving(true);

    try {
      const { data, error: authError } = await supabase.auth.getUser();

      if (authError || !data.user) {
        throw new Error("Please sign in again.");
      }

      const { data: updated, error: saveError } = await supabase
        .from("rishta_discovery_profiles")
        .upsert(
          {
            user_id: data.user.id,
            display_name: cleanName,
            gender: profile.gender,
            education_level: profile.education_level,
            profession: profile.profession,
            age: null,
            city: null,

            is_visible: true,

            faith_category:
              shareReligion &&
              profile.faith_category &&
              profile.faith_category !== "Prefer not to say"
                ? profile.faith_category
                : null,

            muslim_sect:
              shareReligion &&
              shareSect &&
              profile.faith_category === "Muslim" &&
              profile.muslim_sect &&
              profile.muslim_sect !== "Prefer not to say"
                ? profile.muslim_sect
                : null,

            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        )
        .select("user_id")
        .maybeSingle();

      if (saveError || !updated) {
        throw new Error(
          saveError?.message || "Unable to publish your profile.",
        );
      }

      setIsVisible(true);
      setMessage("Your profile is now visible in discovery!");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to publish profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleHide() {
    if (saving) return;

    setError("");
    setMessage("");
    setSaving(true);

    try {
      const { data, error: authError } = await supabase.auth.getUser();

      if (authError || !data.user) {
        throw new Error("Please sign in again.");
      }

      const { data: updated, error: saveError } = await supabase
        .from("rishta_discovery_profiles")
        .update({
          is_visible: false,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", data.user.id)
        .select("user_id")
        .maybeSingle();

      if (saveError || !updated) {
        throw new Error(saveError?.message || "Unable to hide your profile.");
      }

      setIsVisible(false);
      setMessage("Your profile is hidden from discovery.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to hide profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text>Loading discovery settings...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.wrapper}>
          <Pressable
            style={styles.back}
            onPress={() => router.replace("/my-profile")}
          >
            <Text style={styles.link}>← My Profile</Text>
          </Pressable>

          <View style={styles.header}>
            <Text style={styles.heart}>♥</Text>

            <Text style={styles.title}>Profile Discovery</Text>

            <Text style={styles.subtitle}>
              Choose whether other members can discover your rishta profile.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Discovery Status</Text>

            <Text
              style={[
                styles.status,
                { color: isVisible ? colors.success : colors.textSecondary },
              ]}
            >
              {isVisible ? "● Visible to Members" : "● Hidden from Members"}
            </Text>

            <Text style={styles.label}>Display Name</Text>

            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter your public display name"
              placeholderTextColor={colors.textSecondary}
              maxLength={60}
              autoCapitalize="words"
            />

            {profile?.faith_category &&
            profile.faith_category !== "Prefer not to say" ? (
              <View style={{ marginBottom: 24 }}>
                <Text style={styles.sectionTitle}>
                  Religion & Firqa Privacy
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
                  <Text style={styles.label}>
                    Share Religion ({profile.faith_category})
                  </Text>

                  <Switch
                    value={shareReligion}
                    onValueChange={(value) => {
                      setShareReligion(value);
                      if (!value) setShareSect(false);
                    }}
                  />
                </View>

                {shareReligion &&
                profile.faith_category === "Muslim" &&
                profile.muslim_sect &&
                profile.muslim_sect !== "Prefer not to say" ? (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text style={styles.label}>
                      Share Firqa ({profile.muslim_sect})
                    </Text>

                    <Switch value={shareSect} onValueChange={setShareSect} />
                  </View>
                ) : null}

                <Text style={styles.note}>
                  Both settings are OFF by default. You control what other
                  members can see.
                </Text>
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>Public Profile Preview</Text>

            <View style={styles.preview}>
              <Text style={styles.previewName}>
                {displayName.trim() || "Your Name"}
              </Text>

              <Text style={styles.previewText}>
                Gender: {profile?.gender || "Not provided"}
              </Text>

              <Text style={styles.previewText}>
                Education: {profile?.education_level || "Not provided"}
              </Text>

              <Text style={styles.previewText}>
                Profession: {profile?.profession || "Not provided"}
              </Text>

              {shareReligion && profile?.faith_category ? (
                <Text style={styles.previewText}>
                  Religion: {profile.faith_category}
                </Text>
              ) : null}

              {shareReligion &&
              shareSect &&
              profile?.faith_category === "Muslim" &&
              profile.muslim_sect ? (
                <Text style={styles.previewText}>
                  Firqa: {profile.muslim_sect}
                </Text>
              ) : null}
            </View>

            <Text style={styles.note}>
              Publishing shares only the details in this preview. Your email,
              exact date of birth, city, family information, partner preferences
              and private photos will not be published.
            </Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {message ? <Text style={styles.success}>{message}</Text> : null}

            <View style={styles.buttonArea}>
              <AppButton
                title={isVisible ? "Update Public Profile" : "Show My Profile"}
                onPress={handlePublish}
                loading={saving}
                disabled={saving || !profile}
              />
            </View>

            {isVisible ? (
              <View style={styles.buttonArea}>
                <AppButton
                  title="Hide My Profile"
                  onPress={handleHide}
                  disabled={saving}
                />
              </View>
            ) : null}
          </View>

          <Text style={styles.footer}>
            You control when your profile is visible.
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
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  content: {
    flexGrow: 1,
    padding: spacing.xl,
    alignItems: "center",
  },
  wrapper: {
    width: "100%",
    maxWidth: 520,
  },
  back: {
    paddingVertical: spacing.md,
    marginBottom: spacing.xl,
  },
  link: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xxxl,
  },
  heart: {
    color: colors.primary,
    fontSize: 48,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.heading,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: spacing.md,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  sectionTitle: {
    color: colors.heading,
    fontSize: 19,
    fontWeight: "700",
    marginBottom: spacing.lg,
  },
  status: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: spacing.xl,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    color: colors.text,
    backgroundColor: colors.background,
    fontSize: 16,
    marginBottom: spacing.xl,
  },
  preview: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  previewName: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.heading,
  },
  previewText: {
    fontSize: 14,
    color: colors.text,
  },
  note: {
    fontSize: 12,
    lineHeight: 20,
    color: colors.textSecondary,
    marginTop: spacing.xl,
  },
  buttonArea: {
    marginTop: spacing.xl,
  },
  error: {
    color: colors.error,
    fontSize: 13,
    marginTop: spacing.lg,
  },
  success: {
    color: colors.success,
    fontSize: 14,
    marginTop: spacing.lg,
  },
  footer: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: "center",
    marginVertical: spacing.xxl,
  },
});
