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

export default function SignupScreen() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isAdult, setIsAdult] = useState(false);
  const [message, setMessage] = useState("");

  function handleSignup() {
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setMessage("Please fill in all fields.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setMessage("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    if (!isAdult) {
      setMessage("You must confirm that you are 18 or older.");
      return;
    }

    setMessage("Signup form is ready! Backend will be added next.");
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>

        <Text style={styles.logo}>♥ Rishta App</Text>

        <Text style={styles.heading}>Create Your Account</Text>

        <Text style={styles.description}>
          Start your journey towards a meaningful marriage.
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            value={name}
            onChangeText={setName}
            autoComplete="name"
          />

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
            placeholder="Minimum 8 characters"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Confirm your password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <Pressable
            style={styles.checkboxRow}
            onPress={() => setIsAdult(!isAdult)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isAdult }}
          >
            <View style={[styles.checkbox, isAdult && styles.checkboxChecked]}>
              {isAdult && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxText}>
              I confirm that I am 18 years or older.
            </Text>
          </Pressable>

          <Pressable style={styles.button} onPress={handleSignup}>
            <Text style={styles.buttonText}>Create Account</Text>
          </Pressable>

          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>

        <Pressable onPress={() => router.push("/login")}>
          <Text style={styles.footer}>
            Already have an account? <Text style={styles.link}>Login</Text>
          </Text>
        </Pressable>
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
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
    padding: 24,
    justifyContent: "center",
  },
  back: {
    fontSize: 16,
    color: "#BE185D",
    marginBottom: 24,
  },
  logo: {
    fontSize: 25,
    fontWeight: "bold",
    textAlign: "center",
    color: "#BE185D",
    marginBottom: 35,
  },
  heading: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#831843",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: "#6B7280",
    marginBottom: 30,
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
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderColor: "#BE185D",
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#BE185D",
  },
  checkmark: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  checkboxText: {
    fontSize: 14,
    color: "#374151",
    flex: 1,
  },
  button: {
    backgroundColor: "#BE185D",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 18,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  message: {
    color: "#BE185D",
    textAlign: "center",
    marginTop: 8,
  },
  footer: {
    textAlign: "center",
    color: "#6B7280",
    marginTop: 30,
    fontSize: 14,
  },
  link: {
    color: "#BE185D",
    fontWeight: "bold",
  },
});
