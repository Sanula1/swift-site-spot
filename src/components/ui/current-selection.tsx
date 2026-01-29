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
  const { setSelectedClass, setSelectedSubject, setSelectedInstitute } = useAuth();
  
  // Check if institute type is tuition_institute
  const isTuitionInstitute = (institute as any)?.type === 'tuition_institute';
  const subjectLabel = isTuitionInstitute ? 'Sub Class For' : 'Subject';
  
  // Check if user is InstituteAdmin or Teacher
  const canVerifyStudents = ['InstituteAdmin', 'Teacher'].includes(userRole);
  
  if (!institute && !selectedClass && !subject && !transport) return null;

  // Determine context-aware back navigation
  const handleContextBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    const path = location.pathname;
    
    // If we have subject selected, go back to class context (subject selection)
    if (subject && selectedClass && institute) {
      setSelectedSubject(null);
      navigate(`/institute/${institute.id}/class/${selectedClass.id}/select-subject`);
      return;
    }
    
    // If we have class selected, go back to institute context (class selection)
    if (selectedClass && institute) {
      setSelectedClass(null);
      navigate(`/institute/${institute.id}/select-class`);
      return;
    }
    
    // If we have institute selected, go back to institute selection
    if (institute) {
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
    if (subject && selectedClass) return 'Back to Subject Selection';
    if (selectedClass) return 'Back to Class Selection';
    if (institute) return 'Back to Institute Selection';
    return 'Back';
  };

  return (
    <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-3 sm:p-4">
        {/* Header with back button */}
        <div className="flex items-center gap-2 mb-2 sm:mb-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 sm:h-8 sm:w-8 shrink-0"
            onClick={handleContextBack}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-foreground">Current Selection</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{getBackLabel()}</p>
          </div>
        </div>
        
        {/* Selection Details */}
        <div className="space-y-2 sm:space-y-3">
          {institute && (
            <div className="flex items-start gap-2">
              <Building className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Institute:</p>
                <p className="text-xs sm:text-sm font-medium text-foreground break-words leading-relaxed line-clamp-2">
                  {institute.name}
                </p>
              </div>
            </div>
          )}
          
          {selectedClass && (
            <div className="flex items-start gap-2">
              <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Class:</p>
                <p className="text-xs sm:text-sm font-medium text-foreground break-words leading-relaxed line-clamp-2">
                  {selectedClass.name}
                </p>
              </div>
            </div>
          )}
          
          {subject && (
            <div className="flex items-start gap-2">
              <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-secondary-foreground mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">{subjectLabel}:</p>
                <p className="text-xs sm:text-sm font-medium text-foreground break-words leading-relaxed line-clamp-2">
                  {subject.name}
                </p>
              </div>
            </div>
          )}
          
          {transport && (
            <div className="flex items-start gap-2">
              <Truck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-secondary-foreground mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Transport:</p>
                <p className="text-xs sm:text-sm font-medium text-foreground break-words leading-relaxed line-clamp-2">
                  {transport.vehicleModel}
                </p>
              </div>
            </div>
          )}

          {/* Role Badge */}
          {userRole && (
            <div className="flex items-center gap-2 pt-1">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
              <Badge variant="outline" className="text-[10px] sm:text-xs">
                {userRole}
              </Badge>
            </div>
          )}
        </div>

        {/* Navigation Links for InstituteAdmin and Teacher */}
        {showNavigation && canVerifyStudents && institute && selectedClass && (
          <>
            <Separator className="my-3 sm:my-4" />
            <div className="space-y-2">
              <p className="text-[10px] sm:text-xs text-muted-foreground font-medium mb-1 sm:mb-2">Quick Actions</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 text-left h-8 sm:h-9 text-xs sm:text-sm"
                onClick={handleVerifyStudentsClick}
              >
                <UserCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                <span>Verify Students</span>
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CurrentSelection;
