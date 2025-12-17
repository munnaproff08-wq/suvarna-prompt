import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  BrainCircuit, 
  Zap, 
  Search,
  Globe,
  History,
  Mic
} from './components/Icons';
import GoldenCard from './components/GoldenCard';
import ChatBot from './components/ChatBot';
import HistoryDrawer from './components/HistoryDrawer';
import { generateGoldenPrompt, quickPreview, connectToLiveSession } from './services/geminiService';
import { ConversionState, HistoryItem } from './types';
import { LiveServerMessage, Blob as GeminiBlob } from '@google/genai';

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [previewTranslation, setPreviewTranslation] = useState('');
  const [useGrounding, setUseGrounding] = useState(false);
  const [conversionState, setConversionState] = useState<ConversionState>({
    isLoading: false,
    result: null,
    error: null,
    sources: []
  });

  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Voice Input State
  const [isRecording, setIsRecording] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const currentTranscriptionRef = useRef(''); 

  // Initialize History
  useEffect(() => {
    const savedHistory = localStorage.getItem('suvarna-history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('suvarna-history', JSON.stringify(history));
  }, [history]);

  // Debounced preview
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (inputText.length > 5 && !conversionState.isLoading) {
        const preview = await quickPreview(inputText);
        setPreviewTranslation(preview);
      } else if (inputText.length === 0) {
        setPreviewTranslation('');
      }
    }, 500); 
    return () => clearTimeout(timer);
  }, [inputText, conversionState.isLoading]);


  // --- Audio Processing Helper Functions ---

  const createBlob = (data: Float32Array): GeminiBlob => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        // Simple downsampling/conversion to PCM 16-bit
        int16[i] = Math.max(-1, Math.min(1, data[i])) * 32767;
    }
    const uint8 = new Uint8Array(int16.buffer);
    
    // Manual base64 encoding for better performance/compatibility than btoa with large arrays
    let binary = '';
    const len = uint8.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(uint8[i]);
    }
    const base64 = btoa(binary);

    return {
        data: base64,
        mimeType: 'audio/pcm;rate=16000',
    };
  };

  const startRecording = async () => {
    try {
        setIsRecording(true);
        currentTranscriptionRef.current = ""; // Reset turn transcription
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        sourceRef.current = source;
        
        // Use ScriptProcessor for raw PCM access (AudioWorklet is better but requires separate file)
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        const sessionPromise = connectToLiveSession({
            onopen: () => {
                console.log("Gemini Live Session Opened");
            },
            onmessage: (message: LiveServerMessage) => {
                // Handle Real-time Transcription
                if (message.serverContent?.inputTranscription) {
                    const text = message.serverContent.inputTranscription.text;
                    if (text) {
                        setInputText(prev => prev + text);
                    }
                }
                
                // If turn is complete, we might get a final block, but inputTranscription usually streams chunks.
                // We ignore audio output from model as we just want transcription.
            },
            onerror: (err) => {
                console.error("Gemini Live Error:", err);
                setIsRecording(false);
                cleanupAudio();
            },
            onclose: () => {
                console.log("Gemini Live Session Closed");
                setIsRecording(false);
                cleanupAudio();
            }
        });

        processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmBlob = createBlob(inputData);
            
            sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
            }).catch(e => console.error("Session send error", e));
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

    } catch (error) {
        console.error("Microphone Access Error:", error);
        alert("Could not access microphone. Please ensure permissions are granted.");
        setIsRecording(false);
        cleanupAudio();
    }
  };

  const cleanupAudio = () => {
      if (processorRef.current) {
          processorRef.current.disconnect();
          processorRef.current = null;
      }
      if (sourceRef.current) {
          sourceRef.current.disconnect();
          sourceRef.current = null;
      }
      if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
      }
      if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
      }
  };

  const stopRecording = () => {
     setIsRecording(false);
     cleanupAudio();
     // We don't need to explicitly close the session wrapper here as cleanupAudio kills the stream
     // and the session will likely timeout or we could store session and close it. 
     // For simplicity in this structure, cutting the stream stops the interaction.
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const addToHistory = (originalInput: string, result: any) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      originalInput,
      result,
      timestamp: Date.now()
    };
    setHistory(prev => [newItem, ...prev]);
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
    setInputText(item.originalInput);
    setConversionState({
      isLoading: false,
      result: item.result,
      sources: [],
      error: null
    });
    setIsHistoryOpen(false);
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const handleConvert = async () => {
    if (!inputText.trim()) return;

    setConversionState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { data, sources, error } = await generateGoldenPrompt(inputText, useGrounding);
      
      if (error || !data) {
        setConversionState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: error || "Failed to generate." 
        }));
        return;
      }

      setConversionState({
        isLoading: false,
        result: data,
        sources: sources,
        error: null
      });

      addToHistory(inputText, data);

    } catch (err) {
      setConversionState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: "Unexpected error occurred." 
      }));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-amber-500/30">
      {/* Background Ambience */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[100px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-600/10 blur-[100px] rounded-full"></div>
      </div>

      <HistoryDrawer 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelect={handleSelectHistoryItem}
        onDelete={handleDeleteHistoryItem}
      />

      <main className="relative z-10 container mx-auto px-4 py-8 lg:py-12 max-w-6xl">
        
        {/* Header */}
        <header className="relative text-center mb-16 space-y-4">
          <button 
            onClick={() => setIsHistoryOpen(true)}
            className="absolute left-0 top-0 p-2 sm:p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-amber-400 hover:border-amber-500/50 transition-all group"
            title="View History"
          >
            <History className="w-5 h-5 group-hover:rotate-[-10deg] transition-transform" />
          </button>

          <div className="inline-flex items-center justify-center p-3 rounded-full bg-slate-900 border border-slate-800 shadow-xl mb-4">
            <Sparkles className="w-8 h-8 text-amber-500 animate-pulse" />
          </div>
          <h1 className="text-4xl md:text-6xl font-serif font-bold tracking-tight">
            <span className="text-white">Suvarna</span> 
            <span className="gold-gradient-text ml-3">Prompt</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto font-light">
            Transform everyday Telugu, Hindi & English into <span className="text-amber-400 font-medium">Golden AI Prompts</span>.
            Powered by Gemini Thinking Mode.
          </p>
        </header>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          
          {/* LEFT COLUMN: Input */}
          <div className="space-y-6">
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-800 shadow-xl">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-400 uppercase tracking-wide">
                  Your Idea (Telugu, Hindi, English)
                </label>
              </div>
              
              <div className="relative">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="E.g., 'Oka robot coffee thaguthundi' or 'Ek futuristic city mein...'"
                  className="w-full h-48 bg-slate-950 border border-slate-700 rounded-xl p-4 text-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all resize-none leading-relaxed text-slate-200 placeholder-slate-600"
                />
                
                {/* Voice Input Button */}
                <button
                  onClick={handleMicClick}
                  className={`absolute right-4 top-4 p-2 rounded-full transition-all duration-300 ${
                    isRecording 
                      ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.4)] ring-2 ring-red-500' 
                      : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-amber-400'
                  }`}
                  title={isRecording ? "Stop recording" : "Start voice input"}
                >
                   <Mic className={`w-5 h-5 ${isRecording ? 'animate-bounce' : ''}`} />
                </button>
                
                {/* Visual Feedback for Voice */}
                {isRecording && (
                   <div className="absolute bottom-4 left-4 right-4 flex items-center justify-center pointer-events-none">
                     <span className="text-xs px-3 py-1 rounded-full bg-red-900/50 text-red-200 border border-red-500/20 backdrop-blur-md flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                        Listening & Typing...
                     </span>
                   </div>
                )}

                {/* Fast Preview Overlay */}
                {previewTranslation && !conversionState.result && !isRecording && (
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="text-xs text-amber-500/70 mb-1 flex items-center gap-1">
                       <Zap className="w-3 h-3" /> Quick Translation Preview
                    </div>
                    <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-lg text-sm text-slate-400 truncate">
                      {previewTranslation}
                    </div>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <button
                   onClick={() => setUseGrounding(!useGrounding)}
                   className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all border ${
                     useGrounding 
                     ? 'bg-blue-900/30 border-blue-500 text-blue-400' 
                     : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                   }`}
                >
                  <Search className="w-4 h-4" />
                  {useGrounding ? 'Google Search Active' : 'Enable Search Grounding'}
                </button>

                <button
                  onClick={handleConvert}
                  disabled={conversionState.isLoading || !inputText || isRecording}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-slate-100 hover:bg-white text-slate-900 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)]"
                >
                  {conversionState.isLoading ? (
                    <>
                      <BrainCircuit className="w-5 h-5 animate-spin" />
                      Thinking...
                    </>
                  ) : (
                    <>
                      Make it Golden <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Features Info */}
            <div className="grid grid-cols-2 gap-4">
               <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-800/50 flex flex-col items-center text-center gap-2">
                  <BrainCircuit className="w-6 h-6 text-purple-400" />
                  <span className="text-sm font-medium text-slate-300">Deep Thinking</span>
                  <span className="text-xs text-slate-500">Gemini 3 Pro analyzes context</span>
               </div>
               <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-800/50 flex flex-col items-center text-center gap-2">
                  <Globe className="w-6 h-6 text-blue-400" />
                  <span className="text-sm font-medium text-slate-300">Multi-language</span>
                  <span className="text-xs text-slate-500">Supports Telugu, Hindi & English</span>
               </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Output */}
          <div className="h-full min-h-[500px]">
            {conversionState.isLoading ? (
              <div className="h-full bg-slate-900/30 border border-slate-800 rounded-2xl flex flex-col items-center justify-center p-8 text-center space-y-4 animate-pulse">
                 <div className="relative w-20 h-20">
                    <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                    <div className="absolute inset-0 border-t-4 border-amber-500 rounded-full animate-spin"></div>
                    <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-amber-500" />
                 </div>
                 <div>
                   <h3 className="text-xl font-bold text-slate-200">Refining your prompt...</h3>
                   <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto">
                     Analyzing linguistic nuance, applying artistic styles, and optimizing for clarity.
                   </p>
                 </div>
              </div>
            ) : conversionState.result ? (
              <GoldenCard 
                result={conversionState.result} 
                sources={conversionState.sources}
                onCopy={copyToClipboard}
              />
            ) : (
              <div className="h-full bg-slate-900/30 border border-slate-800 rounded-2xl flex flex-col items-center justify-center p-8 text-center border-dashed">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-slate-600" />
                </div>
                <h3 className="text-lg font-medium text-slate-400">Ready to Shine</h3>
                <p className="text-slate-600 max-w-sm mt-2">
                  Enter your prompt in Telugu, Hindi or English to see the magic happen.
                </p>
              </div>
            )}

            {conversionState.error && (
              <div className="mt-4 p-4 bg-red-900/20 border border-red-500/50 rounded-xl text-red-200 text-sm text-center">
                {conversionState.error}
              </div>
            )}
          </div>

        </div>
      </main>

      <ChatBot />
    </div>
  );
};

export default App;