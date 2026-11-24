import { supabase } from "./supabase";

export type CallType = "audio" | "video";

export type RishtaCall = {
  id: string;
  call_type: CallType;
  status: string;
  created_at: string;
};

export type LiveKitConnection = {
  token: string;
  serverUrl: string;
  roomName: string;
  callId: string;
};

// Extract readable errors from Supabase functions.
async function getFunctionError(error: any): Promise<string> {
  if (error.context instanceof Response) {
    try {
      const result = await error.context.json();

      if (typeof result.error === "string") {
        return result.error;
      }
    } catch {
      // Return the original message.
    }
  }

  return error.message || "Request failed.";
}

// Start a new audio or video call.
export async function startRishtaCall(
  invitationId: string,
  callType: CallType,
): Promise<RishtaCall> {
  const { data, error } = await supabase.functions.invoke("start-rishta-call", {
    body: {
      invitationId,
      callType,
    },
  });

  if (error) {
    throw new Error(await getFunctionError(error));
  }

  if (!data?.call?.id) {
    throw new Error("Unable to create call.");
  }

  return data.call as RishtaCall;
}

// Get LiveKit token only after call is accepted.
export async function getLiveKitConnection(
  callId: string,
): Promise<LiveKitConnection> {
  const { data, error } = await supabase.functions.invoke("livekit-token", {
    body: { callId },
  });

  if (error) {
    throw new Error(await getFunctionError(error));
  }

  if (
    typeof data?.token !== "string" ||
    typeof data?.serverUrl !== "string" ||
    typeof data?.roomName !== "string" ||
    typeof data?.callId !== "string"
  ) {
    throw new Error("Invalid LiveKit response.");
  }

  return {
    token: data.token,
    serverUrl: data.serverUrl,
    roomName: data.roomName,
    callId: data.callId,
  };
}
