import { useRouter } from "expo-router";

import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const router = useRouter();
  const [message, setMessage] = useState("");

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>♥</Text>
            <Text style={styles.logoText}>Rishta App</Text>
          </View>

          <View style={styles.heartCircle}>
            <Text style={styles.bigHeart}>♥</Text>
          </View>

          <Text style={styles.heading}>
            Your Journey to{"\n"}
            Forever Starts Here
          </Text>

          <Text style={styles.description}>
            Find your perfect life partner through meaningful connections, built
            on trust and shared values.
          </Text>

          <View style={styles.buttonContainer}>
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.push("/signup")}
            >
              <Text style={styles.primaryText}>Create Account</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.push("/login")}
            >
              <Text style={styles.secondaryText}>
                I Already Have an Account
              </Text>
            </Pressable>

            {message ? <Text style={styles.message}>{message}</Text> : null}
          </View>

          <Text style={styles.footer}>
            Made for meaningful marriages in Pakistan
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF8F9",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  content: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 55,
    gap: 8,
  },
  logoIcon: {
    fontSize: 30,
    color: "#BE185D",
  },
  logoText: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#831843",
  },
  heartCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#FCE7F3",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 45,
  },
  bigHeart: {
    fontSize: 85,
    color: "#BE185D",
  },
  heading: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#831843",
    textAlign: "center",
    lineHeight: 40,
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 45,
  },
  buttonContainer: {
    width: "100%",
    gap: 14,
  },
  primaryButton: {
    backgroundColor: "#BE185D",
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: "#BE185D",
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: "center",
  },
  secondaryText: {
    color: "#BE185D",
    fontSize: 15,
    fontWeight: "600",
  },
  message: {
    color: "#831843",
    textAlign: "center",
    marginTop: 8,
  },
  footer: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 50,
  },
});
