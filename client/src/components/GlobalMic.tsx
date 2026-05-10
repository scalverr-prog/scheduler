import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";

export const VOICE_COMMAND_EVENT = "voiceCommand";

export interface VoiceCommandDetail {
  type: "fillField" | "action" | "bulkFill";
  field?: string;
  value?: string;
  action?: string;
  data?: Record<string, string>;
}

export function dispatchVoiceCommand(detail: VoiceCommandDetail) {
  console.log("Dispatching voice command:", detail);
  window.dispatchEvent(new CustomEvent(VOICE_COMMAND_EVENT, { detail }));
}

// Store pending data to fill after form opens (uses localStorage to survive page reload)
const PENDING_DATA_KEY = "voicePendingFormData";

export function getPendingFormData(): Record<string, string> | null {
  try {
    const stored = localStorage.getItem(PENDING_DATA_KEY);
    if (stored) {
      localStorage.removeItem(PENDING_DATA_KEY);
      console.log("Retrieved pending voice data:", stored);
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Error reading pending form data:", e);
  }
  return null;
}

function setPendingFormData(data: Record<string, string>) {
  try {
    console.log("Storing pending voice data:", data);
    localStorage.setItem(PENDING_DATA_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Error storing pending form data:", e);
  }
}

export default function GlobalMic() {
  const [isListening, setIsListening] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [filled, setFilled] = useState<string[]>([]);
  const [error, setError] = useState("");
  const recognitionRef = useRef<any>(null);
  const fullTranscriptRef = useRef("");

  // Call Claude API to parse transcript
  const parseWithClaude = async (text: string): Promise<Record<string, string>> => {
    try {
      setIsParsing(true);
      setFilled(["Parsing with AI..."]);

      const response = await fetch("/api/scribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.fields) {
        console.log("Claude parsed fields:", data.fields);
        return data.fields;
      } else {
        console.error("Parse failed:", data);
        return {};
      }
    } catch (e) {
      console.error("Error calling scribe API:", e);
      setError("Failed to parse");
      return {};
    } finally {
      setIsParsing(false);
    }
  };

  // Process final transcript with Claude
  const processTranscript = async (text: string) => {
    console.log("=== PROCESSING TRANSCRIPT ===");
    console.log("Text:", text);

    // Call Claude to parse
    const fields = await parseWithClaude(text);

    if (Object.keys(fields).length === 0) {
      setFilled(["No data extracted"]);
      return;
    }

    // Build display list
    const display: string[] = [];
    if (fields.firstName) display.push(`Patient: ${fields.firstName} ${fields.lastName || ""}`);
    if (fields.mrn) display.push(`MRN: ${fields.mrn}`);
    if (fields.procedures && Array.isArray(fields.procedures)) {
      display.push(`Procedures: ${fields.procedures.join(", ")}`);
    } else if (fields.title) {
      display.push(`Procedure: ${fields.title}`);
    }
    if (fields.date) display.push(`Date: ${fields.date}`);
    if (fields.startTime) display.push(`Time: ${fields.startTime}`);
    if (fields.service) display.push(`Service: ${fields.service}`);
    if (fields.sedationist) display.push(`Sedationist: ${fields.sedationist}`);
    if (fields.pmd) display.push(`Doctor: ${fields.pmd}`);
    if (fields.notes) display.push(`Notes: ${fields.notes}`);

    setFilled(display);

    // Check if the NEW ENCOUNTER modal is open (look for specific modal content)
    const modalOpen = document.querySelector('[data-voice-form="encounter"]') !== null;
    console.log("Modal open?", modalOpen);

    if (!modalOpen) {
      // Store data and open form
      console.log("Opening form with data:", fields);
      setPendingFormData(fields);
      // Use replace to avoid back button issues
      window.location.replace("/calendar?newActivity=true");
    } else {
      // Form is open, send data to Calendar
      console.log("Form open, dispatching bulkFill:", fields);
      dispatchVoiceCommand({ type: "bulkFill", data: fields });
    }

    // Handle save/cancel commands
    const lower = text.toLowerCase();
    if (lower.includes("save") || lower.includes("submit") || lower.includes("book it")) {
      dispatchVoiceCommand({ type: "action", action: "save" });
    }
    if (lower.includes("cancel") || lower.includes("close")) {
      dispatchVoiceCommand({ type: "action", action: "cancel" });
    }
  };

  const startListening = async () => {
    setError("");

    // Request microphone permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
    } catch {
      setError("Microphone denied");
      return;
    }

    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) {
      setError("Use Chrome browser");
      return;
    }

    setIsListening(true);
    setTranscript("Listening...");
    setFilled([]);
    fullTranscriptRef.current = "";

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (e: any) => {
      let interimText = "";
      let finalText = "";

      for (let i = 0; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript + " ";
        } else {
          interimText += result[0].transcript;
        }
      }

      // Update display with current transcript
      const currentText = (finalText + interimText).trim();
      setTranscript(currentText || "Listening...");

      // Store final text for processing when stopped
      if (finalText) {
        fullTranscriptRef.current = finalText.trim();
      }
    };

    recognition.onerror = (e: any) => {
      console.error("Speech recognition error:", e.error);
      if (e.error === "not-allowed") {
        setError("Mic blocked");
        setIsListening(false);
      } else if (e.error !== "aborted" && recognitionRef.current) {
        // Try to restart on other errors
        setTimeout(() => {
          try { recognition.start(); } catch {}
        }, 500);
      }
    };

    recognition.onend = () => {
      // Don't restart - we'll process when user clicks stop
      if (recognitionRef.current) {
        setTimeout(() => {
          try { recognition.start(); } catch {}
        }, 100);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setIsListening(false);
      setError("Failed to start");
    }
  };

  const stopListening = async () => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);

    // Process the full transcript with Claude
    const text = fullTranscriptRef.current;
    if (text.length > 3) {
      await processTranscript(text);
    } else {
      setTranscript("");
      setFilled([]);
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={() => isListening ? stopListening() : startListening()}
        disabled={isParsing}
        style={{
          backgroundColor: isParsing ? '#6b7280' : isListening ? '#ef4444' : '#2563eb',
          opacity: isParsing ? 0.7 : 1
        }}
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg text-white"
      >
        {isParsing ? (
          <Loader2 size={28} className="animate-spin" />
        ) : isListening ? (
          <MicOff size={28} />
        ) : (
          <Mic size={28} />
        )}
      </button>

      {(isListening || isParsing || transcript || error) && (
        <div className="bg-black/90 text-white text-sm px-4 py-3 rounded-lg max-w-[320px] shadow-lg">
          {error ? (
            <div className="text-red-400">{error}</div>
          ) : (
            <>
              <div className="font-medium mb-2">
                {isParsing ? "Processing..." : transcript}
              </div>
              {filled.length > 0 && (
                <div className="text-green-400 text-xs space-y-1 border-t border-white/20 pt-2">
                  {filled.map((f, i) => <div key={i}>{f}</div>)}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
