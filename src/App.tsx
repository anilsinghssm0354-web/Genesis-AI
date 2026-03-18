/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Mic, 
  Image as ImageIcon, 
  Plus, 
  User, 
  Loader2,
  Menu,
  Settings,
  History,
  Sparkles,
  Sun,
  Moon,
  MessageSquare,
  Trash2,
  Share2,
  ChevronRight,
  X,
  Zap,
  Download,
  Paperclip,
  Volume2,
  VolumeX,
  RefreshCw,
  Cpu,
  FileDown,
  Info,
  Activity,
  LogOut,
  Shield,
  CheckCircle,
  Search,
  Check,
  Copy,
  Globe,
  ArrowUpRight,
  Command,
  Monitor,
  Smartphone,
  ShieldCheck,
  Star,
  Trophy,
  Maximize2,
  Users,
  MessageCircle,
  Camera
} from 'lucide-react';
import { VideoVision } from './VideoVision';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { GoogleGenAI } from "@google/genai";
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';

// ==========================================================================
// GENESIS AI CONFIGURATION
// ==========================================================================
// Your Gemini API Key
const GEMINI_API_KEY = "AIzaSyBj8KbCbxfDYkq8k12D-6l7KXLK6fnY67k";
// ==========================================================================

// Types
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  type?: 'text' | 'image' | 'vision';
  imageUrl?: string;
  userImage?: string;
  userId?: string;
  userName?: string;
  userAvatar?: string;
  reactions?: { [key: string]: string[] };
  sources?: { title: string; url: string }[];
}

interface SelectedImage {
  base64: string;
  preview: string;
  type: string;
}

interface UserProfile {
  name: string;
  avatar: string;
  joinedAt: string;
}

