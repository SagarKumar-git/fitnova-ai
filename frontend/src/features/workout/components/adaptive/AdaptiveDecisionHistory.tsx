import React, { useState } from 'react';
import type { AdaptiveDecisionRecord } from '../../intelligence/repository/IAdaptiveDecisionRepository';
import { AdaptiveConfidenceBadge } from './AdaptiveConfidenceBadge';
import { AdaptiveOutcomeCard } from './AdaptiveOutcomeCard';

interface Props {
  decisions: AdaptiveDecisionRecord[];
}

export const AdaptiveDecisionHistory: React.FC<Props> = ({ decisions }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (decisions.length === 0) {
    return (
      <div className="text-gray-400 text-sm italic">
        No adaptive decisions recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {decisions.map((decision) => {
        const isExpanded = expandedId === decision.decisionId;
        const confLevel = 
            decision.confidence > 0.8 ? 'VERY_HIGH' :
            decision.confidence > 0.6 ? 'HIGH' :
            decision.confidence > 0.4 ? 'MODERATE' : 'LOW';
            
        return (
          <div key={decision.decisionId} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            {/* Header / Summary */}
            <button 
              type="button"
              aria-expanded={isExpanded}
              aria-label={`Toggle decision details for ${decision.decisionType.replace('_', ' ')}`}
              className="w-full p-4 cursor-pointer hover:bg-gray-750 transition-colors flex justify-between items-center text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              onClick={() => setExpandedId(isExpanded ? null : decision.decisionId)}
            >
              <div>
                <div className="flex items-center space-x-3 mb-1">
                  <span className="font-semibold text-gray-200">
                    {decision.decisionType.replace('_', ' ')}
                  </span>
                  <AdaptiveConfidenceBadge confidenceLevel={confLevel} />
                </div>
                <div className="text-sm text-gray-400 flex items-center space-x-2">
                  <span>{new Date(decision.timestamp).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>Action: {decision.userAction}</span>
                </div>
              </div>
              <div className="text-gray-400" aria-hidden="true">
                {isExpanded ? '▲' : '▼'}
              </div>
            </button>

            {/* Expanded Details */}
            {isExpanded && (
              <div className="p-4 border-t border-gray-700 bg-gray-800/50">
                <div className="grid grid-cols-3 gap-4 mb-4 text-sm text-center">
                  <div className="bg-gray-900 p-3 rounded">
                    <div className="text-gray-500 mb-1">Original Plan</div>
                    <div className="text-gray-300">
                       {decision.originalWorkoutPlan.weight}kg × {decision.originalWorkoutPlan.reps}
                    </div>
                  </div>
                  <div className="flex items-center justify-center text-gray-500">
                    →
                  </div>
                  <div className="bg-gray-900 p-3 rounded border border-indigo-500/30">
                    <div className="text-indigo-400 mb-1">Adaptive Plan</div>
                    <div className="text-gray-200 font-medium">
                       {decision.adaptiveWorkoutPlan.weight}kg × {decision.adaptiveWorkoutPlan.reps}
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Reasons</h4>
                  <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                    {decision.reasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
                
                {decision.resultingWorkoutOutcome && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Outcome</h4>
                    <AdaptiveOutcomeCard outcome={decision.resultingWorkoutOutcome} />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
