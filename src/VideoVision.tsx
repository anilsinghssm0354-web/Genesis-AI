import React, { useRef, useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

export const VideoVision = ({ onClose, apiKey }: { onClose: () => void, apiKey: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'speaking'>('idle');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const initCamera = () => {
    setError(null);
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(err => {
        console.error("Camera access denied:", err);
        setError("Camera access denied. Please enable it in your browser settings.");
      });
  };

  useEffect(() => {
    initCamera();
    
    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, [facingMode]);

  // CRITICAL LOGIC: Keyword Detection & Auto-Capture
  useEffect(() => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      if (status !== 'speaking') {
        recognition.start();
      }
    };

    recognition.onresult = (event: any) => {
      // Pause listening while speaking
      if (status === 'speaking') return;

      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
      const keywords = ["ye kya hai", "batao", "what is this", "look at this", "genesis", "answer", "tell me", "explain"];
      
      if (keywords.some(keyword => transcript.includes(keyword))) {
        analyzeView(transcript);
      }
    };

    if (status !== 'speaking') {
      recognition.start();
    }
    
    return () => recognition.stop();
  }, [status]);

  const analyzeView = async (manualPrompt?: string) => {
    setStatus('analyzing');
    console.log("Analyzing view...");
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) {
        console.error("Canvas or video not found");
        return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const base64Image = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
    console.log("Image captured, size:", base64Image.length);

    const ai = new GoogleGenAI({ apiKey });
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: base64Image } },
            { text: `${manualPrompt || "Explain this view concisely in 1-2 sentences."} Answer in Hindi.` }
          ]
        }
      });

      console.log("AI response received:", response.text);
      const text = response.text || "I see something interesting.";
      setStatus('speaking');
      
      // Mute mic while speaking
      streamRef.current?.getAudioTracks().forEach(track => track.enabled = false);
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'hi-IN';
      utterance.rate = 1.0; // Reduced rate for better clarity
      utterance.onend = () => {
        setStatus('idle');
        // Unmute mic when done
        streamRef.current?.getAudioTracks().forEach(track => track.enabled = true);
      };
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("AI analysis error:", e);
      setStatus('idle');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black">
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center z-[210] bg-black/80">
          <p className="mb-4">{error}</p>
          <div className="flex gap-4">
            <button onClick={onClose} className="px-6 py-2 bg-gray-600 rounded-full">Close</button>
            <button onClick={initCamera} className="px-6 py-2 bg-blue-500 rounded-full">Retry</button>
          </div>
        </div>
      ) : (
        <>
          <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          
          <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center">
            <div className="flex items-center gap-3">
              {/* Placeholder for Genesis Logo */}
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-bold text-black">G</div>
              <div className="text-white font-bold text-xl animate-pulse">Genesis AI</div>
            </div>
            <button onClick={onClose} className="text-white bg-red-500 p-3 rounded-full"><X /></button>
          </div>

          {/* UI Controls at the bottom */}
          <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-4">
            {/* Wave Animation / Status Indicator */}
            <div className={`w-20 h-20 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md 
              ${isListening ? 'animate-pulse' : ''} 
              ${status === 'speaking' ? 'animate-bounce' : ''}`}>
              <div className={`text-4xl text-white ${isListening || status === 'speaking' ? 'animate-wave' : ''}`}>✦</div>
              {isListening && <div className="absolute inset-0 rounded-full border-4 border-blue-400 animate-ping"></div>}
              {status === 'speaking' && <div className="absolute inset-0 rounded-full border-4 border-green-400 animate-ping"></div>}
            </div>

            {/* Controls */}
            <div className="flex gap-4">
                <button onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')} className="px-6 py-2 bg-gray-700 text-white rounded-full font-semibold shadow-lg">Switch Camera</button>
                <button onClick={() => analyzeView()} className="px-6 py-2 bg-blue-600 text-white rounded-full font-semibold shadow-lg">Ask Genesis</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
