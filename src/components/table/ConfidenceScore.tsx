
import React from 'react';
import { cn } from '@/lib/utils';

interface ConfidenceScoreProps {
  score?: number;
}

const ConfidenceScore: React.FC<ConfidenceScoreProps> = ({ score }) => {
  if (score === undefined) return null;
  
  const scorePercent = Math.round(score * 100);
  let color = 'text-finance-red';
  
  if (scorePercent >= 90) {
    color = 'text-finance-green';
  } else if (scorePercent >= 70) {
    color = 'text-finance-yellow';
  } else if (scorePercent >= 50) {
    color = 'text-amber-500';
  }
  
  return (
    <div className="flex items-center gap-1">
      <div className={cn("text-xs font-medium", color)}>
        {scorePercent}%
      </div>
      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full", color.replace('text', 'bg'))} 
          style={{ width: `${scorePercent}%` }}
        />
      </div>
    </div>
  );
};

export default ConfidenceScore;
