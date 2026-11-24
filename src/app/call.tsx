import { getLiveKitConnection } from "@/lib/livekit";
import { supabase } from "@/lib/supabase";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Track, type Room } from "livekit-client";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function CallScreen() {
  const router = useRouter();

  const { callId, callType } = useLocalSearchParams<{
    callId: string;
    callType: "audio" | "video";
  }>();

  const roomRef = useRef<Room | null>(null);
  const connectingRef = useRef(false);

  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [connectionLost, setConnectionLost] = useState(false);
  const [otherMemberLeft, setOtherMemberLeft] = useState(false);
  const [microphoneOn, setMicrophoneOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [error, setError] = useState("");
  const [participantCount, setParticipantCount] = useState(0);
  const [callSeconds, setCallSeconds] = useState(0);
  const [callStatus, setCallStatus] = useState<
    "loading" | "ringing" | "accepted" | "rejected" | "missed" | "ended"
  >("loading");

  const isVideo = callType === "video";

  useEffect(() => {
    if (!connected || participantCount === 0) {
      return;
    }

    const timer = setInterval(() => {
      setCallSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [connected, participantCount > 0]);

  const formattedCallTime = `${String(Math.floor(callSeconds / 60)).padStart(
    2,
    "0",
  )}:${String(callSeconds % 60).padStart(2, "0")}`;

  useEffect(() => {
    if (!callId || typeof callId !== "string") return;

    let active = true;

    const checkCallStatus = async () => {
      const { data, error: statusError } = await supabase
        .from("rishta_calls")
        .select("status")
        .eq("id", callId)
        .maybeSingle();

      if (!active) return;

      if (statusError || !data) {
        setError("Unable to verify call status.");
        return;
      }

      const status = data.status as
        | "ringing"
        | "accepted"
        | "rejected"
        | "missed"
        | "ended";

      setCallStatus(status);

      if (status === "rejected" || status === "missed" || status === "ended") {
        const room = roomRef.current;
        roomRef.current = null;

        if (room) {
          void room.disconnect();
        }

        setConnected(false);
        setMicrophoneOn(false);

        if (active) {
          router.back();
        }
      }
    };

    void checkCallStatus();

    const interval = setInterval(() => {
      void checkCallStatus();
    }, 2000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [callId, router]);

  useEffect(() => {
    return () => {
      const room = roomRef.current;
      roomRef.current = null;

      if (room) {
        void room.disconnect();
      }
    };
  }, []);

  async function connectCall() {
    if (connectingRef.current || roomRef.current) return;
    if (callStatus !== "accepted") {
      setError("Call must be accepted first.");
      return;
    }
    if (Platform.OS !== "web") {
      setError("Mobile calling requires the native LiveKit setup.");
      return;
    }

    if (!callId || typeof callId !== "string") {
      setError("Missing call ID.");
      return;
    }

    connectingRef.current = true;
    setConnecting(true);
    setError("");

    let newRoom: Room | null = null;

    try {
      const connection = await getLiveKitConnection(callId);

      // Load browser LiveKit SDK only when connecting.
      const {
        Room: LiveKitRoom,
        RoomEvent,
        Track,
      } = await import("livekit-client");

      newRoom = new LiveKitRoom({
        adaptiveStream: true,
        dynacast: true,
      });

      const room = newRoom;
      roomRef.current = room;

      room.on(RoomEvent.ParticipantConnected, () => {
        setParticipantCount(room.remoteParticipants.size);
        setOtherMemberLeft(false);
      });

      room.on(RoomEvent.ParticipantDisconnected, () => {
        setParticipantCount(room.remoteParticipants.size);
        if (room.remoteParticipants.size === 0) {
          setOtherMemberLeft(true);
        }
      });

      // Temporary network interruptions: LiveKit attempts recovery itself.
      room.on(RoomEvent.Reconnecting, () => {
        if (roomRef.current !== room) return;
        setReconnecting(true);
        setConnectionLost(false);
      });

      room.on(RoomEvent.Reconnected, () => {
        if (roomRef.current !== room) return;
        setReconnecting(false);
        setConnectionLost(false);
        setConnected(true);
        setParticipantCount(room.remoteParticipants.size);
      });

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (
          track.kind === Track.Kind.Audio &&
          typeof document !== "undefined"
        ) {
          const element = track.attach();
          document.body.appendChild(element);
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((element) => {
          element.remove();
        });
      });

      room.on(RoomEvent.Disconnected, () => {
        // Ignore expected disconnects from Leave Call / remote call ending.
        if (roomRef.current !== room) return;
        roomRef.current = null;
        setReconnecting(false);
        setConnectionLost(true);
        setConnected(false);
        setMicrophoneOn(false);
        setCameraOn(false);
        setParticipantCount(0);
      });

      await room.connect(connection.serverUrl, connection.token);

      setConnected(true);
      setReconnecting(false);
      setConnectionLost(false);
      setOtherMemberLeft(false);
      setParticipantCount(room.remoteParticipants.size);

      await room.localParticipant.setMicrophoneEnabled(true);
      setMicrophoneOn(true);

      // Enable camera automatically for video calls only.

      if (callType === "video") {
        const cameraPublication =
          await room.localParticipant.setCameraEnabled(true);

        if (cameraPublication?.videoTrack) {
          setCameraOn(true);

          if (Platform.OS === "web" && typeof document !== "undefined") {
            const container = document.getElementById("local-video-container");

            if (container) {
              const videoElement = cameraPublication.videoTrack.attach();

              videoElement.autoplay = true;
              videoElement.muted = true;
              videoElement.setAttribute("playsinline", "true");

              videoElement.style.width = "100%";
              videoElement.style.height = "100%";
              videoElement.style.objectFit = "cover";

              // Remove the placeholder text.
              container.replaceChildren(videoElement);
            }
          }
        } else {
          setCameraOn(false);
          setError("Camera could not be started.");
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to connect to call.");

      if (newRoom) {
        await newRoom.disconnect();
      }

      roomRef.current = null;
      setConnected(false);
      setMicrophoneOn(false);
    } finally {
      connectingRef.current = false;
      setConnecting(false);
    }
  }

  useEffect(() => {
    if (callStatus !== "accepted") return;

    // Automatically connect when the call is accepted.
    if (connectingRef.current || roomRef.current) return;

    void connectCall();
  }, [callStatus, callId]);

  async function toggleCamera() {
    const room = roomRef.current;

    if (!room || !connected || !isVideo) return;

    try {
      setError("");

      const nextCameraState = !room.localParticipant.isCameraEnabled;

      await room.localParticipant.setCameraEnabled(nextCameraState);

      setCameraOn(nextCameraState);

      if (typeof document !== "undefined") {
        const container = document.getElementById("local-video-container");

        if (container) {
          if (!nextCameraState) {
            container.replaceChildren();
          } else {
            const publication = room.localParticipant.getTrackPublication(
              Track.Source.Camera,
            );

            const videoTrack = publication?.videoTrack;

            if (videoTrack) {
              const videoElement = videoTrack.attach();

              videoElement.autoplay = true;
              videoElement.muted = true;
              videoElement.setAttribute("playsinline", "true");

              videoElement.style.width = "100%";
              videoElement.style.height = "100%";
              videoElement.style.objectFit = "cover";

              container.replaceChildren(videoElement);
            }
          }
        }
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to change camera state.",
      );
    }
  }

  async function toggleMicrophone() {
    const room = roomRef.current;
    if (!room) return;

    try {
      const next = !microphoneOn;

      await room.localParticipant.setMicrophoneEnabled(next);
      setMicrophoneOn(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Microphone operation failed.");
    }
  }

  async function leaveCall() {
    if (connectingRef.current) return;

    const room = roomRef.current;
    roomRef.current = null;

    // Disconnect microphone and LiveKit room.
    if (room) {
      await room.disconnect();
    }

    setConnected(false);
    setMicrophoneOn(false);

    // Update call status securely in Supabase.
    if (callId && typeof callId === "string") {
      try {
        const { data, error: functionError } = await supabase.functions.invoke(
          "end-rishta-call",
          {
            body: { callId },
          },
        );

        if (functionError) {
          let message = functionError.message;

          if (functionError.context instanceof Response) {
            try {
              const result = await functionError.context.json();

              message =
                typeof result.error === "string"
                  ? result.error
                  : JSON.stringify(result);
            } catch {
              // Keep the original error message.
            }
          }

          throw new Error(message);
        }

        if (data?.call?.status !== "ended") {
          throw new Error("Call could not be ended.");
        }
      } catch (e) {
        setError(
          e instanceof Error
            ? `Unable to end call: ${e.message}`
            : "Unable to end call.",
        );
        return;
      }
    }

    router.back();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>♡ RISHTA APP</Text>

      <Text style={styles.title}>
        {isVideo ? "🎥 Video Call" : "🎙 Audio Call"}
      </Text>

      {isVideo ? (
        <View style={styles.videoContainer}>
          <View style={styles.remoteVideo}>
            <Text style={styles.videoPlaceholder}>
              🎥 Waiting for other member's video...
            </Text>
          </View>

          <View nativeID="local-video-container" style={styles.localVideo}>
            <Text style={styles.localVideoText}>
              {cameraOn ? "Camera is ON" : "Camera is OFF"}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>♡</Text>
        </View>
      )}

      <Text style={styles.status}>
        {connecting
          ? "Connecting securely..."
          : reconnecting
            ? "🔄 Connection interrupted — reconnecting..."
            : connectionLost
              ? "⚠️ Connection lost. Please leave and call again."
              : otherMemberLeft && connected
                ? "⚠️ Other member disconnected. Waiting for them..."
                : connected
                  ? "Connected to LiveKit"
                  : callStatus === "ringing"
                    ? "📞 Calling... Waiting for answer"
                    : callStatus === "accepted"
                      ? "✅ Call accepted — Ready to connect"
                      : callStatus === "rejected"
                        ? "❌ Call rejected"
                        : callStatus === "missed"
                          ? "📵 Missed call"
                          : callStatus === "ended"
                            ? "📵 Call ended"
                            : "Checking call status..."}
      </Text>

      {connected ? (
        <Text style={styles.subtitle}>
          {participantCount > 0
            ? `${participantCount} member connected`
            : "Waiting for the other member..."}
        </Text>
      ) : !reconnecting && !connectionLost ? (
        <Text style={styles.subtitle}>
          Connect after the call has been accepted.
        </Text>
      ) : null}

      {connected && participantCount > 0 && (
        <Text style={styles.timer}>{formattedCallTime}</Text>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {connecting ? <ActivityIndicator size="large" color="#12D894" /> : null}

      {connected && (
        <Pressable
          style={styles.button}
          onPress={() => void toggleMicrophone()}
        >
          <Text style={styles.buttonText}>
            {microphoneOn ? "🎙 Mute Microphone" : "🔇 Unmute Microphone"}
          </Text>
        </Pressable>
      )}

      {isVideo && connected && (
        <Pressable style={styles.button} onPress={() => void toggleCamera()}>
          <Text style={styles.buttonText}>
            {cameraOn ? "📷 Turn Camera Off" : "📷 Turn Camera On"}
          </Text>
        </Pressable>
      )}

      <Pressable style={styles.endButton} onPress={() => void leaveCall()}>
        <Text style={styles.buttonText}>📵 Leave Call</Text>
      </Pressable>

      {isVideo ? (
        <Text style={styles.subtitle}>
          Video camera and remote video display will be added in the next step.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  videoContainer: {
    width: "100%",
    maxWidth: 400,
    height: 180,
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#102E38",
  },

  remoteVideo: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  videoPlaceholder: {
    color: "#A8B8BF",
    textAlign: "center",
    padding: 15,
  },

  localVideo: {
    position: "absolute",
    right: 8,
    bottom: 8,
    width: 90,
    height: 68,
    backgroundColor: "#21454E",
    borderRadius: 8,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },

  localVideoText: {
    color: "#FFFFFF",
    fontSize: 12,
    textAlign: "center",
  },

  timer: {
    color: "#FFFFFF",
    fontSize: 38,
    fontWeight: "800",
    textAlign: "center",
  },

  container: {
    flex: 1,
    backgroundColor: "#05151D",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },

  brand: {
    color: "#E7BD79",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  title: {
    color: "#F8FBF9",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  avatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "#104039",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#12D894",
  },
  avatarText: {
    fontSize: 65,
    color: "#E7BD79",
  },
  status: {
    color: "#12D894",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    color: "#A8B8BF",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  error: {
    color: "#F2A1A4",
    textAlign: "center",
  },
  button: {
    backgroundColor: "#086B54",
    borderColor: "#12D894",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
  },
  endButton: {
    backgroundColor: "#913A43",
    borderRadius: 10,
    padding: 10,
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});
