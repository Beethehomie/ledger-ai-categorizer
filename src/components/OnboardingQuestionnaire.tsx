
import React from 'react';
import BusinessContextQuestionnaire, { BusinessContextFormValues } from './business/BusinessContextQuestionnaire';

interface OnboardingQuestionnaireProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: BusinessContextFormValues) => void;
  initialValues?: any;
}

// This component is a wrapper around BusinessContextQuestionnaire for backward compatibility
const OnboardingQuestionnaire: React.FC<OnboardingQuestionnaireProps> = ({
  isOpen,
  onClose,
  onComplete,
  initialValues
}) => {
  return (
    <BusinessContextQuestionnaire
      isOpen={isOpen}
      onClose={onClose}
      onComplete={onComplete}
      initialValues={initialValues}
    />
  );
};

export default OnboardingQuestionnaire;
