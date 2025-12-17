import React, { useState, useEffect } from 'react';
import { Copy, Sparkles, BrainCircuit, Edit2, Save, X, Plus, RotateCcw } from './Icons';
import { GoldenResult, GroundingSource } from '../types';

interface GoldenCardProps {
  result: GoldenResult;
  sources: GroundingSource[];
  onCopy: (text: string) => void;
}

const ENHANCEMENT_CHIPS = [
  { label: '4K Resolution', value: ' in 4K resolution, highly detailed' },
  { label: 'Photorealistic', value: ', photorealistic style, cinematic lighting' },
  { label: 'Professional Tone', value: ' (rewritten in a formal, professional tone)' },
  { label: 'Cyberpunk', value: ', cyberpunk aesthetic, neon lights, high contrast' },
  { label: 'JSON Format', value: ' Format output as JSON.' },
  { label: 'Minimalist', value: ', minimalist style, clean lines, white background' },
];

const GoldenCard: React.FC<GoldenCardProps> = ({ result, sources, onCopy }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState(result.goldenPrompt);

  // Sync local state when the result prop changes (e.g. new generation or history restore)
  useEffect(() => {
    setCurrentPrompt(result.goldenPrompt);
    setIsEditing(false);
  }, [result]);

  const handleEnhance = (textToAdd: string) => {
    setCurrentPrompt(prev => {
      // Avoid duplicate appending if it ends with the same string roughly
      if (prev.endsWith(textToAdd)) return prev;
      return `${prev}${textToAdd}`;
    });
  };

  const handleReset = () => {
    setCurrentPrompt(result.goldenPrompt);
  };

  return (
    <div className="relative group perspective-1000">
      <div className="absolute -inset-1 bg-gradient-to-r from-amber-600 to-yellow-400 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
      
      <div className="relative bg-slate-900 ring-1 ring-slate-800 rounded-2xl p-6 sm:p-8 h-full flex flex-col justify-between overflow-hidden">
        {/* Abstract Golden Shine Effect */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-amber-500/10 blur-3xl"></div>

        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-serif font-bold text-amber-400 tracking-wide">GOLDEN PROMPT</h2>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-2 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700">
                {result.category.toUpperCase()}
                </span>
                {!isEditing && (
                    <button 
                        onClick={() => setIsEditing(true)}
                        className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Edit Prompt"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                )}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Translation</h3>
            <p className="text-slate-300 italic">"{result.originalTranslation}"</p>
          </div>

          <div className="space-y-3">
             <div className="flex items-center justify-between">
                <h3 className="text-xs text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-2">
                    <BrainCircuit className="w-3 h-3" />
                    {isEditing ? 'Editing Prompt' : 'The Golden Result'}
                </h3>
                {isEditing && (
                    <div className="flex gap-2">
                        <button 
                            onClick={handleReset}
                            className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
                        >
                            <RotateCcw className="w-3 h-3" /> Reset
                        </button>
                    </div>
                )}
             </div>

             {isEditing ? (
                 <div className="space-y-3">
                    <textarea 
                        value={currentPrompt}
                        onChange={(e) => setCurrentPrompt(e.target.value)}
                        className="w-full h-40 bg-slate-950 border border-amber-500/50 rounded-xl p-4 text-amber-50 leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-sm resize-none shadow-inner"
                    />
                    
                    <div>
                        <span className="text-xs text-slate-500 block mb-2">Quick Enhancements:</span>
                        <div className="flex flex-wrap gap-2">
                            {ENHANCEMENT_CHIPS.map((chip, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleEnhance(chip.value)}
                                    className="flex items-center gap-1 text-[10px] sm:text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/50 text-slate-300 rounded-full transition-all active:scale-95"
                                >
                                    <Plus className="w-3 h-3 text-amber-500" />
                                    {chip.label}
                                </button>
                            ))}
                        </div>
                    </div>
                 </div>
             ) : (
                <div className="bg-slate-950/50 p-4 rounded-xl border border-amber-500/30 text-amber-50 leading-relaxed shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                    {currentPrompt}
                </div>
             )}
          </div>

          {result.reasoning && !isEditing && (
             <div className="space-y-1">
                <h3 className="text-xs text-slate-600 uppercase tracking-wider">AI Reasoning</h3>
                <p className="text-xs text-slate-500 leading-tight">{result.reasoning}</p>
             </div>
          )}

          {sources.length > 0 && !isEditing && (
            <div className="pt-2 border-t border-slate-800/50">
               <h3 className="text-xs text-slate-500 mb-2">Grounding Sources:</h3>
               <div className="flex flex-wrap gap-2">
                 {sources.map((s, idx) => (
                   <a 
                    key={idx} 
                    href={s.uri} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-blue-400 px-2 py-1 rounded transition-colors truncate max-w-[150px]"
                   >
                     {s.title}
                   </a>
                 ))}
               </div>
            </div>
          )}
        </div>

        <div className="mt-8 pt-4 flex justify-end gap-3">
          {isEditing ? (
              <>
                 <button 
                    onClick={() => setIsEditing(false)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg transition-all"
                 >
                    <X className="w-4 h-4" />
                    Done
                 </button>
                 <button 
                    onClick={() => {
                        onCopy(currentPrompt);
                        setIsEditing(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-900 font-bold rounded-lg transition-all shadow-lg active:scale-95"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
              </>
          ) : (
            <button 
                onClick={() => onCopy(currentPrompt)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-900 font-bold rounded-lg transition-all shadow-lg active:scale-95"
            >
                <Copy className="w-4 h-4" />
                Copy Prompt
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoldenCard;