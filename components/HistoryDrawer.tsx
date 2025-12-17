import React, { useState } from 'react';
import { X, Search, Clock, Trash2, ArrowRight } from './Icons';
import { HistoryItem } from '../types';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
}

const HistoryDrawer: React.FC<HistoryDrawerProps> = ({ 
  isOpen, 
  onClose, 
  history, 
  onSelect,
  onDelete
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistory = history.filter(item => 
    item.originalInput.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.result.goldenPrompt.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => b.timestamp - a.timestamp);

  const formatDate = (ts: number) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(ts));
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div className={`fixed top-0 left-0 h-full w-full sm:w-96 bg-slate-900 border-r border-slate-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          
          {/* Header */}
          <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900">
            <h2 className="text-xl font-serif font-bold text-slate-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              History Log
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-slate-800 bg-slate-900/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search past prompts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredHistory.length === 0 ? (
              <div className="text-center text-slate-500 mt-10">
                {searchTerm ? 'No matching prompts found.' : 'No history yet.'}
              </div>
            ) : (
              filteredHistory.map(item => (
                <div 
                  key={item.id} 
                  className="group relative bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl p-4 transition-all cursor-pointer hover:shadow-lg hover:border-amber-500/30"
                  onClick={() => onSelect(item)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-mono text-amber-500/80 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                      {item.result.category}
                    </span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item.id);
                      }}
                      className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <p className="text-sm text-slate-300 font-medium line-clamp-2 mb-2">
                    {item.result.goldenPrompt}
                  </p>
                  
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span className="truncate max-w-[150px] italic">"{item.originalInput}"</span>
                    <span>{formatDate(item.timestamp)}</span>
                  </div>

                  <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRight className="w-4 h-4 text-amber-500" />
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="p-4 text-center text-xs text-slate-600 border-t border-slate-800">
            History is saved locally
          </div>
        </div>
      </div>
    </>
  );
};

export default HistoryDrawer;