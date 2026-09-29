import React from 'react';

interface Props {
  confidenceLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
}

export const AdaptiveConfidenceBadge: React.FC<Props> = ({ confidenceLevel }) => {
  const getBadgeStyles = () => {
    switch (confidenceLevel) {
      case 'VERY_HIGH': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'HIGH': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'MODERATE': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'LOW': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getIcon = () => {
    switch (confidenceLevel) {
      case 'VERY_HIGH': return '🌟';
      case 'HIGH': return '✓';
      case 'MODERATE': return '⚠️';
      case 'LOW': return '🚨';
      default: return '❓';
    }
  };

  return (
    <div className={`inline-flex items-center px-2 py-1 rounded-full border text-xs font-medium ${getBadgeStyles()}`}>
      <span className="mr-1">{getIcon()}</span>
      <span>{confidenceLevel.replace('_', ' ')} CONFIDENCE</span>
    </div>
  );
};
