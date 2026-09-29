import React from 'react';
import type { NormalizedHealthSignal } from '../../health/healthTypes.ts';

interface Props {
  signals: Record<string, NormalizedHealthSignal<number>>;
  explanation: string;
}

export const AdaptiveSignalBreakdown: React.FC<Props> = ({ signals, explanation }) => {
  const renderBar = (label: string, percentage: number) => {
    const filledBlocks = Math.round(percentage / 10);
    const emptyBlocks = 10 - filledBlocks;
    const bar = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);

    return (
      <div className="flex justify-between items-center mb-1 font-mono text-sm" key={label}>
        <span className="w-32">{label}</span>
        <span className="text-gray-400 tracking-widest">{bar}</span>
        <span className="w-12 text-right">{Math.round(percentage)}%</span>
      </div>
    );
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
      <h4 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">Signal Transparency</h4>
      
      <div className="mb-4">
        {Object.entries(signals).map(([key, signal]) => 
           renderBar(key.charAt(0).toUpperCase() + key.slice(1), signal.confidence * 100)
        )}
      </div>

      <div className="bg-gray-800 rounded p-3 text-sm text-gray-300 border-l-2 border-indigo-500">
        <p className="italic">"{explanation}"</p>
      </div>
    </div>
  );
};
