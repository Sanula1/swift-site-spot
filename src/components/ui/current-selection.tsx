import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Building, BookOpen, Truck, ChevronLeft, UserCheck, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useInstituteRole } from '@/hooks/useInstituteRole';

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
  const userRole = useInstituteRole();
  
  // Check if user is InstituteAdmin or Teacher
  const canVerifyStudents = ['InstituteAdmin', 'Teacher'].includes(userRole);
  
  if (!institute && !selectedClass && !subject && !transport) return null;


  const handleVerifyStudentsClick = () => {
    if (institute && selectedClass) {
      navigate(`/institute/${institute.id}/class/${selectedClass.id}/unverified-students`);
    } else if (institute) {
      // Navigate to class selection first if no class selected
      navigate(`/institute/${institute.id}/select-class`);
    }
  };

  return (
    <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-4">
        {/* Header with back button */}
        <div className="flex items-center gap-2 mb-3">
          {onBack && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 shrink-0"
              onClick={onBack}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <p className="text-sm font-medium text-foreground">Current Selection</p>
        </div>
        
        {/* Selection Details */}
        <div className="space-y-3">
          {institute && (
            <div className="flex items-start gap-2">
              <Building className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground font-medium">Institute:</p>
                <p className="text-sm font-medium text-foreground break-words leading-relaxed">
                  {institute.name}
                </p>
              </div>
            </div>
          )}
          
          {selectedClass && (
            <div className="flex items-start gap-2">
              <BookOpen className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground font-medium">Class:</p>
                <p className="text-sm font-medium text-foreground break-words leading-relaxed">
                  {selectedClass.name}
                </p>
              </div>
            </div>
          )}
          
          {subject && (
            <div className="flex items-start gap-2">
              <BookOpen className="h-4 w-4 text-secondary-foreground mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground font-medium">Subject:</p>
                <p className="text-sm font-medium text-foreground break-words leading-relaxed">
                  {subject.name}
                </p>
              </div>
            </div>
          )}
          
          {transport && (
            <div className="flex items-start gap-2">
              <Truck className="h-4 w-4 text-secondary-foreground mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground font-medium">Transport:</p>
                <p className="text-sm font-medium text-foreground break-words leading-relaxed">
                  {transport.vehicleModel}
                </p>
              </div>
            </div>
          )}

          {/* Role Badge */}
          {userRole && (
            <div className="flex items-center gap-2 pt-1">
              <Users className="h-4 w-4 text-muted-foreground shrink-0" />
              <Badge variant="outline" className="text-xs">
                Role: {userRole}
              </Badge>
            </div>
          )}
        </div>

        {/* Navigation Links for InstituteAdmin and Teacher */}
        {showNavigation && canVerifyStudents && institute && selectedClass && (
          <>
            <Separator className="my-4" />
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium mb-2">Quick Actions</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 text-left"
                onClick={handleVerifyStudentsClick}
              >
                <UserCheck className="h-4 w-4 text-primary" />
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
