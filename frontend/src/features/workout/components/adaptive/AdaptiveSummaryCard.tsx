import React from 'react';

interface Props {
  totalAdaptationsThisWeek: number;
  acceptedCount: number;
  successfulCount: number;
  averageConfidence: number;
  adaptiveStatus: 'Active' | 'Learning' | 'Disabled';
}

export const AdaptiveSummaryCard: React.FC<Props> = ({
  totalAdaptationsThisWeek,
  acceptedCount,
  successfulCount,
  averageConfidence,
  adaptiveStatus
}) => {
  return (
    <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 flex flex-col md:flex-row gap-6 justify-between items-center">
      
      {/* Status & Overview */}
      <div className="flex-1">
        <h3 className="text-lg font-bold text-white mb-1 flex items-center">
          Adaptive Engine
          <span className={`ml-3 px-2 py-0.5 rounded text-xs font-bold uppercase ${
            adaptiveStatus === 'Active' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
            adaptiveStatus === 'Learning' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
            'bg-gray-500/20 text-gray-400 border border-gray-500/30'
          }`}>
            {adaptiveStatus}
          </span>
        </h3>
        <p className="text-sm text-gray-400">
          Nova is continuously analyzing your health signals to optimize your training load.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-auto">
        
        <div className="bg-gray-800 p-3 rounded-md border border-gray-750 text-center">
          <div className="text-2xl font-bold text-white mb-1">{totalAdaptationsThisWeek}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">Weekly<br/>Adaptations</div>
        </div>
        
        <div className="bg-gray-800 p-3 rounded-md border border-gray-750 text-center">
          <div className="text-2xl font-bold text-white mb-1">{acceptedCount}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">User<br/>Accepted</div>
        </div>

        <div className="bg-gray-800 p-3 rounded-md border border-gray-750 text-center">
          <div className="text-2xl font-bold text-green-400 mb-1">{successfulCount}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">Successful<br/>Outcomes</div>
        </div>

        <div className="bg-gray-800 p-3 rounded-md border border-gray-750 text-center">
          <div className="text-2xl font-bold text-indigo-400 mb-1">{Math.round(averageConfidence * 100)}%</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">Avg<br/>Confidence</div>
        </div>

      </div>
    </div>
  );
};
