import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Building, BookOpen, Truck, ChevronLeft, UserCheck, Users } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import { useAuth } from '@/contexts/AuthContext';
interface CurrentSelectionProps {
  institute?: {
    id: string;
    name: string;
  };
  class?: {
    id: string;
    name: string;
  };
  subject?: {
    id: string;
    name: string;
  };
  transport?: {
    id: string;
    vehicleModel: string;
  };
  onBack?: () => void;
  showNavigation?: boolean;
}
const CurrentSelection: React.FC<CurrentSelectionProps> = ({
  institute,
  class: selectedClass,
  subject,
  transport,
  onBack,
  showNavigation = true
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = useInstituteRole();
  const {
    setSelectedClass,
    setSelectedSubject,
    setSelectedInstitute
  } = useAuth();

  // Check if institute type is tuition_institute
  const isTuitionInstitute = (institute as any)?.type === 'tuition_institute';
  const subjectLabel = isTuitionInstitute ? 'Sub Class For' : 'Subject';

  // Check if user is InstituteAdmin or Teacher
  const canVerifyStudents = ['InstituteAdmin', 'Teacher'].includes(userRole);
  if (!institute && !selectedClass && !subject && !transport) return null;

  // Determine the current step for better context
  const getCurrentStep = () => {
    if (subject) return 'subject';
    if (selectedClass) return 'class';
    if (institute) return 'institute';
    return 'none';
  };

  // Determine context-aware back navigation
  const handleContextBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    const currentStep = getCurrentStep();

    // If we have subject selected, go back to subject selection (clear subject)
    if (currentStep === 'subject' && selectedClass && institute) {
      setSelectedSubject(null);
      navigate(`/institute/${institute.id}/class/${selectedClass.id}/select-subject`);
      return;
    }

    // If we have class selected, go back to class selection (clear class)
    if (currentStep === 'class' && institute) {
      setSelectedClass(null);
      navigate(`/institute/${institute.id}/select-class`);
      return;
    }

    // If we have institute selected, go back to institute selection (clear institute)
    if (currentStep === 'institute') {
      setSelectedInstitute(null);
      navigate('/select-institute');
      return;
    }

    // Default: go back in history
    navigate(-1);
  };
  const handleVerifyStudentsClick = () => {
    if (institute && selectedClass) {
      navigate(`/institute/${institute.id}/class/${selectedClass.id}/unverified-students`);
    } else if (institute) {
      // Navigate to class selection first if no class selected
      navigate(`/institute/${institute.id}/select-class`);
    }
  };

  // Get back button label based on current context
  const getBackLabel = () => {
    const currentStep = getCurrentStep();
    if (currentStep === 'subject') return 'Change Subject';
    if (currentStep === 'class') return 'Change Class';
    if (currentStep === 'institute') return 'Change Institute';
    return 'Back';
  };

  // Get the description of what back action will do
  const getBackDescription = () => {
    const currentStep = getCurrentStep();
    if (currentStep === 'subject') return 'Go to subject selection';
    if (currentStep === 'class') return 'Go to class selection';
    if (currentStep === 'institute') return 'Go to institute selection';
    return 'Go back';
  };
  return;
};
export default CurrentSelection;