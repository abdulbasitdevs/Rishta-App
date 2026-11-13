import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  function handleLogin() {
    if (!email.trim() || !password) {
      setMessage("Please fill in all fields.");
      return;
    }

    setMessage("Login backend will be connected next.");
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <Text style={styles.logo}>♥ Rishta App</Text>

        <Text style={styles.heading}>Welcome Back!</Text>

        <Text style={styles.description}>
          Sign in to continue your journey towards finding your life partner.
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>Email Address</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Password</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Pressable style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginText}>Login</Text>
          </Pressable>

          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>

        <Text style={styles.footer}>New to Rishta App? Create an account</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF8F9",
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    maxWidth: 460,
    width: "100%",
    alignSelf: "center",
  },
  backButton: {
    marginBottom: 35,
  },
  backText: {
    color: "#BE185D",
    fontSize: 16,
  },
  logo: {
    color: "#BE185D",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 40,
  },
  heading: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#831843",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: "#6B7280",
    lineHeight: 24,
    marginBottom: 35,
  },
  form: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: "#BE185D",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  loginText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  message: {
    color: "#BE185D",
    textAlign: "center",
    marginTop: 12,
  },
  footer: {
    marginTop: 35,
    textAlign: "center",
    color: "#6B7280",
  },
});
