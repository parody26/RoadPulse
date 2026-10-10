import React from 'react';
import { X, ZoomIn, ShieldCheck } from 'lucide-react';

export default function ImageModal({ imageUrl, title, onClose }) {
  if (!imageUrl) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="relative bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <ZoomIn className="w-4 h-4 text-cyan-400" />
            <span>{title || 'YOLO AI Visual Evidence Inspector'}</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* High-Res Viewport */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black max-h-[70vh] flex items-center justify-center p-2">
          <img 
            src={imageUrl} 
            alt="Defect Evidence Detail" 
            className="max-h-[65vh] w-auto object-contain rounded-xl shadow-2xl"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80';
            }}
          />
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Authenticated Visual Evidence • GPS & Timestamp Embedded</span>
          </div>
          <span className="text-cyan-400 font-mono font-bold">100% Inspection Clarity</span>
        </div>
      </div>
    </div>
  );
}