const AVATARS = [
  { id: 'cyborg', emoji: '🤖', color: 'bg-blue-500' },
  { id: 'ninja', emoji: '🥷', color: 'bg-red-500' },
  { id: 'hacker', emoji: '👨‍💻', color: 'bg-[#00FF66]' },
  { id: 'pilot', emoji: '👨‍🚀', color: 'bg-purple-500' }
];

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  timestamp: Date;
}

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [mode, setMode] = useState<'chat' | 'generate'>('chat');
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [speakingRate, setSpeakingRate] = useState(1.35);
  const [isAutoVoiceEnabled, setIsAutoVoiceEnabled] = useState(true);
  const [isAutoListenEnabled, setIsAutoListenEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isGlowEnabled, setIsGlowEnabled] = useState(true);
  const [voiceAccent, setVoiceAccent] = useState<'global' | 'indian'>('indian');
  const [isTurboMode, setIsTurboMode] = useState(false);
  const [isVisionMode, setIsVisionMode] = useState(false);
  const [isGroundingEnabled, setIsGroundingEnabled] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showUpdateLog, setShowUpdateLog] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedViewImage, setSelectedViewImage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Code Preview (Sandbox) State
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Public Chat State
  const [isPublicChatOpen, setIsPublicChatOpen] = useState(false);
  const [publicMessages, setPublicMessages] = useState<Message[]>([]);
  const [socket, setSocket] = useState<any>(null);
  const [activeUserCount, setActiveUserCount] = useState(0);
  const [publicChatInput, setPublicChatInput] = useState('');
  const [typingUsers, setTypingUsers] = useState<{ [key: string]: string }>({});
  const publicMessagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll public chat
  useEffect(() => {
    publicMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [publicMessages]);

  // Public Chat Socket Connection
  useEffect(() => {
    if (isPublicChatOpen && !socket && userProfile) {
      const newSocket = io();
      setSocket(newSocket);

      newSocket.emit('join_public_chat', userProfile);

      newSocket.on('previous_messages', (msgs) => {
        setPublicMessages(msgs.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
      });

      newSocket.on('new_public_message', (msg) => {
        setPublicMessages(prev => [...prev, { ...msg, timestamp: new Date(msg.timestamp) }]);
      });

      newSocket.on('system_message', (msg) => {
        setPublicMessages(prev => [...prev, { ...msg, timestamp: new Date(msg.timestamp) }]);
      });

      newSocket.on('user_count_update', (count) => {
        setActiveUserCount(count);
      });

      newSocket.on('user_typing', ({ userId, userName, isTyping }: any) => {
        setTypingUsers(prev => {
          const newTyping = { ...prev };
          if (isTyping) {
            newTyping[userId] = userName;
          } else {
            delete newTyping[userId];
          }
          return newTyping;
        });
      });

      newSocket.on('reaction_updated', ({ messageId, reactions }: any) => {
        setPublicMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m));
      });

      return () => {
        newSocket.disconnect();
        setSocket(null);
      };
    }
  }, [isPublicChatOpen, userProfile]);

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPublicChatInput(e.target.value);
    
    if (socket) {
      socket.emit('typing_status', true);
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing_status', false);
      }, 2000);
    }
  };

  const addReaction = (messageId: string, reaction: string) => {
    if (socket) {
      socket.emit('add_reaction', { messageId, reaction });
    }
  };

  const sendPublicMessage = () => {
    if (!publicChatInput.trim() || !socket || !userProfile) return;

    const messageData = {
      role: 'user',
      content: publicChatInput,
      userName: userProfile.name,
      userAvatar: AVATARS.find(a => a.id === userProfile.avatar)?.emoji || '👤',
      userId: socket.id,
    };

    socket.emit('send_public_message', messageData);
    socket.emit('typing_status', false);
    setPublicChatInput('');
  };

  const extractAndPreviewCode = (content: string) => {
    const match = content.match(/```html([\s\S]*?)```/);
    if (match && match[1]) {
      setPreviewCode(match[1]);
      setIsPreviewOpen(true);
    } else {
      showToast("No HTML code block found to preview");
    }
  };

  // Check for existing profile and sessions on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem('genesis_user_profile');
    if (savedProfile) {
      const profile = JSON.parse(savedProfile);
      setUserProfile(profile);
      setShowOnboarding(false);
      showToast(`Welcome back, ${profile.name}`);
    }

    const savedSessions = localStorage.getItem('genesis_chat_sessions');
    if (savedSessions) {
      const parsedSessions = JSON.parse(savedSessions).map((s: any) => ({
        ...s,
        timestamp: new Date(s.timestamp),
        messages: s.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
      }));
      setSessions(parsedSessions);
      if (parsedSessions.length > 0) {
        setCurrentSessionId(parsedSessions[0].id);
        setMessages(parsedSessions[0].messages);
      } else {
        createNewChat();
      }
    } else {
      createNewChat();
    }
  }, []);

  // Save sessions whenever messages or sessions change
  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      setSessions(prev => {
        const existingIndex = prev.findIndex(s => s.id === currentSessionId);
        const updatedSessions = [...prev];
        
        if (existingIndex >= 0) {
          updatedSessions[existingIndex] = {
            ...updatedSessions[existingIndex],
            messages,
            timestamp: new Date(),
            title: updatedSessions[existingIndex].title === 'New Chat' && messages.length > 0 
              ? messages[0].content.slice(0, 30) + (messages[0].content.length > 30 ? '...' : '')
              : updatedSessions[existingIndex].title
          };
        }
        
        localStorage.setItem('genesis_chat_sessions', JSON.stringify(updatedSessions));
        return updatedSessions;
      });
    }
  }, [messages, currentSessionId]);

  const createNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      timestamp: new Date()
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setMessages([]);
    setIsSidebarOpen(false);
  };

  const switchSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(session.id);
      setMessages(session.messages);
      setIsSidebarOpen(false);
    }
  };

  const deleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    const updatedSessions = sessions.filter(s => s.id !== sessionId);
    setSessions(updatedSessions);
    localStorage.setItem('genesis_chat_sessions', JSON.stringify(updatedSessions));
    
    if (currentSessionId === sessionId) {
      if (updatedSessions.length > 0) {
        setCurrentSessionId(updatedSessions[0].id);
        setMessages(updatedSessions[0].messages);
      } else {
        createNewChat();
      }
    }
  };

  const showToast = (message: string, isCelebratory = false) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  };

  const handleOnboardingComplete = (profile: UserProfile) => {
    localStorage.setItem('genesis_user_profile', JSON.stringify(profile));
    setUserProfile(profile);
    setShowOnboarding(false);
    showToast(`System Initialized. Congratulations 🎊 Welcome, ${profile.name}`, true);
  };

  const handleLogout = () => {
    localStorage.removeItem('genesis_user_profile');
    window.location.reload();
  };

  const LogoIcon = ({ isSpeaking, isListening, size = "md" }: { isSpeaking: boolean, isListening?: boolean, size?: "sm" | "md" | "lg" }) => {
    const dimensions = size === "sm" ? "w-8 h-8" : size === "lg" ? "w-12 h-12" : "w-10 h-10";
    const barWidth = size === "sm" ? "w-[2px]" : "w-[3px]";
    const gap = size === "sm" ? "gap-[2px]" : "gap-[3px]";
    
    return (
      <div className={`relative ${dimensions} flex items-center justify-center flex-shrink-0`}>
        {isGlowEnabled && (
          <div className="absolute inset-0 bg-[#00FF66] rounded-full shadow-[0_0_15px_rgba(0,255,102,0.2)]" />
        )}
        {!isGlowEnabled && (
          <div className={`absolute inset-0 rounded-full border ${theme === 'dark' ? 'border-white/20' : 'border-gray-300'}`} />
        )}
        <div className={`relative flex items-center justify-center ${gap} h-1/2 w-3/5`}>
          {[0.4, 0.7, 1.0, 0.7, 0.4].map((h, i) => (
            <div
              key={i}
              style={{ 
                height: `${h * 100}%`,
                animationDelay: `${i * 0.1}s`
              }}
              className={`${barWidth} bg-white rounded-full ${isSpeaking ? 'voice-bar' : isListening ? 'listening-bar' : 'transition-all duration-300'}`}
            />
          ))}
        </div>
      </div>
    );
  };

  const GenesisLogo = ({ isSpeaking, isListening }: { isSpeaking: boolean, isListening?: boolean }) => (
    <div className="flex items-center gap-3">
      <LogoIcon isSpeaking={isSpeaking} isListening={isListening} size="md" />
      <div className="flex flex-col -space-y-1">
        <span className={`text-sm md:text-base font-display font-bold tracking-[0.1em] transition-colors ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>GENESIS</span>
        <div className="flex items-center gap-1.5 w-full">
          <div className={`h-[1px] flex-1 transition-colors ${
            theme === 'dark' ? 'bg-white/30' : 'bg-gray-300'
          }`} />
          <span className={`text-[9px] md:text-[10px] font-display font-medium tracking-[0.1em] transition-colors ${
            theme === 'dark' ? 'text-white/70' : 'text-gray-600'
          }`}>AI</span>
          <div className={`h-[1px] flex-1 transition-colors ${
            theme === 'dark' ? 'bg-white/30' : 'bg-gray-300'
          }`} />
        </div>
      </div>
    </div>
  );

  const Onboarding = () => {
    const [name, setName] = useState('');
    const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].id);
    const [isInitializing, setIsInitializing] = useState(false);
    const [isGoogleConnecting, setIsGoogleConnecting] = useState(false);

    const handleInitialize = () => {
      if (!name.trim()) return;
      setIsInitializing(true);
      setTimeout(() => {
        handleOnboardingComplete({
          name: name.trim(),
          avatar: selectedAvatar,
          joinedAt: new Date().toISOString()
        });
      }, 2000);
    };

    const handleGoogleConnect = () => {
      setIsGoogleConnecting(true);
      setTimeout(() => {
        showToast('Connecting to secure server... Protocol established.');
        setIsGoogleConnecting(false);
      }, 1500);
    };

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0e0e11] overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00FF66]/10 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full animate-pulse" />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative w-full max-w-xl p-8 md:p-12 rounded-[2.5rem] border border-white/10 bg-white/5 backdrop-blur-3xl shadow-2xl mx-4"
        >
          <div className="flex flex-col items-center text-center space-y-8">
            <motion.div
              animate={{ 
                y: [0, -10, 0],
                rotateY: [0, 360]
              }}
              transition={{ 
                y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                rotateY: { duration: 20, repeat: Infinity, ease: "linear" }
              }}
            >
              <LogoIcon isSpeaking={true} size="lg" />
            </motion.div>

            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-white">GENESIS <span className="text-[#00FF66]">AI</span></h1>
              <p className="text-gray-400 text-sm md:text-base">System initialization required. Please identify yourself.</p>
            </div>

            <div className="w-full space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block text-left ml-2">Designation / Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Commander, Neo, Hacker"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00FF66]/50 focus:bg-white/10 transition-all"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block text-left ml-2">Select Avatar</label>
                <div className="grid grid-cols-4 gap-4">
                  {AVATARS.map((avatar) => (
                    <button
                      key={avatar.id}
                      onClick={() => setSelectedAvatar(avatar.id)}
                      className={`relative aspect-square rounded-2xl flex items-center justify-center text-2xl transition-all ${
                        selectedAvatar === avatar.id 
                          ? 'bg-[#00FF66]/20 border-2 border-[#00FF66] scale-110 shadow-[0_0_20px_rgba(0,255,102,0.3)]' 
                          : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {avatar.emoji}
                      {selectedAvatar === avatar.id && (
                        <motion.div 
                          layoutId="avatar-check"
                          className="absolute -top-2 -right-2 w-6 h-6 bg-[#00FF66] rounded-full flex items-center justify-center shadow-lg"
                        >
                          <CheckCircle className="w-4 h-4 text-black" />
                        </motion.div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 space-y-4">
                <button 
                  onClick={handleInitialize}
                  disabled={!name.trim() || isInitializing}
                  className={`w-full py-5 rounded-2xl font-bold tracking-widest uppercase text-sm transition-all flex items-center justify-center gap-3 ${
                    name.trim() 
                      ? 'bg-[#00FF66] text-black hover:bg-[#00cc52] shadow-[0_0_30px_rgba(0,255,102,0.3)]' 
                      : 'bg-white/10 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isInitializing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      INITIALIZING...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      START GENESIS
                    </>
                  )}
                </button>
                
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest text-center">
                  Free and Public Access Enabled
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Gemini AI
  const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Handle auto-expanding textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const systemReset = () => {
    setMessages([]);
    setSelectedImage(null);
    setInput('');
    setIsLoading(false);
    setSpeakingMessageId(null);
    window.speechSynthesis.cancel();
  };

  const exportChat = () => {
    if (messages.length === 0) return;
    const chatText = messages.map(m => `[${m.role.toUpperCase()}] (${m.timestamp.toLocaleString()}):\n${m.content}\n`).join('\n---\n\n');
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `genesis-chat-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file (JPG/PNG).');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      setSelectedImage({
        base64: base64String,
        preview: reader.result as string,
        type: file.type
      });
      // Switch to chat mode if in generate mode, as vision is a chat feature
      if (mode === 'generate') setMode('chat');
    };
    reader.readAsDataURL(file);
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      // Automatically send after a short delay to let user see the text
      setTimeout(() => {
        handleSend(transcript);
      }, 500);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        showToast('Microphone access denied. Please enable it in your browser settings.');
      } else {
        showToast(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleSend = async (overrideInput?: string) => {
    const currentInputText = overrideInput || input;
    if ((!currentInputText.trim() && !selectedImage) || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: currentInputText.trim() || (selectedImage ? "Analyze this image" : ""),
      timestamp: new Date(),
      type: selectedImage ? 'vision' : 'text',
      userImage: selectedImage?.preview
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = currentInputText.trim();
    const currentImage = selectedImage;
    
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      if (mode === 'generate' && !currentImage) {
        // Image Generation (Nano Banana)
        const response = await genAI.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [{ text: currentInput }],
          },
        });

        let imageUrl = '';
        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            imageUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Here is the image I generated for: "${currentInput}"`,
          timestamp: new Date(),
          type: 'image',
          imageUrl: imageUrl || undefined
        };
        setMessages(prev => [...prev, assistantMessage]);
        if (isAutoVoiceEnabled) {
          speakText(assistantMessage.content, assistantMessage.id);
        }
      } else {
        // Text Chat or Vision Analysis
        const parts: any[] = [];
        
        if (currentImage) {
          parts.push({
            inlineData: {
              data: currentImage.base64,
              mimeType: currentImage.type
            }
          });
        }
        
        parts.push({ text: currentInput || "What is in this image?" });
        
        const tools: any[] = [];
        if (isGroundingEnabled) {
          tools.push({ googleSearch: {} });
        }

        // Construct history
        const history = messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));

        const result = await genAI.models.generateContent({
          model: isTurboMode ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview",
          contents: [...history, { role: 'user', parts }],
          config: {
            systemInstruction: `You are Genesis AI, a highly advanced and versatile assistant. The user's name is ${userProfile?.name || 'User'}. You operate in two primary modes based on the user's intent:

1. CONVERSATIONAL MODE: If the user is just chatting, asking questions, or making casual remarks, respond naturally, helpfully, and concisely. Do NOT generate code or web tools unless specifically asked.

2. BUILD MODE (Instant Web Publisher): If the user asks to build a website, a tool, a UI, or any web-related project, act as an "Instant Web Publisher AI".
   
   CRITICAL RULES FOR BUILD MODE:
   - SINGLE-FILE ARCHITECTURE: Every project must be in one HTML file. Use <style> for CSS and <script> for JavaScript inside the same file.
   - MODERN STYLING: Use Tailwind CSS via CDN (<script src="https://cdn.tailwindcss.com"></script>) by default.
   - ICONS: Use Font-Awesome (via cdnjs).
   - NO PLACEHOLDERS: Write complete, fully functional code.
   - BUILT-IN PUBLISH BUTTON: Inside the generated UI, you MUST always include a 'Publish Website' button. This button should:
      - Use navigator.clipboard.writeText to copy the entire source code of the page (document.documentElement.outerHTML).
      - Alert the user: "Code Copied! Now drop this file on Netlify Drop for a live link."
      - Provide a direct link to: https://app.netlify.com/drop (open in new tab).

   RESPONSE FORMAT FOR BUILD MODE:
   1. Briefly explain the logic of the tool you built.
   2. Provide the code block wrapped in \`\`\`html ... \`\`\`.
   3. Give a 3-step 'A-to-Z' instruction on how the user can get their LIVE LINK in 10 seconds:
      Step 1: Click 'Publish Website' inside the preview to copy the code.
      Step 2: Create a file named 'index.html' on your device and paste the code.
      Step 3: Drag and drop 'index.html' into Netlify Drop (https://app.netlify.com/drop).`,
            tools: tools.length > 0 ? tools : undefined
          }
        });

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.text || 'I apologize, but I encountered an error processing your request.',
          timestamp: new Date(),
          type: 'text',
          sources: result.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
            title: chunk.web?.title || 'Source',
            url: chunk.web?.uri || '#'
          })).filter((s: any) => s.url !== '#')
        };
        setMessages(prev => [...prev, assistantMessage]);
        if (isAutoVoiceEnabled) {
          speakText(assistantMessage.content, assistantMessage.id);
        }
      }
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'System connection lost. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      speakText(errorMessage.content, errorMessage.id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast('Copied to clipboard');
  };

  const handleRegenerate = () => {
    if (messages.length < 2) return;
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      // Remove last assistant message if it exists
      if (messages[messages.length - 1].role === 'assistant') {
        setMessages(prev => prev.slice(0, -1));
      }
      handleSend(lastUserMessage.content);
    }
  };

  const speakText = (text: string, messageId: string) => {
    if (speakingMessageId === messageId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    
    // Remove markdown symbols for cleaner speech
    const cleanText = text.replace(/[*_#`~]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Voice Selection
    const voices = window.speechSynthesis.getVoices();
    const isHindi = /[\u0900-\u097F]/.test(text);
    
    if (isHindi) {
      utterance.lang = 'hi-IN';
      const hiVoice = voices.find(v => v.lang === 'hi-IN');
      if (hiVoice) utterance.voice = hiVoice;
    } else if (voiceAccent === 'indian') {
      utterance.lang = 'en-IN';
      // Priority list for Indian English voices
      const inVoice = voices.find(v => v.lang === 'en-IN' && (v.name.includes('India') || v.name.includes('Heera') || v.name.includes('Rishi') || v.name.includes('Veena')));
      if (inVoice) utterance.voice = inVoice;
      else {
        const fallbackIn = voices.find(v => v.lang.startsWith('en-IN'));
        if (fallbackIn) utterance.voice = fallbackIn;
      }
    } else {
      utterance.lang = 'en-US';
    }

    utterance.rate = speakingRate;

    utterance.onend = () => {
      setSpeakingMessageId(null);
      if (isAutoListenEnabled) {
        startListening();
      }
    };
    utterance.onerror = () => setSpeakingMessageId(null);
    
    setSpeakingMessageId(messageId);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className={`flex h-screen font-sans overflow-hidden transition-colors duration-300 ${
      theme === 'dark' ? 'bg-[#0e0e11] text-gray-100' : 'bg-white text-[#1F1F1F]'
    }`}>
      <AnimatePresence>
        {showOnboarding && <Onboarding key="onboarding" />}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className="fixed top-0 left-1/2 z-[110] px-6 py-3 bg-[#00FF66] text-black font-bold rounded-full shadow-[0_0_30px_rgba(0,255,102,0.3)] flex items-center gap-2 whitespace-nowrap"
          >
            {toast.includes('Congratulations') ? <Trophy className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
          />
        )}
      </AnimatePresence>

      {/* Sidebar (Genesis Control Panel) */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: isSidebarOpen ? 'min(400px, 80%)' : 0, 
          opacity: isSidebarOpen ? 1 : 0,
          x: isSidebarOpen ? 0 : -400
        }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className={`fixed h-full border-r flex flex-col z-40 backdrop-blur-2xl transition-colors ${
          theme === 'dark' ? 'bg-[#0e0e11]/60 border-white/5' : 'bg-white/60 border-gray-200'
        }`}
      >
        <div className="p-6 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#00FF66]/20 flex items-center justify-center">
              <Settings className="w-4 h-4 text-[#00FF66]" />
            </div>
            <h2 className="font-display font-bold text-lg tracking-tight">CONTROL PANEL</h2>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className={`p-2 rounded-xl transition-colors ${
              theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* New Chat Button */}
          <div className="flex gap-2">
            <button 
              onClick={createNewChat}
              className={`flex-1 flex items-center gap-3 p-4 rounded-[1.5rem] border transition-all shadow-md active:scale-95 ${
                theme === 'dark' 
                  ? 'bg-gradient-to-r from-white/10 to-white/5 border-white/10 hover:border-[#00FF66]/50' 
                  : 'bg-white border-gray-200 hover:border-indigo-500/50'
              } group`}
            >
              <Plus className="w-5 h-5 text-[#00FF66]" />
              <span className="text-sm font-bold">New Chat</span>
            </button>
            <button 
              onClick={() => { setIsPublicChatOpen(true); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 p-4 rounded-[1.5rem] border transition-all shadow-md active:scale-95 ${
                theme === 'dark' 
                  ? 'bg-gradient-to-r from-indigo-600/20 to-blue-600/20 border-indigo-500/30 hover:border-indigo-400' 
                  : 'bg-indigo-50 border-indigo-200 hover:border-indigo-400'
              } group`}
              title="Public Chat"
            >
              <Users className="w-5 h-5 text-indigo-500" />
            </button>
          </div>

          {/* History Search */}
          <div className={`relative flex items-center p-3 rounded-[1.5rem] border transition-all shadow-inner ${
            theme === 'dark' ? 'bg-black/20 border-white/10 focus-within:border-indigo-500/50' : 'bg-gray-100 border-gray-200 focus-within:border-indigo-500/50'
          }`}>
            <Search className="w-4 h-4 text-gray-500 ml-1" />
            <input 
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Search history..."
              className="bg-transparent border-none focus:ring-0 text-xs flex-1 placeholder-gray-500"
            />
          </div>

          {/* Recent Chats */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 px-2">
              <History className="w-3 h-3" />
              Recent Chats
            </div>
            <div className="space-y-1 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {sessions.filter(s => s.title.toLowerCase().includes(historySearch.toLowerCase())).length === 0 ? (
                <div className="text-[10px] text-gray-500 italic px-2 py-4 text-center">No matching chats</div>
              ) : (
                sessions.filter(s => s.title.toLowerCase().includes(historySearch.toLowerCase())).map(session => (
                  <div 
                    key={session.id}
                    onClick={() => switchSession(session.id)}
                    className={`group relative flex items-center justify-between p-4 rounded-[1.25rem] cursor-pointer transition-all shadow-sm ${
                      currentSessionId === session.id
                        ? theme === 'dark' ? 'bg-[#00FF66]/10 border border-[#00FF66]/30 shadow-[#00FF66]/5' : 'bg-indigo-50 border border-indigo-200'
                        : theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <MessageSquare className={`w-4 h-4 flex-shrink-0 ${currentSessionId === session.id ? 'text-[#00FF66]' : 'text-gray-400'}`} />
                      <span className={`text-xs truncate ${currentSessionId === session.id ? 'font-bold' : ''}`}>
                        {session.title}
                      </span>
                    </div>
                    <button 
                      onClick={(e) => deleteSession(e, session.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* User Profile Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">
              <User className="w-3 h-3" />
              User Profile
            </div>
            <div className={`p-4 rounded-3xl border flex items-center gap-4 ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${AVATARS.find(a => a.id === userProfile?.avatar)?.color || 'bg-indigo-600'}`}>
                {AVATARS.find(a => a.id === userProfile?.avatar)?.emoji || '👤'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-bold truncate">{userProfile?.name || 'Unknown User'}</div>
                  <div className="px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center gap-1">
                    <Star className="w-2 h-2 text-amber-500 fill-amber-500" />
                    <span className="text-[8px] font-bold text-amber-500 uppercase tracking-tighter">PRO</span>
                  </div>
                </div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Joined {userProfile ? new Date(userProfile.joinedAt).toLocaleDateString() : 'N/A'}</div>
              </div>
              <button 
                onClick={handleLogout}
                className={`p-2 rounded-xl text-red-500 transition-colors ${theme === 'dark' ? 'hover:bg-red-500/10' : 'hover:bg-red-50'}`}
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Voice Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">
              <Volume2 className="w-3 h-3" />
              Voice Synthesis
            </div>
            <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex justify-between text-[10px] font-bold mb-3 text-gray-400">
                <span>SLOW</span>
                <span>NORMAL</span>
                <span>FAST</span>
              </div>
              <input 
                type="range" 
                min="0.5" 
                max="2" 
                step="0.1" 
                value={speakingRate}
                onChange={(e) => setSpeakingRate(parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#00FF66]"
              />
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Volume2 className={`w-4 h-4 ${isAutoVoiceEnabled ? 'text-[#00FF66]' : 'text-gray-500'}`} />
                  <div className="text-sm font-bold">Auto Voice</div>
                </div>
                <button 
                  onClick={() => setIsAutoVoiceEnabled(!isAutoVoiceEnabled)}
                  className={`w-10 h-5 rounded-full p-1 transition-colors ${isAutoVoiceEnabled ? 'bg-[#00FF66]' : 'bg-gray-700'}`}
                >
                  <div className={`w-3 h-3 bg-white rounded-full transition-transform ${isAutoVoiceEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mic className={`w-4 h-4 ${isAutoListenEnabled ? 'text-[#00FF66]' : 'text-gray-500'}`} />
                  <div className="text-sm font-bold">Auto Listen</div>
                </div>
                <button 
                  onClick={() => setIsAutoListenEnabled(!isAutoListenEnabled)}
                  className={`w-10 h-5 rounded-full p-1 transition-colors ${isAutoListenEnabled ? 'bg-[#00FF66]' : 'bg-gray-700'}`}
                >
                  <div className={`w-3 h-3 bg-white rounded-full transition-transform ${isAutoListenEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">
              <Sparkles className="w-3 h-3" />
              Interface
            </div>
            <div className={`flex items-center justify-between p-4 rounded-2xl border ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-3">
                {theme === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-yellow-500" />}
                <div className="text-sm font-bold">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</div>
              </div>
              <button 
                onClick={toggleTheme}
                className={`w-10 h-5 rounded-full p-1 transition-colors ${theme === 'dark' ? 'bg-indigo-600' : 'bg-gray-300'}`}
              >
                <div className={`w-3 h-3 bg-white rounded-full transition-transform ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className={`flex items-center justify-between p-4 rounded-2xl border ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${isGlowEnabled ? 'bg-[#00FF66] shadow-[0_0_8px_#00FF66]' : 'bg-gray-600'}`} />
                <div className="text-sm font-bold">Neon Glow</div>
              </div>
              <button 
                onClick={() => setIsGlowEnabled(!isGlowEnabled)}
                className={`w-10 h-5 rounded-full p-1 transition-colors ${isGlowEnabled ? 'bg-[#00FF66]' : 'bg-gray-700'}`}
              >
                <div className={`w-3 h-3 bg-white rounded-full transition-transform ${isGlowEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
            
            <button 
              onClick={() => setShowUpdateLog(true)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                theme === 'dark' ? 'bg-white/5 border-white/5 hover:bg-blue-500/10 hover:border-blue-500/30' : 'bg-gray-50 border-gray-200 hover:bg-blue-50 hover:border-blue-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-blue-500" />
                <div className="text-sm font-bold">What's New</div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>

            <button 
              onClick={() => setShowSettings(true)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                theme === 'dark' ? 'bg-white/5 border-white/5 hover:bg-indigo-500/10 hover:border-indigo-500/30' : 'bg-gray-50 border-gray-200 hover:bg-indigo-50 hover:border-indigo-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-indigo-500" />
                <div className="text-sm font-bold">Settings</div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        <div className={`p-6 border-t flex flex-col items-center gap-2 ${theme === 'dark' ? 'border-white/5' : 'border-gray-100'}`}>
          <LogoIcon isSpeaking={false} size="sm" />
        </div>
      </motion.aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative w-full min-w-0">
        {/* Header */}
        <header className={`h-20 flex items-center justify-between px-4 md:px-6 sticky top-0 z-10 transition-colors ${
          theme === 'dark' ? 'bg-[#0e0e11]' : 'bg-white'
        }`}>
          <div className="flex items-center gap-3 md:gap-5">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-2 rounded-xl transition-all relative group ${
                theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-100'
              }`}
            >
              <Menu className={`w-5 h-5 transition-colors ${isSidebarOpen ? 'text-[#00FF66]' : ''}`} />
              <div className={`absolute inset-0 rounded-xl transition-opacity ${
                isSidebarOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
              } bg-[#00FF66]/10 shadow-[0_0_15px_rgba(0,255,102,0.2)]`} />
            </button>
            <GenesisLogo isSpeaking={!!speakingMessageId} isListening={isListening} />
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={() => setIsVisionMode(true)}
              className={`p-2 rounded-xl transition-colors ${theme === 'dark' ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
              title="Video Vision Call"
            >
              <Camera className="w-5 h-5" />
            </button>
            {/* Model Switcher */}
            <div className="hidden sm:flex items-center gap-1">
              <button 
                onClick={() => setIsTurboMode(false)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${!isTurboMode ? (theme === 'dark' ? 'text-[#00FF66]' : 'text-indigo-600') : 'text-gray-500'}`}
              >
                <Cpu className="w-3 h-3" />
                Flash
              </button>
              <button 
                onClick={() => setIsTurboMode(true)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${isTurboMode ? (theme === 'dark' ? 'text-[#00FF66]' : 'text-indigo-600') : 'text-gray-500'}`}
              >
                <Zap className="w-3 h-3" />
                Turbo
              </button>
            </div>

            {/* Grounding Toggle */}
            <button 
              onClick={() => setIsGroundingEnabled(!isGroundingEnabled)}
              className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                isGroundingEnabled 
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                  : theme === 'dark' ? 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10' : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
              }`}
              title="Search Grounding"
            >
              <Globe className={`w-4 h-4 ${isGroundingEnabled ? 'animate-pulse' : ''}`} />
              <span className="text-xs font-bold">Search</span>
            </button>

            <div className="w-px h-8 bg-white/5 hidden sm:block mx-1" />

            <button 
              onClick={() => setMode(prev => prev === 'chat' ? 'generate' : 'chat')}
              className={`p-2 rounded-xl transition-colors flex items-center gap-2 ${
                mode === 'generate' 
                  ? 'bg-purple-500/10 text-purple-500' 
                  : theme === 'dark' ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
              }`}
              title={mode === 'chat' ? 'Switch to Image Generation' : 'Switch to Chat'}
            >
              <Zap className={`w-5 h-5 ${mode === 'generate' ? 'fill-current' : ''}`} />
              <span className="hidden lg:inline text-xs font-bold uppercase tracking-wider">
                {mode === 'chat' ? 'Chat' : 'Nano Banana'}
              </span>
            </button>
            <div className={`w-8 h-8 md:w-9 md:h-9 rounded-full border flex items-center justify-center overflow-hidden ${
              theme === 'dark' ? 'bg-gray-800 border-white/10' : 'bg-gray-200 border-gray-300'
            }`}>
              {userProfile ? (
                <span className="text-lg">{AVATARS.find(a => a.id === userProfile.avatar)?.emoji}</span>
              ) : (
                <User className="w-4 h-4 md:w-5 md:h-5 opacity-60" />
              )}
            </div>
          </div>
        </header>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto scroll-smooth">
          {isVisionMode && <VideoVision onClose={() => setIsVisionMode(false)} apiKey={GEMINI_API_KEY} />}
          <div className="w-full">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6 md:space-y-8 pt-10 md:pt-20 px-4">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="relative"
                >
                  <LogoIcon isSpeaking={!!speakingMessageId} isListening={isListening} size="lg" />
                  <motion.div 
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [0.2, 0.4, 0.2]
                    }}
                    transition={{ 
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute inset-0 bg-[#00FF66] blur-3xl rounded-full -z-10"
                  />
                </motion.div>
                <div className="space-y-2 md:space-y-3 px-4">
                  <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight">
                    Welcome to Genesis
                  </h2>
                  <p className={`max-w-md mx-auto text-base md:text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Experience the next generation of AI. {mode === 'generate' ? 'Describe an image you want to create.' : 'How can I help you evolve today?'}
                  </p>
                </div>
                
                <div className="flex flex-col items-center gap-4 w-full max-w-2xl mt-4 md:mt-8 px-2">
                  <button 
                    onClick={() => setIsPublicChatOpen(true)}
                    className="w-full group relative overflow-hidden p-6 rounded-[2.5rem] bg-gradient-to-r from-indigo-600 to-violet-700 text-white shadow-xl shadow-indigo-500/20 active:scale-95 transition-all"
                  >
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                          <Users className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                          <h3 className="text-lg font-bold">Join the Public Square</h3>
                          <p className="text-xs text-white/70 font-medium uppercase tracking-widest">Connect with {activeUserCount} active strangers</p>
                        </div>
                      </div>
                      <ChevronRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                    </div>
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 w-full">
                    {[
                      { text: "Generate image of a futuristic city", icon: "🏙️", mode: 'generate' },
                      { text: "Draw a cute robot holding a banana", icon: "🍌", mode: 'generate' },
                      { text: "Analyze this image for me", icon: "👁️", mode: 'chat' },
                      { text: "Write a high-performance React hook", icon: "⚡", mode: 'chat' }
                    ].filter(s => mode === 'generate' ? s.mode === 'generate' : true).map((suggestion, i) => (
                      <button 
                        key={i}
                        onClick={() => { setInput(suggestion.text); if(suggestion.mode === 'generate') setMode('generate'); }}
                        className={`p-5 md:p-6 text-left rounded-[2rem] border transition-all group flex items-start gap-4 shadow-md hover:shadow-lg active:scale-95 ${
                          theme === 'dark' 
                            ? 'bg-gradient-to-br from-white/10 to-white/5 border-white/10 hover:border-white/20' 
                            : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-indigo-500/5'
                        }`}
                      >
                        <span className="text-2xl md:text-3xl transform group-hover:scale-110 transition-transform">{suggestion.icon}</span>
                        <p className={`text-xs md:text-sm font-bold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          {suggestion.text}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`w-full px-4 py-8 flex gap-4 border-b ${
                      theme === 'dark' ? 'border-white/5' : 'border-gray-100'
                    } ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div className="flex-shrink-0 mt-1">
                      {message.role === 'assistant' ? (
                        <LogoIcon 
                          isSpeaking={speakingMessageId === message.id} 
                          isListening={isListening && message.id === messages[messages.length-1]?.id} 
                          size="sm" 
                        />
                      ) : (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          theme === 'dark' ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {message.userName ? message.userName.charAt(0).toUpperCase() : 'U'}
                        </div>
                      )}
                    </div>
                    
                    <div className={`flex-1 min-w-0 flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${
                          theme === 'dark' ? 'text-white/40' : 'text-gray-400'
                        }`}>
                          {message.role === 'assistant' ? 'Genesis AI' : (message.userName || 'User')}
                        </span>
                      </div>

                      <div className={`space-y-4 w-full flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                        {message.userImage && (
                          <div className="max-w-sm rounded-xl overflow-hidden border border-white/10 shadow-lg">
                            <img src={message.userImage} alt="User upload" className="w-full h-auto" />
                          </div>
                        )}
                        
                        {message.type === 'image' && message.imageUrl ? (
                          <div className={`space-y-4 w-full flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`markdown-body ${message.role === 'user' ? 'text-right' : ''}`}>
                              <Markdown>{message.content}</Markdown>
                            </div>
                            <div 
                              onClick={() => setSelectedViewImage(message.imageUrl!)}
                              className="relative group rounded-xl overflow-hidden border border-white/10 cursor-zoom-in max-w-lg"
                            >
                              <img 
                                src={message.imageUrl} 
                                alt="Generated" 
                                className="w-full h-auto object-cover max-h-[500px]"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="flex gap-2 max-w-lg w-full">
                              <a 
                                href={message.imageUrl} 
                                download={`genesis-ai-${Date.now()}.png`}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-xs font-bold transition-all ${
                                  theme === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                }`}
                              >
                                <Download className="w-4 h-4" />
                                Download
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div className={`markdown-body ${theme === 'dark' ? 'prose-invert' : ''} ${message.role === 'user' ? 'text-right' : ''}`}>
                            <Markdown
                              components={{
                                code({ node, inline, className, children, ...props }: any) {
                                  const match = /language-(\w+)/.exec(className || '');
                                  const codeString = String(children).replace(/\n$/, '');
                                  
                                  if (!inline && match) {
                                    return (
                                      <div className="relative group/code my-4 w-full text-left">
                                        <div className="absolute right-2 top-2 opacity-0 group-hover/code:opacity-100 transition-opacity z-10">
                                          <button 
                                            onClick={() => {
                                              navigator.clipboard.writeText(codeString);
                                              showToast('Code copied');
                                            }}
                                            className="p-1.5 rounded-lg bg-white/10 backdrop-blur-md border border-white/10 hover:bg-white/20 text-white transition-all"
                                          >
                                            <Copy className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                        <div className="bg-black/40 rounded-xl p-4 overflow-x-auto border border-white/5">
                                          <code className={className} {...props}>
                                            {children}
                                          </code>
                                        </div>
                                      </div>
                                    );
                                  }
                                  return (
                                    <code className={`${className} bg-indigo-500/10 px-1.5 py-0.5 rounded text-indigo-400`} {...props}>
                                      {children}
                                    </code>
                                  );
                                }
                              }}
                            >
                              {message.content}
                            </Markdown>
                          </div>
                        )}

                        {/* Sources Section */}
                        {message.sources && message.sources.length > 0 && (
                          <motion.div 
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`mt-4 flex flex-wrap gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            {message.sources.map((source, idx) => (
                              <a
                                key={idx}
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border ${
                                  theme === 'dark' 
                                    ? 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:border-[#00FF66]/30 hover:text-[#00FF66]' 
                                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-white hover:border-indigo-500/30 hover:text-indigo-600'
                                }`}
                              >
                                <Globe size={12} />
                                <span className="truncate max-w-[120px]">{source.title}</span>
                                <ArrowUpRight size={10} className="opacity-40" />
                              </a>
                            ))}
                          </motion.div>
                        )}
                        
                        {message.role === 'assistant' && (
                          <div className="mt-4 flex items-center gap-4">
                            <button 
                              onClick={() => handleCopy(message.content, message.id)}
                              className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                                copiedId === message.id 
                                  ? 'text-[#00FF66]' 
                                  : theme === 'dark' ? 'text-white/40 hover:text-white' : 'text-gray-400 hover:text-gray-900'
                              }`}
                            >
                              {copiedId === message.id ? <Check size={12} /> : <Copy size={12} />}
                              {copiedId === message.id ? 'Copied' : 'Copy'}
                            </button>
                            
                            <button 
                              onClick={() => speakText(message.content, message.id)}
                              className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                                speakingMessageId === message.id 
                                  ? 'text-indigo-500' 
                                  : theme === 'dark' ? 'text-white/40 hover:text-white' : 'text-gray-400 hover:text-gray-900'
                              }`}
                            >
                              {speakingMessageId === message.id ? <VolumeX size={12} /> : <Volume2 size={12} />}
                              {speakingMessageId === message.id ? 'Stop' : 'Listen'}
                            </button>

                            {message.content.includes('```html') && (
                              <button 
                                onClick={() => extractAndPreviewCode(message.content)}
                                className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors text-indigo-500 hover:text-indigo-400`}
                              >
                                <Monitor size={12} />
                                Live Preview
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
            
            {isLoading && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 md:gap-6 ${mode === 'generate' ? 'flex-col items-center w-full' : 'flex-row'}`}
              >
                {mode === 'generate' ? (
                  <div className={`w-full max-w-md p-8 rounded-[2.5rem] border flex flex-col items-center gap-6 ${
                    theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-xl'
                  }`}>
                    <div className="relative w-20 h-20">
                      <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full" />
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 border-4 border-t-indigo-500 rounded-full"
                      />
                      <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-indigo-500 animate-pulse" />
                    </div>
                    <div className="text-center space-y-2">
                      <h3 className="text-lg font-bold">Generating Masterpiece...</h3>
                      <p className="text-xs text-gray-500">Genesis AI is crafting your high-quality image</p>
                    </div>
                    <div className="w-full bg-gray-800/50 h-1.5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 10, ease: "easeInOut" }}
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl flex items-center justify-center">
                      <LogoIcon isSpeaking={false} size="sm" />
                    </div>
                    <div className={`flex items-center gap-2 md:gap-3 px-4 py-3 md:px-5 md:py-4 rounded-[1.25rem] md:rounded-[1.5rem] rounded-tl-none border ${
                      theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm'
                    }`}>
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                      <span className={`text-xs md:text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        Genesis AI is processing...
                      </span>
                    </div>
                  </>
                )}
              </motion.div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Input Area */}
        <div className={`p-3 md:p-8 transition-colors ${
          theme === 'dark' 
            ? 'bg-gradient-to-t from-[#0e0e11] via-[#0e0e11] to-transparent' 
            : 'bg-gradient-to-t from-gray-50 via-gray-50 to-transparent'
        }`}>
          <div className="max-w-3xl mx-auto relative group">
            {/* Image Preview */}
            <AnimatePresence>
              {selectedImage && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className={`absolute bottom-full mb-4 p-2 rounded-2xl border shadow-xl flex items-center gap-3 ${
                    theme === 'dark' ? 'bg-[#18181b] border-white/10' : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/10">
                    <img src={selectedImage.preview} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setSelectedImage(null)}
                      className="absolute top-0.5 right-0.5 p-1 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="pr-4">
                    <p className="text-xs font-bold text-indigo-500">Image Selected</p>
                    <p className={`text-[10px] ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Genesis AI will analyze this</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={`relative transition-all ${
              theme === 'dark' 
                ? 'bg-[#0e0e11] border-t border-white/5' 
                : 'bg-white border-t border-gray-100'
            }`}>
              <div className="flex items-end gap-1 md:gap-2 px-2 py-2 md:py-4">
                <div className="flex items-center gap-0.5 md:gap-1 pb-1 md:pb-1.5 pl-0.5 md:pl-1">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/png, image/jpeg" 
                    className="hidden" 
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-2 md:p-2.5 rounded-full transition-colors ${
                      theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-100'
                    }`}
                    title="Upload Image"
                  >
                    <ImageIcon className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>
                
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={mode === 'generate' ? "Describe the image you want..." : selectedImage ? "Ask about this image..." : "Ask Genesis AI anything..."}
                  className={`flex-1 bg-transparent border-none focus:ring-0 py-2 md:py-3 px-1 md:px-2 text-sm resize-none max-h-[200px] min-h-[40px] md:min-h-[48px] transition-colors ${
                    theme === 'dark' ? 'text-gray-100 placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'
                  }`}
                  rows={1}
                />
                
                <div className="flex items-center gap-0.5 md:gap-1 pb-1 md:pb-1.5 pr-0.5 md:pl-1">
                  <button 
                    onClick={startListening}
                    disabled={isLoading}
                    className={`p-2 md:p-2.5 rounded-full transition-all relative group ${
                      isListening ? 'text-[#00FF66]' : theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-100'
                    }`}
                    title="Voice Input"
                  >
                    <Mic className={`w-4 h-4 md:w-5 md:h-5 ${isListening ? 'animate-pulse' : ''}`} />
                    {isListening && (
                      <div className="absolute inset-0 rounded-xl bg-[#00FF66]/10 shadow-[0_0_15px_rgba(0,255,102,0.2)]" />
                    )}
                  </button>
                  <button 
                    onClick={() => handleSend()}
                    disabled={(!input.trim() && !selectedImage) || isLoading}
                    className={`p-2 md:p-2.5 rounded-full transition-all ${
                      (!input.trim() && !selectedImage) || isLoading
                        ? 'text-gray-600 opacity-30 cursor-not-allowed'
                        : theme === 'dark' ? 'text-[#00FF66] hover:bg-[#00FF66]/10' : 'text-indigo-600 hover:bg-indigo-50'
                    }`}
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : <Send className="w-4 h-4 md:w-5 md:h-5" />}
                  </button>
                </div>
              </div>
            </div>
            <p className={`text-[9px] md:text-[10px] text-center mt-3 md:mt-4 font-medium tracking-wide ${
              theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
            }`}>
              GENESIS AI v2.7 • {mode === 'generate' ? 'NANO BANANA 🍌' : 'VISION ENABLED 👁️'}
            </p>
          </div>
        </div>
      </main>
      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`relative w-full max-w-lg rounded-[2.5rem] border p-8 shadow-2xl overflow-hidden ${
                theme === 'dark' ? 'bg-[#0e0e11] border-white/10' : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-indigo-500" />
                  </div>
                  <h2 className="text-2xl font-display font-bold">System Settings</h2>
                </div>
                <button 
                  onClick={() => setShowSettings(false)}
                  className={`p-2 rounded-xl transition-colors ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Appearance</div>
                  <div className={`p-4 rounded-2xl border flex items-center justify-between ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center gap-3">
                      {theme === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-yellow-500" />}
                      <div className="text-sm font-bold">Theme</div>
                    </div>
                    <div className="flex bg-gray-800/50 p-1 rounded-xl">
                      <button 
                        onClick={() => setTheme('light')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${theme === 'light' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                      >
                        Light
                      </button>
                      <button 
                        onClick={() => setTheme('dark')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${theme === 'dark' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                      >
                        Dark
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Voice & Audio</div>
                  <div className={`p-4 rounded-2xl border space-y-4 ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold">Auto Voice Synthesis</div>
                      <button 
                        onClick={() => setIsAutoVoiceEnabled(!isAutoVoiceEnabled)}
                        className={`w-10 h-5 rounded-full p-1 transition-colors ${isAutoVoiceEnabled ? 'bg-[#00FF66]' : 'bg-gray-700'}`}
                      >
                        <div className={`w-3 h-3 bg-white rounded-full transition-transform ${isAutoVoiceEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold">Auto Listen Mode</div>
                      <button 
                        onClick={() => setIsAutoListenEnabled(!isAutoListenEnabled)}
                        className={`w-10 h-5 rounded-full p-1 transition-colors ${isAutoListenEnabled ? 'bg-[#00FF66]' : 'bg-gray-700'}`}
                      >
                        <div className={`w-3 h-3 bg-white rounded-full transition-transform ${isAutoListenEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <div className="text-sm font-bold">Voice Accent</div>
                      <div className="flex bg-gray-800/50 p-1 rounded-xl">
                        <button 
                          onClick={() => setVoiceAccent('global')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${voiceAccent === 'global' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                          Global
                        </button>
                        <button 
                          onClick={() => setVoiceAccent('indian')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${voiceAccent === 'indian' ? 'bg-[#00FF66] text-black shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                          Indian
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Intelligence</div>
                  <div className={`p-4 rounded-2xl border space-y-4 ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Globe className="w-4 h-4 text-emerald-500" />
                        <div>
                          <div className="text-sm font-bold">Search Grounding</div>
                          <div className="text-[10px] text-gray-500">Real-time web search integration</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setIsGroundingEnabled(!isGroundingEnabled)}
                        className={`w-10 h-5 rounded-full p-1 transition-colors ${isGroundingEnabled ? 'bg-[#00FF66]' : 'bg-gray-700'}`}
                      >
                        <div className={`w-3 h-3 bg-white rounded-full transition-transform ${isGroundingEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 grid grid-cols-2 gap-3">
                  <button 
                    onClick={exportChat}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs transition-all ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'}`}
                  >
                    <FileDown className="w-4 h-4" />
                    Export Chat
                  </button>
                  <button 
                    onClick={() => {
                      setShowSettings(false);
                      setShowUpdateLog(true);
                    }}
                    className={`py-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                    }`}
                  >
                    <History className="w-4 h-4" />
                    Update Log
                  </button>
                  <button 
                    onClick={() => {
                      const sourceCode = document.documentElement.outerHTML;
                      const blob = new Blob([sourceCode], { type: 'text/html' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'genesis-ai-source.html';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      showToast('App Source Exported Successfully');
                    }}
                    className={`py-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      theme === 'dark' ? 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600'
                    }`}
                  >
                    <Download className="w-4 h-4" />
                    Export App
                  </button>
                  <button 
                    onClick={() => {
                      setSessions([]);
                      localStorage.removeItem('genesis_chat_sessions');
                      createNewChat();
                      setShowSettings(false);
                      showToast('Chat history cleared');
                    }}
                    className="col-span-2 py-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear History
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Lightbox Modal */}
      <AnimatePresence>
        {selectedViewImage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedViewImage(null)}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center"
            >
              <div className="absolute top-0 right-0 p-4 flex gap-4">
                <a 
                  href={selectedViewImage} 
                  download={`genesis-ai-hd-${Date.now()}.png`}
                  className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all flex items-center gap-2 px-6 font-bold"
                >
                  <Download className="w-5 h-5" />
                  Download High Quality
                </a>
                <button 
                  onClick={() => setSelectedViewImage(null)}
                  className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="w-full h-full flex items-center justify-center p-4">
                <img 
                  src={selectedViewImage} 
                  alt="Full View" 
                  className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border border-white/10"
                  referrerPolicy="no-referrer"
                />
              </div>
              
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-black/40 backdrop-blur-md px-8 py-4 rounded-full border border-white/10">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Resolution</span>
                  <span className="text-white font-bold">High Definition (HD)</span>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="flex flex-col items-center">
                  <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Format</span>
                  <span className="text-white font-bold">PNG Image</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUpdateLog && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUpdateLog(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`relative w-full max-w-lg rounded-[2rem] border overflow-hidden shadow-2xl ${
                theme === 'dark' ? 'bg-[#18181b] border-white/10' : 'bg-white border-gray-200'
              }`}
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                      <Info className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-xl">What's New</h3>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Genesis AI v2.0.4</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowUpdateLog(false)}
                    className={`p-2 rounded-lg transition-colors ${
                      theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-100'
                    }`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-[#00FF66] mb-2 uppercase tracking-wider">
                      <Zap className="w-3 h-3" /> New Feature
                    </div>
                    <h4 className="text-sm font-bold mb-1">Turbo Mode (Gemini 1.5 Pro)</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">Switch to Turbo mode for complex reasoning, advanced coding, and deeper analysis using the Pro model.</p>
                  </div>

                  <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 mb-2 uppercase tracking-wider">
                      <Globe className="w-3 h-3" /> Search Grounding
                    </div>
                    <h4 className="text-sm font-bold mb-1">Real-time Web Search</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">Enable search grounding to get the most up-to-date information directly from the web.</p>
                  </div>

                  <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-500 mb-2 uppercase tracking-wider">
                      <Mic className="w-3 h-3" /> Voice Assistant
                    </div>
                    <h4 className="text-sm font-bold mb-1">Indian Accent Support</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">Personalize your experience with the new Indian English voice accent for more natural interactions.</p>
                  </div>

                  <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-blue-500 mb-2 uppercase tracking-wider">
                      <Volume2 className="w-3 h-3" /> Audio Update
                    </div>
                    <h4 className="text-sm font-bold mb-1">Auto Voice & Speed</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">AI now speaks automatically at 1.35x speed. You can toggle Auto Voice and adjust speed in the Control Panel.</p>
                  </div>

                  <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-purple-500 mb-2 uppercase tracking-wider">
                      <Activity className="w-3 h-3" /> System Logic
                    </div>
                    <h4 className="text-sm font-bold mb-1">System Reset & Export</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">Instantly clear session memory or export your entire conversation as a text file for offline use.</p>
                  </div>
                </div>

                <button 
                  onClick={() => setShowUpdateLog(false)}
                  className="w-full py-4 bg-[#00FF66] text-black font-bold rounded-2xl hover:bg-[#00cc52] transition-colors shadow-[0_0_20px_rgba(0,255,102,0.2)]"
                >
                  GOT IT
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isPreviewOpen && previewCode && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPreviewOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              className={`relative w-full max-w-6xl h-[90vh] rounded-[3rem] border shadow-2xl overflow-hidden flex flex-col ${
                theme === 'dark' ? 'bg-[#0e0e11] border-white/10' : 'bg-white border-gray-200'
              }`}
            >
              <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-indigo-600/10 to-transparent">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center shadow-lg shadow-indigo-500/10">
                    <Monitor className="w-6 h-6 text-indigo-500" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-display font-bold tracking-tight">Live Sandbox</h2>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Interactive Code Preview</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      const blob = new Blob([previewCode], { type: 'text/html' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'genesis-preview.html';
                      a.click();
                    }}
                    className={`p-3 rounded-2xl transition-colors flex items-center gap-2 text-xs font-bold ${theme === 'dark' ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                  <button 
                    onClick={() => setIsPreviewOpen(false)}
                    className={`p-3 rounded-2xl transition-colors ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`}
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-white">
                <iframe 
                  srcDoc={previewCode}
                  title="Genesis Sandbox"
                  className="w-full h-full border-none"
                  sandbox="allow-scripts"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPublicChatOpen && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed inset-0 z-[200] flex flex-col ${
              theme === 'dark' ? 'bg-[#0e0e11]' : 'bg-white'
            }`}
          >
            {/* Instagram Style Header */}
            <div className={`h-16 flex items-center justify-between px-4 border-b ${
              theme === 'dark' ? 'border-white/5 bg-[#0e0e11]/80' : 'border-gray-100 bg-white/80'
            } backdrop-blur-md sticky top-0 z-10`}>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsPublicChatOpen(false)}
                  className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`}
                >
                  <ChevronRight className="w-6 h-6 rotate-180" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-[2px]">
                      <div className={`w-full h-full rounded-full border-2 flex items-center justify-center text-xl ${
                        theme === 'dark' ? 'bg-[#0e0e11] border-[#0e0e11]' : 'bg-white border-white'
                      }`}>
                        🌐
                      </div>
                    </div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#00FF66] border-2 border-[#0e0e11] rounded-full" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold">Public Square</h2>
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">
                      {activeUserCount} active now
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button className={`p-2 rounded-full ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`}>
                  <Activity className="w-5 h-5" />
                </button>
                <button className={`p-2 rounded-full ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`}>
                  <Info className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {publicMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-40">
                  <div className="w-24 h-24 rounded-full border-4 border-dashed border-indigo-500/30 flex items-center justify-center">
                    <MessageCircle className="w-10 h-10 text-indigo-500" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-bold">No messages yet</p>
                    <p className="text-xs max-w-[200px] mx-auto">Be the first to say hello in the Public Square!</p>
                  </div>
                </div>
              )}
              
              {publicMessages.map((msg, idx) => {
                const isMe = msg.userId === socket?.id;
                const showAvatar = !isMe && (idx === 0 || publicMessages[idx-1].userId !== msg.userId);
                
                return (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    key={msg.id}
                    className={`flex flex-col ${msg.role === 'system' ? 'items-center' : isMe ? 'items-end' : 'items-start'}`}
                  >
                    {msg.role === 'system' ? (
                      <div className="my-4 px-4 py-1 rounded-full text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-500/5 border border-white/5">
                        {msg.content}
                      </div>
                    ) : (
                      <div className={`flex items-end gap-2 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        {!isMe && (
                          <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-lg bg-gray-500/10 border border-white/5">
                            {showAvatar ? msg.userAvatar : ''}
                          </div>
                        )}
                        <div className="flex flex-col gap-1">
                          {!isMe && showAvatar && (
                            <span className="text-[10px] font-bold text-gray-500 ml-2 mb-1 uppercase tracking-widest">
                              {msg.userName}
                            </span>
                          )}
                          <motion.div 
                            onDoubleClick={() => addReaction(msg.id, '❤️')}
                            className={`relative px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm group ${
                              isMe 
                                ? 'bg-indigo-600 text-white rounded-br-sm' 
                                : theme === 'dark' 
                                  ? 'bg-white/10 text-gray-200 rounded-bl-sm border border-white/5' 
                                  : 'bg-gray-100 text-gray-800 rounded-bl-sm border border-gray-200'
                            }`}
                          >
                            {msg.content}
                            
                            {/* Reactions Display */}
                            {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                              <div className={`absolute -bottom-3 ${isMe ? 'right-0' : 'left-0'} flex items-center gap-1 bg-white dark:bg-gray-800 rounded-full px-1.5 py-0.5 shadow-md border border-white/10 scale-90`}>
                                {Object.entries(msg.reactions).map(([emoji, users]) => (
                                  <div key={emoji} className="flex items-center gap-1" title={users.join(', ')}>
                                    <span>{emoji}</span>
                                    {users.length > 1 && <span className="text-[8px] font-bold">{users.length}</span>}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Hover Reaction Menu */}
                            <div className={`absolute top-0 ${isMe ? '-left-12' : '-right-12'} opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1`}>
                              {['❤️', '😂', '🔥'].map(emoji => (
                                <button 
                                  key={emoji}
                                  onClick={() => addReaction(msg.id, emoji)}
                                  className="p-1 hover:scale-125 transition-transform"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {/* Typing Indicator */}
              {Object.keys(typingUsers).length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest px-12"
                >
                  <div className="flex gap-1">
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1 h-1 bg-gray-500 rounded-full" />
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1 h-1 bg-gray-500 rounded-full" />
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1 h-1 bg-gray-500 rounded-full" />
                  </div>
                  <span>{Object.values(typingUsers).join(', ')} {Object.keys(typingUsers).length > 1 ? 'are' : 'is'} typing...</span>
                </motion.div>
              )}
              
              <div ref={publicMessagesEndRef} />
            </div>

            {/* Instagram Style Input */}
            <div className={`p-4 border-t ${theme === 'dark' ? 'border-white/5 bg-[#0e0e11]' : 'border-gray-100 bg-white'}`}>
              <div className={`flex items-center gap-2 p-1 rounded-full border ${
                theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-1 pl-2">
                  <button className="p-2 text-indigo-500 hover:scale-110 transition-transform">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <textarea
                  value={publicChatInput}
                  onChange={handleTyping}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendPublicMessage();
                    }
                  }}
                  placeholder="Message..."
                  className="flex-1 bg-transparent border-none focus:ring-0 py-2 px-2 text-sm resize-none max-h-32 min-h-[40px]"
                  rows={1}
                />
                <div className="flex items-center gap-1 pr-2">
                  {publicChatInput.trim() ? (
                    <button 
                      onClick={sendPublicMessage}
                      className="px-4 py-2 text-sm font-bold text-indigo-500 hover:text-indigo-400 transition-colors"
                    >
                      Send
                    </button>
                  ) : (
                    <>
                      <button className="p-2 text-gray-500 hover:text-indigo-500 transition-colors">
                        <Mic className="w-5 h-5" />
                      </button>
                      <button className="p-2 text-gray-500 hover:text-indigo-500 transition-colors">
                        <ImageIcon className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
