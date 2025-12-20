import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, CheckCircle, Loader2, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { childAttendanceApi } from '@/api/childAttendance.api';
import { getImageUrl } from '@/utils/imageUrlHelper';

interface LastAttendance {
  instituteCardId: string;
  studentName: string;
  userIdByInstitute: string;
  status: 'present' | 'absent' | 'late';
  timestamp: number;
  imageUrl?: string;
}

const InstituteMarkAttendance = () => {
  const { selectedInstitute, selectedClass, selectedSubject, currentInstituteId } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [instituteCardId, setInstituteCardId] = useState('');
  const [status, setStatus] = useState<'present' | 'absent' | 'late'>('present');
  const [isProcessing, setIsProcessing] = useState(false);
  const [location, setLocation] = useState<string>('');
  const [lastAttendance, setLastAttendance] = useState<LastAttendance | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const inputRef = useRef<HTMLInputElement>(null);
  const clearTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Live clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Build address from current selection
  const buildAddress = () => {
    const parts = [];
    if (selectedInstitute?.name) parts.push(selectedInstitute.name);
    if (selectedClass?.name) parts.push(selectedClass.name);
    if (selectedSubject?.name) parts.push(selectedSubject.name);
    return parts.join(' → ');
  };

  // Get user location
  useEffect(() => {
    const getLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            try {
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
              );
              const data = await response.json();
              setLocation(data.display_name || 'Unknown Location');
            } catch (error) {
              console.error('Error fetching address:', error);
              setLocation('Location detected');
            }
          },
          (error) => {
            console.error('Error getting location:', error);
            setLocation('Gate Scanner - Main Entrance');
          }
        );
      } else {
        setLocation('Gate Scanner - Main Entrance');
      }
    };

    getLocation();
  }, []);

  // Clear last attendance after 1 minute
  useEffect(() => {
    if (lastAttendance) {
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
      }
      clearTimeoutRef.current = setTimeout(() => {
        setLastAttendance(null);
      }, 60000);
    }
    return () => {
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
      }
    };
  }, [lastAttendance]);

  const handleMarkAttendance = async () => {
    if (!instituteCardId.trim()) {
      toast({
        title: "Error",
        description: "Please enter or scan an institute card ID",
        variant: "destructive"
      });
      return;
    }

    if (!currentInstituteId || !selectedInstitute?.name) {
      toast({
        title: "Error",
        description: "Please select an institute first",
        variant: "destructive"
      });
      return;
    }

    // Check for duplicate
    if (lastAttendance && lastAttendance.instituteCardId === instituteCardId.trim()) {
      toast({
        title: "Duplicate Detected",
        description: `Attendance already marked for ${lastAttendance.studentName}`,
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      const request: any = {
        instituteCardId: instituteCardId.trim(),
        instituteId: currentInstituteId.toString(),
        instituteName: selectedInstitute.name,
        address: buildAddress(),
        markingMethod: 'rfid/nfc',
        status: status,
        date: new Date().toISOString().split('T')[0],
        location: location || 'Gate Scanner - Main Entrance'
      };

      if (selectedClass) {
        request.classId = selectedClass.id.toString();
        request.className = selectedClass.name;
      }

      if (selectedSubject) {
        request.subjectId = selectedSubject.id.toString();
        request.subjectName = selectedSubject.name;
      }

      const result = await childAttendanceApi.markAttendanceByInstituteCard(request);

      if (result.success) {
        const studentName = result.name || result.data?.studentName || 'Student';
        const imageUrl = result.imageUrl;
        const userIdByInstitute = result.userIdByInstitute || '';
        
        setLastAttendance({
          instituteCardId: instituteCardId.trim(),
          studentName: studentName,
          userIdByInstitute: userIdByInstitute,
          status: result.status || status,
          timestamp: Date.now(),
          imageUrl: imageUrl || undefined,
        });

        toast({
          title: `✓ ${studentName}`,
          description: `${status.toUpperCase()} - ${new Date().toLocaleTimeString()}`,
        });
        setInstituteCardId('');
        inputRef.current?.focus();
      } else {
        throw new Error(result.message || 'Failed to mark attendance');
      }
    } catch (error) {
      console.error('Attendance marking error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to mark attendance',
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isProcessing) {
      handleMarkAttendance();
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Current Selection Card */}
        <Card className="border-primary/20 bg-card shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Current Selection</p>
            <p className="font-semibold text-foreground">
              Institute: {selectedInstitute?.name || 'Not selected'}
            </p>
            {location && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" />
                {location}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Main Attendance Card */}
        <Card className="border shadow-lg">
          <CardContent className="p-0">
            {/* Date/Time Header */}
            <div className="flex border-b">
              <div className="flex-1 p-4 text-center border-r">
                <p className="text-xs text-muted-foreground mb-1">Date</p>
                <p className="font-semibold text-foreground">
                  {currentTime.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              <div className="flex-1 p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Time</p>
                <p className="font-semibold text-foreground tabular-nums">
                  {currentTime.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </p>
              </div>
            </div>

            {/* Main Content - Two Column Layout */}
            <div className="grid lg:grid-cols-2 gap-0">
              {/* Left Side - Image/Scanner Area */}
              <div className="p-6 lg:p-8 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r">
                {/* Image Placeholder or Student Image */}
                <div className="relative mb-6">
                  {lastAttendance?.imageUrl ? (
                    <div className="relative">
                      <img
                        src={getImageUrl(lastAttendance.imageUrl)}
                        alt={`${lastAttendance.studentName} photo`}
                        className={`h-48 w-48 sm:h-56 sm:w-56 rounded-lg object-cover border-4 shadow-lg ${
                          lastAttendance.status === 'present' 
                            ? 'border-emerald-500' 
                            : lastAttendance.status === 'absent'
                            ? 'border-red-500'
                            : 'border-amber-500'
                        }`}
                      />
                      {/* Status Icon */}
                      <div className={`absolute -bottom-3 -right-3 rounded-full p-2 shadow-lg ${
                        lastAttendance.status === 'present' 
                          ? 'bg-emerald-500' 
                          : lastAttendance.status === 'absent'
                          ? 'bg-red-500'
                          : 'bg-amber-500'
                      }`}>
                        <CheckCircle className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="h-48 w-48 sm:h-56 sm:w-56 border-4 border-red-500 rounded-lg flex items-center justify-center bg-muted/30">
                      <User className="h-20 w-20 text-red-400" />
                    </div>
                  )}
                </div>

                {/* Student Info */}
                {lastAttendance && (
                  <div className="text-center space-y-3">
                    <p className={`text-xl font-bold ${
                      lastAttendance.status === 'present' 
                        ? 'text-emerald-600 dark:text-emerald-400' 
                        : lastAttendance.status === 'absent'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}>
                      {lastAttendance.studentName}
                    </p>
                    <div className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold ${
                      lastAttendance.status === 'present' 
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' 
                        : lastAttendance.status === 'absent'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                    }`}>
                      Status: {lastAttendance.status.toUpperCase()}
                    </div>
                    <div className={`text-sm space-y-1 ${
                      lastAttendance.status === 'present' 
                        ? 'text-emerald-600 dark:text-emerald-400' 
                        : lastAttendance.status === 'absent'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}>
                      <p>Card ID: <span className="font-medium">{lastAttendance.instituteCardId}</span></p>
                      <p>User ID: <span className="font-medium">{lastAttendance.userIdByInstitute}</span></p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Side - Inputs */}
              <div className="p-6 lg:p-8 flex flex-col justify-center space-y-6">
                {/* RFID ID Input */}
                <div className="space-y-2">
                  <Label htmlFor="institute-card-input" className="text-sm font-medium text-foreground">
                    RFID ID
                  </Label>
                  <Input
                    id="institute-card-input"
                    ref={inputRef}
                    type="text"
                    placeholder="Scan or enter RFID ID..."
                    value={instituteCardId}
                    onChange={(e) => setInstituteCardId(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isProcessing}
                    className="h-12 text-base border-2 border-primary focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                    autoFocus
                  />
                </div>

                {/* Status Select */}
                <div className="space-y-2">
                  <Label htmlFor="status-select" className="text-sm font-medium text-foreground">
                    Status
                  </Label>
                  <Select 
                    value={status} 
                    onValueChange={(value: 'present' | 'absent' | 'late') => setStatus(value)}
                    disabled={isProcessing}
                  >
                    <SelectTrigger 
                      id="status-select" 
                      className={`h-12 text-base border-2 ${
                        status === 'present' 
                          ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' 
                          : status === 'absent'
                          ? 'border-red-500 text-red-600 dark:text-red-400'
                          : 'border-amber-500 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present" className="text-emerald-600 dark:text-emerald-400">Present</SelectItem>
                      <SelectItem value="absent" className="text-red-600 dark:text-red-400">Absent</SelectItem>
                      <SelectItem value="late" className="text-amber-600 dark:text-amber-400">Late</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Mark Attendance Button */}
                <Button
                  onClick={handleMarkAttendance}
                  disabled={isProcessing || !instituteCardId.trim()}
                  className="w-full h-14 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Mark Attendance'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InstituteMarkAttendance;
