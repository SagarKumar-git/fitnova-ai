import React from 'react';

interface Props {
  outcome: 'adaptation_successful' | 'adaptation_too_aggressive' | 'adaptation_too_conservative' | 'insufficient_data' | 'neutral';
}

export const AdaptiveOutcomeCard: React.FC<Props> = ({ outcome }) => {
  const getConfig = () => {
    switch (outcome) {
      case 'adaptation_successful':
        return { color: 'text-green-400 bg-green-500/10 border-green-500/20', icon: '🎯', label: 'Successful Adaptation' };
      case 'adaptation_too_aggressive':
        return { color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: '📉', label: 'Too Aggressive' };
      case 'adaptation_too_conservative':
        return { color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: '📈', label: 'Too Conservative' };
      case 'insufficient_data':
      case 'neutral':
      default:
        return { color: 'text-gray-400 bg-gray-500/10 border-gray-500/20', icon: '➖', label: 'Neutral / No Data' };
    }
  };

  const config = getConfig();

  return (
    <div className={`px-3 py-2 rounded-md border text-sm font-medium flex items-center ${config.color}`}>
      <span className="mr-2">{config.icon}</span>
      {config.label}
    </div>
  );
};
