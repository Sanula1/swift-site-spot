import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Camera, QrCode, UserCheck, CheckCircle, MapPin, X, BarChart3, Smartphone, AlertCircle, Loader2, Wifi } from 'lucide-react';
import jsQR from 'jsqr';
import { childAttendanceApi, MarkAttendanceByCardRequest, MarkAttendanceRequest } from '@/api/childAttendance.api';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import { buildAttendanceAddress } from '@/utils/attendanceAddress';
import { AttendanceStatus, ALL_ATTENDANCE_STATUSES, ATTENDANCE_STATUS_CONFIG } from '@/types/attendance.types';

interface AttendanceAlert {
  id: string;
  type: 'success' | 'error';
  studentName?: string;
  studentId?: string;
  status?: AttendanceStatus;
  message: string;
  timestamp: Date;
}

const QRAttendance = () => {
  const { selectedInstitute, selectedClass, selectedSubject, currentInstituteId, user } = useAuth();
  const instituteRole = useInstituteRole();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [studentId, setStudentId] = useState('');
  const [markedCount, setMarkedCount] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number; address: string } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [status, setStatus] = useState<AttendanceStatus>('present');
  const [attendanceAlerts, setAttendanceAlerts] = useState<AttendanceAlert[]>([]);
  const [showMethodDialog, setShowMethodDialog] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'qr' | 'barcode' | 'rfid/nfc'>('qr');
  const [studentImagesMap, setStudentImagesMap] = useState<Map<string, string>>(new Map());
  const [isManualProcessing, setIsManualProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check if user has permission - InstituteAdmin, Teacher, and AttendanceMarker can mark attendance
  const hasPermission = ['InstituteAdmin', 'Teacher', 'AttendanceMarker'].includes(instituteRole);

  // Fetch students to get their images
  useEffect(() => {
    const fetchStudents = async () => {
      if (!currentInstituteId) return;
      
      try {
        const baseUrl = localStorage.getItem('baseUrl') || '';
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        
        const response = await fetch(
          `${baseUrl}/institute-users/institute/${currentInstituteId}/users/STUDENT?page=1&limit=500`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          const studentsData = data.data || [];
          
          // Create a map of studentId -> imageUrl
          const imagesMap = new Map<string, string>();
          studentsData.forEach((student: any) => {
            if (student.id && student.imageUrl) {
              imagesMap.set(student.id.toString(), student.imageUrl);
            }
          });
          
          setStudentImagesMap(imagesMap);
          console.log('📸 Loaded student images for', imagesMap.size, 'students');
        }
      } catch (error) {
        console.error('Failed to fetch student images:', error);
      }
    };
    
    fetchStudents();
  }, [currentInstituteId]);

  useEffect(() => {
    fetchLocation();

    return () => {
      stopCamera();
    };
  }, [selectedInstitute]);

  // Auto remove alerts after 1.25 seconds
  useEffect(() => {
    if (attendanceAlerts.length > 0) {
      const timer = setTimeout(() => {
        setAttendanceAlerts(prev => prev.slice(1));
      }, 1250);
      return () => clearTimeout(timer);
    }
  }, [attendanceAlerts]);

  const addAlert = (alert: Omit<AttendanceAlert, 'id' | 'timestamp'>) => {
    const newAlert: AttendanceAlert = {
      ...alert,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    // Clear all previous alerts and show only the new one
    setAttendanceAlerts([newAlert]);
  };

  const removeAlert = (id: string) => {
    setAttendanceAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const fetchLocation = async () => {
    setLocationLoading(true);
    console.log('Fetching location...');
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          console.log('GPS coordinates:', { latitude, longitude });
          
          try {
            const address = await reverseGeocode(latitude, longitude);
            setLocation({ latitude, longitude, address });
            console.log('Location set:', { latitude, longitude, address });
          } catch (error) {
            console.log('Reverse geocoding failed, using coordinates');
            const address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            setLocation({ latitude, longitude, address });
          }
          setLocationLoading(false);
        },
        (error) => {
          console.log('Location access error:', error);
          setLocation(null);
          setLocationLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    } else {
      console.log('Geolocation not supported');
      setLocation(null);
      setLocationLoading(false);
    }
  };

  const reverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
      const data = await response.json();
      
      if (data && data.display_name) {
        return data.display_name;
      }
      throw new Error('No address found');
    } catch (error) {
      console.log('Reverse geocoding failed:', error);
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
  };

  const generateAddress = (): string => {
    let address = selectedInstitute?.name || 'Unknown Institute';
    address += ' - Gate Scanner - Main Entrance';
    return address;
  };

  const startCameraWithMethod = () => {
    setShowMethodDialog(true);
  };

  const startCameraForMethod = async (method: 'qr' | 'barcode' | 'rfid/nfc') => {
    setSelectedMethod(method);
    setShowMethodDialog(false);
    
    // Navigate to RFID page if RFID/NFC is selected
    if (method === 'rfid/nfc') {
      // Build context-aware URL for RFID attendance
      let rfidUrl = '/rfid-attendance';
      if (currentInstituteId) {
        rfidUrl = `/institute/${currentInstituteId}`;
        if (selectedClass?.id) {
          rfidUrl += `/class/${selectedClass.id}`;
          if (selectedSubject?.id) {
            rfidUrl += `/subject/${selectedSubject.id}`;
          }
        }
        rfidUrl += '/rfid-attendance';
      }
      navigate(rfidUrl);
      return;
    }
    
    setIsScanning(true);
    
    // Wait for video element to be rendered
    setTimeout(() => {
      startCamera();
    }, 100);
  };

  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    
    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationRef.current = requestAnimationFrame(scanQRCode);
      return;
    }

    // Set canvas to optimal size for better QR detection
    const width = video.videoWidth;
    const height = video.videoHeight;
    
    canvas.width = width;
    canvas.height = height;
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0, width, height);

    // Get image data for QR detection
    const imageData = context.getImageData(0, 0, width, height);
    
    // Enhanced QR detection with better options for close-up codes
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert"
    });

    if (code && code.data.trim()) {
      console.log('🎯 QR/Barcode detected:', code.data);
      console.log('📍 Detection location:', code.location);
      
      // Mark attendance but continue scanning immediately
      handleMarkAttendanceByCard(code.data.trim());
    }

    // Always continue scanning for continuous detection
    animationRef.current = requestAnimationFrame(scanQRCode);
  };

  const startCamera = async () => {
    try {
      console.log('🎥 Starting camera for QR/Barcode scanning...');
      setCameraError(null);
      
      if (!videoRef.current || !canvasRef.current) {
        console.log('❌ Video or canvas element not found, retrying...');
        setTimeout(() => startCamera(), 200);
        return;
      }

      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // Stop any existing animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      console.log('🔐 Requesting camera permissions...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;

      console.log('✅ Camera permissions granted');

      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        const video = videoRef.current!;
        
        const onLoadedMetadata = () => {
          video.removeEventListener('loadedmetadata', onLoadedMetadata);
          console.log('📹 Video metadata loaded:', {
            width: video.videoWidth,
            height: video.videoHeight
          });
          resolve();
        };

        video.addEventListener('loadedmetadata', onLoadedMetadata);
        
        setTimeout(() => {
          video.removeEventListener('loadedmetadata', onLoadedMetadata);
          reject(new Error('Video failed to load metadata'));
        }, 10000);
      });

      // Start playing video
      await videoRef.current.play();
      
      // Start QR scanning loop
      scanQRCode();
      
      setIsScanning(true);
      setCameraError(null);
      console.log('🎉 Camera and QR scanner started successfully!');

      addAlert({
        type: 'success',
        message: `📱 Camera active! Point at QR codes or barcodes to scan automatically`
      });

    } catch (error) {
      console.error('❌ Camera start error:', error);
      let errorMessage = error instanceof Error ? error.message : 'Unknown camera error';
      
      // Provide user-friendly error messages
      if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
        errorMessage = '🚫 Camera access denied. Please allow camera permissions and reload the page.';
      } else if (errorMessage.includes('NotFoundError')) {
        errorMessage = '📷 No camera found on this device.';
      } else if (errorMessage.includes('NotReadableError')) {
        errorMessage = '📱 Camera is busy. Please close other apps using the camera and try again.';
      } else if (errorMessage.includes('Video failed to load')) {
        errorMessage = '⏱️ Camera took too long to start. Please try again or reload the page.';
      }
      
      setCameraError(errorMessage);
      setIsScanning(false);
      
      addAlert({
        type: 'error',
        message: errorMessage
      });
    }
  };

  const stopCamera = () => {
    try {
      console.log('🛑 Stopping camera...');
      
      // Stop animation frame
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      
      // Stop media stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // Clear video source
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      setIsScanning(false);
      setCameraError(null);
      console.log('✅ Camera stopped successfully');
      
      addAlert({
        type: 'success',
        message: '📱 Camera stopped'
      });
    } catch (error) {
      console.error('❌ Error stopping camera:', error);
    }
  };

  const handleMarkAttendanceByCard = async (studentCardId: string) => {
    console.log('🎯 ATTENDANCE MARKING STARTED');
    console.log('📝 Scanned Code:', studentCardId);
    console.log('🏫 Institute:', selectedInstitute?.name);
    console.log('📍 Location:', location?.address);
    console.log('⚙️ Method:', selectedMethod);
    console.log('✅ Status:', status);

    if (!studentCardId.trim() || !currentInstituteId || !selectedInstitute?.name) {
      console.log('❌ VALIDATION FAILED: Missing required information');
      addAlert({
        type: 'error',
        message: '⚠️ Missing information - ensure student code and institute are selected'
      });
      // Scanner continues automatically - no need to restart
      return;
    }

    // Location is optional - continue without it

    try {
      const address = buildAttendanceAddress({
        instituteName: selectedInstitute.name,
        className: selectedClass?.name,
        subjectName: selectedSubject?.name,
        location: location?.address,
      });

      const request: MarkAttendanceByCardRequest = {
        studentCardId: studentCardId.trim(),
        instituteId: currentInstituteId,
        instituteName: selectedInstitute.name,
        address,
        markingMethod: selectedMethod,
        status: status
      };

      // Include class data if selected
      if (selectedClass) {
        request.classId = selectedClass.id;
        request.className = selectedClass.name;
      }

      // Include subject data if selected
      if (selectedSubject) {
        request.subjectId = selectedSubject.id;
        request.subjectName = selectedSubject.name;
      }

      console.log('📤 Sending attendance request...');
      console.log('📋 Request:', JSON.stringify(request, null, 2));

      const result = await childAttendanceApi.markAttendanceByCard(request);

      if (result.success) {
        const responseData = (result as any).data || result;
        const studentName = responseData.studentName || (result as any).studentName || 'Student';
        const studentIdFromResponse = responseData.studentId || studentCardId.trim();
        const imageUrl = responseData.imageUrl || (result as any).imageUrl || studentImagesMap.get(studentIdFromResponse);
        const dateStr = responseData.date ? new Date(responseData.date).toLocaleDateString() : new Date().toLocaleDateString();
        const timeStr = responseData.time || new Date().toLocaleTimeString();
        const attendanceStatus = responseData.status || request.status;
        
        toast({
          title: attendanceStatus === 'present' ? 'Attendance Marked ✓' : 'Attendance Marked',
          description: `${studentName} - ${attendanceStatus.toUpperCase()} - ${dateStr} ${timeStr}`,
          isAttendanceAlert: true,
          imageUrl: imageUrl,
          status: attendanceStatus,
        });
        setMarkedCount(prev => prev + 1);
        
        console.log('🎉 SUCCESS: Attendance marked!');
        console.log('📝 Attendance ID:', result.attendanceId);
        console.log('🔄 Action:', result.action);

        addAlert({
          type: 'success',
          studentName: result.name || `Student ${studentCardId.trim()}`,
          studentId: studentCardId.trim(),
          status: result.status,
          message: `🎉 ${result.name || `Student ${studentCardId.trim()}`} marked as ${result.status.toUpperCase()}`
        });
        
      } else {
        console.log('❌ API returned failure');
        console.log('🚫 Error:', result.message);
        throw new Error(result.message || 'Failed to mark attendance');
      }
    } catch (error) {
      console.error('❌ ATTENDANCE MARKING ERROR');
      console.error('💥 Error:', error);
      
      let errorMessage = 'Failed to mark attendance';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      addAlert({
        type: 'error',
        message: `❌ ${errorMessage}`
      });

      // Resume scanning after error immediately
      if (isScanning && videoRef.current && canvasRef.current) {
        console.log('🔄 Continuing scanner after error...');
        // Scanner continues automatically - no need to restart
      }
    }
  };

  const handleManualMarkAttendance = async () => {
    console.log('=== HANDLE MANUAL ATTENDANCE START ===');
    console.log('Input Student ID:', studentId);
    console.log('Current Institute ID:', currentInstituteId);
    console.log('Selected Institute:', selectedInstitute?.name);
    console.log('Current Location:', location);
    console.log('Selected Status:', status);
    console.log('=====================================');

    if (!studentId.trim() || !currentInstituteId || !selectedInstitute?.name) {
      console.log('❌ VALIDATION FAILED: Missing student ID or institute information');
      addAlert({
        type: 'error',
        message: 'Please enter student ID and ensure institute is selected'
      });
      return;
    }

    // Location is optional

    setIsManualProcessing(true);
    try {
      const selectionPath = [selectedInstitute.name, selectedClass?.name, selectedSubject?.name]
        .filter(Boolean)
        .join(' → ');
      const address = location ? `${selectionPath} - ${location.address}` : selectionPath;

      const request: MarkAttendanceRequest = {
        studentId: studentId.trim(),
        instituteId: currentInstituteId,
        instituteName: selectedInstitute.name,
        address,
        markingMethod: 'manual',
        status: status
      };

      // Only include class data if a class is selected
      if (selectedClass) {
        request.classId = selectedClass.id;
        request.className = selectedClass.name;
      }

      // Only include subject data if a subject is selected
      if (selectedSubject) {
        request.subjectId = selectedSubject.id;
        request.subjectName = selectedSubject.name;
      }

      console.log('=== PREPARING MANUAL ATTENDANCE REQUEST ===');
      console.log('Request Object:', JSON.stringify(request, null, 2));
      console.log('Request Details:');
      console.log('- Student ID:', request.studentId);
      console.log('- Institute ID:', request.instituteId);
      console.log('- Institute Name:', request.instituteName);
      console.log('- Class ID:', request.classId);
      console.log('- Class Name:', request.className);
      console.log('- Subject ID:', request.subjectId);
      console.log('- Subject Name:', request.subjectName);
      console.log('- Address:', request.address);
      console.log('- Marking Method:', request.markingMethod);
      console.log('- Status:', request.status);
      console.log('About to call API...');
      console.log('=========================================');

      const result = await childAttendanceApi.markAttendance(request);

      if (result.success) {
        const responseData = (result as any).data || result;
        const studentName = responseData.studentName || (result as any).studentName || (result as any).name || 'Student';
        const studentIdFromResponse = responseData.studentId || studentId;
        const imageUrl = responseData.imageUrl || (result as any).imageUrl || studentImagesMap.get(studentIdFromResponse);
        const dateStr = responseData.date ? new Date(responseData.date).toLocaleDateString() : new Date().toLocaleDateString();
        const timeStr = responseData.time || new Date().toLocaleTimeString();
        const attendanceStatus = responseData.status || status;
        
        toast({
          title: "✓ Attendance Marked Successfully",
          description: `${studentName} - Status: ${attendanceStatus.toUpperCase()} - Date: ${dateStr} - Time: ${timeStr}${selectedInstitute?.name ? ` - ${selectedInstitute.name}` : ''}`,
          isAttendanceAlert: true,
          imageUrl: imageUrl,
          status: attendanceStatus,
        });
        const previousCount = markedCount;
        setMarkedCount(prev => prev + 1);
        setStudentId('');
        
        console.log('✅ SUCCESS: Manual attendance marked successfully');
        console.log('Student ID:', studentId);
        console.log('Attendance ID:', result.attendanceId);
        console.log('Previous Count:', previousCount);
        console.log('New Count:', previousCount + 1);
        console.log('Input field cleared');

        setTimeout(() => {
          console.log('🎯 Focusing on input field for next entry');
          inputRef.current?.focus();
        }, 100);
      } else {
        console.log('❌ API returned success: false');
        console.log('Error message:', result.message);
        throw new Error(result.message || 'Failed to mark attendance');
      }
    } catch (error) {
      const selectionPath = [selectedInstitute.name, selectedClass?.name, selectedSubject?.name]
        .filter(Boolean)
        .join(' → ');

      const requestForLog: MarkAttendanceRequest = {
        studentId: studentId.trim(),
        instituteId: currentInstituteId,
        instituteName: selectedInstitute.name,
        address: location ? `${selectionPath} - ${location.address}` : selectionPath,
        markingMethod: 'manual',
        status: status
      };

      // Only include class data if a class is selected
      if (selectedClass) {
        requestForLog.classId = selectedClass.id;
        requestForLog.className = selectedClass.name;
      }

      // Only include subject data if a subject is selected
      if (selectedSubject) {
        requestForLog.subjectId = selectedSubject.id;
        requestForLog.subjectName = selectedSubject.name;
      }
      
      console.error('=== MANUAL ATTENDANCE ERROR ===');
      console.error('Error occurred during manual attendance marking');
      console.error('Error details:', error);
      console.error('Original request:', JSON.stringify(requestForLog, null, 2));
      console.error('============================');
      addAlert({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to mark attendance'
      });
    } finally {
      setIsManualProcessing(false);
    }
  };

  const handleBack = () => {
    stopCamera();
    window.history.back();
  };

  if (!hasPermission) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-medium mb-2">Access Denied</h3>
            <p className="text-muted-foreground">
              You don't have permission to mark attendance. This feature is available for Institute Admins, Teachers, and Attendance Markers.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!selectedInstitute) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-medium mb-2">Institute Selection Required</h3>
            <p className="text-muted-foreground">
              Please select an institute first to mark attendance.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-background">
      {/* Attendance Alerts */}
      <div className="fixed top-4 left-4 z-50 space-y-2 max-w-sm">
        {attendanceAlerts.map((alert) => (
          <Alert 
            key={alert.id}
            className={`shadow-lg animate-in slide-in-from-left-5 ${
              alert.type === 'success' 
                ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center ${
                alert.type === 'success' ? 'bg-green-100 dark:bg-green-800' : 'bg-red-100 dark:bg-red-800'
              }`}>
                {alert.type === 'success' ? (
                  <CheckCircle className={`h-5 w-5 ${alert.type === 'success' ? 'text-green-600 dark:text-green-200' : 'text-red-600 dark:text-red-200'}`} />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-200" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className={`text-sm font-semibold ${
                    alert.type === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                  }`}>
                    {alert.type === 'success' ? 'Success' : 'Error'}
                  </h4>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => removeAlert(alert.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <AlertDescription className={`${
                  alert.type === 'success' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                } mt-1`}>
                  <div className="text-sm">{alert.message}</div>
                  {alert.studentName && (
                    <div className="text-xs mt-1 flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        {alert.status}
                      </Badge>
                      <span className="opacity-75">
                        {alert.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </AlertDescription>
              </div>
            </div>
          </Alert>
        ))}
      </div>

      <div className="container mx-auto p-4 space-y-4 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">QR Scanner</h1>
            <p className="text-muted-foreground text-sm">
              Scan QR codes to mark student attendance
            </p>
          </div>
        </div>

        {/* Current Selection Card */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100 text-lg">
              <QrCode className="h-5 w-5" />
              Current Selection
            </CardTitle>
          </CardHeader>
           <CardContent className="space-y-3">
             <div>
               <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Institute</p>
               <p className="text-blue-900 dark:text-blue-100">{selectedInstitute?.name}</p>
             </div>
             
             {location && (
               <div className="flex items-start gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg">
                 <MapPin className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                 <div className="flex-1 min-w-0">
                   <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Location</p>
                   <p className="text-xs text-blue-700 dark:text-blue-300 break-words">
                     {selectedInstitute?.name ? `${selectedInstitute.name} - ` : ''}{location.address}
                   </p>
                 </div>
               </div>
             )}
           </CardContent>
        </Card>

        {/* Stats Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Today's Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">{markedCount}</p>
                <p className="text-sm text-muted-foreground">Marked</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{status}</p>
                <p className="text-sm text-muted-foreground">Current Status</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{selectedMethod.toUpperCase()}</p>
                <p className="text-sm text-muted-foreground">Method</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* QR Scanner Section - Made Much Bigger */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Camera className="h-7 w-7" />
              Scan QR
            </CardTitle>
            <CardDescription className="text-lg">
              Position code within the frame
            </CardDescription>
          </CardHeader>
           <CardContent className="space-y-6">
             {!isScanning ? (
               <div className="space-y-6">
                 <div className="space-y-4">
                   <div>
                     <p className="text-sm font-medium mb-2">Status</p>
                     <Select value={status} onValueChange={(value) => setStatus(value as AttendanceStatus)}>
                       <SelectTrigger className="w-full">
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent className="bg-white dark:bg-gray-800 z-50">
                          {ALL_ATTENDANCE_STATUSES.map((statusOption) => (
                            <SelectItem key={statusOption} value={statusOption}>
                              {ATTENDANCE_STATUS_CONFIG[statusOption].label}
                            </SelectItem>
                          ))}
                       </SelectContent>
                     </Select>
                   </div>
                 </div>
                 
                 <div className="text-center py-16">
                   <Camera className="h-20 w-20 mx-auto mb-6 text-muted-foreground" />
                   <p className="text-xl font-medium mb-3">Ready to Scan</p>
                   <p className="text-muted-foreground mb-8 text-lg">Start camera to begin scanning QR codes</p>
                   <Button 
                     onClick={startCameraWithMethod} 
                     className="w-full max-w-sm text-lg py-6"
                     size="lg"
                   >
                     <Camera className="h-6 w-6 mr-3" />
                     Start Camera
                   </Button>
                 </div>
               </div>
             ) : (
               <div className="space-y-4 sm:space-y-6">
                 {/* Status Selector while scanning */}
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                    <p className="text-sm font-medium mb-2">Status</p>
                    <Select value={status} onValueChange={(value) => setStatus(value as AttendanceStatus)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800 z-50">
                         {ALL_ATTENDANCE_STATUSES.map((statusOption) => (
                           <SelectItem key={statusOption} value={statusOption}>
                             {ATTENDANCE_STATUS_CONFIG[statusOption].label}
                           </SelectItem>
                         ))}
                      </SelectContent>
                    </Select>
                  </div>
                 
                 {/* Mobile Responsive Camera View */}
                  <div className="relative w-full h-[70vh] sm:h-[500px] md:h-[600px] lg:h-[700px] bg-black rounded-lg sm:rounded-2xl overflow-hidden shadow-2xl">
                   <video
                     ref={videoRef}
                     className="w-full h-full object-cover"
                     playsInline
                     muted
                   />
                   <canvas
                     ref={canvasRef}
                     className="hidden"
                   />
                   {cameraError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="text-center text-white p-4 sm:p-8">
                        <AlertCircle className="h-8 w-8 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-6" />
                        <p className="text-base sm:text-xl">{cameraError}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Mobile Responsive Scanning Overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      {/* Mobile: smaller frame, Desktop: larger frame */}
                      <div className="w-56 h-56 sm:w-72 sm:h-72 md:w-80 md:h-80 lg:w-96 lg:h-96 border-2 sm:border-4 border-white/70 rounded-2xl sm:rounded-3xl shadow-lg">
                        {/* Corner indicators - responsive sizes */}
                        <div className="absolute -top-1 -left-1 sm:-top-2 sm:-left-2 w-6 h-6 sm:w-12 sm:h-12 border-t-4 border-l-4 sm:border-t-8 sm:border-l-8 border-white rounded-tl-2xl sm:rounded-tl-3xl"></div>
                        <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-6 h-6 sm:w-12 sm:h-12 border-t-4 border-r-4 sm:border-t-8 sm:border-r-8 border-white rounded-tr-2xl sm:rounded-tr-3xl"></div>
                        <div className="absolute -bottom-1 -left-1 sm:-bottom-2 sm:-left-2 w-6 h-6 sm:w-12 sm:h-12 border-b-4 border-l-4 sm:border-b-8 sm:border-l-8 border-white rounded-bl-2xl sm:rounded-bl-3xl"></div>
                        <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 w-6 h-6 sm:w-12 sm:h-12 border-b-4 border-r-4 sm:border-b-8 sm:border-r-8 border-white rounded-br-2xl sm:rounded-br-3xl"></div>
                        
                        {/* Center crosshair - responsive sizes */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                          <div className="w-4 h-0.5 sm:w-8 sm:h-1 bg-white/90 rounded-full"></div>
                          <div className="w-0.5 h-4 sm:w-1 sm:h-8 bg-white/90 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Instruction text - responsive positioning and sizing */}
                    <div className="absolute bottom-4 sm:bottom-8 left-0 right-0 text-center px-4">
                      <div className="bg-black/70 text-white px-3 py-2 sm:px-6 sm:py-3 rounded-lg sm:rounded-xl mx-auto max-w-fit">
                        <p className="text-sm sm:text-lg font-medium">Position QR code within the frame</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center px-4">
                  <Button 
                    onClick={stopCamera} 
                    variant="outline" 
                    size="lg"
                    className="w-full sm:w-auto sm:min-w-[250px] text-base sm:text-lg py-4 sm:py-6"
                  >
                    Stop Camera
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manual Entry - Separate section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Manual Entry
            </CardTitle>
            <CardDescription>
              Enter student ID manually
            </CardDescription>
          </CardHeader>
           <CardContent className="space-y-4">
             <div className="space-y-4">
               <div>
                 <p className="text-sm font-medium mb-2">Status</p>
                 <Select value={status} onValueChange={(value) => setStatus(value as AttendanceStatus)}>
                   <SelectTrigger className="w-full">
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent className="bg-white dark:bg-gray-800 z-50">
                      {ALL_ATTENDANCE_STATUSES.map((statusOption) => (
                        <SelectItem key={statusOption} value={statusOption}>
                          {ATTENDANCE_STATUS_CONFIG[statusOption].label}
                        </SelectItem>
                      ))}
                   </SelectContent>
                 </Select>
               </div>
               
               <div className="space-y-2">
                 <Input
                   ref={inputRef}
                   placeholder="Enter Student ID"
                   value={studentId}
                   onChange={(e) => setStudentId(e.target.value)}
                   onKeyPress={(e) => {
                     if (e.key === 'Enter') {
                       handleManualMarkAttendance();
                     }
                   }}
                 />
               </div>
             </div>
             
              <Button 
                onClick={handleManualMarkAttendance}
                className="w-full"
                disabled={!studentId.trim() || isManualProcessing}
                size="lg"
              >
                {isManualProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <UserCheck className="h-5 w-5 mr-2" />
                    Mark Attendance
                  </>
                )}
              </Button>
           </CardContent>
        </Card>
      </div>

      {/* Method Selection Dialog */}
      <Dialog open={showMethodDialog} onOpenChange={setShowMethodDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sky-500">Select Scanning Method</DialogTitle>
            <DialogDescription className="text-sky-400">
              Choose the type of code you want to scan
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3">
            <Button 
              onClick={() => startCameraForMethod('qr')}
              variant="outline"
              className="justify-start h-auto p-4"
            >
              <QrCode className="h-8 w-8 mr-3" />
              <div className="text-left">
                <div className="font-medium">QR Code</div>
                <div className="text-sm text-muted-foreground">Scan QR codes</div>
              </div>
            </Button>
            <Button 
              onClick={() => startCameraForMethod('barcode')}
              variant="outline"
              className="justify-start h-auto p-4"
            >
              <BarChart3 className="h-8 w-8 mr-3" />
              <div className="text-left">
                <div className="font-medium">Barcode</div>
                <div className="text-sm text-muted-foreground">Scan barcodes</div>
              </div>
            </Button>
            <Button 
              onClick={() => startCameraForMethod('rfid/nfc')}
              variant="outline"
              className="justify-start h-auto p-4"
            >
              <Smartphone className="h-8 w-8 mr-3" />
              <div className="text-left">
                <div className="font-medium">RFID/NFC</div>
                <div className="text-sm text-muted-foreground">Scan RFID or NFC tags</div>
              </div>
            </Button>
            <Button 
              onClick={() => {
                setShowMethodDialog(false);
                const instituteId = currentInstituteId || selectedInstitute?.id;
                if (instituteId) {
                  navigate(`/institute/${instituteId}/institute-mark-attendance`);
                }
              }}
              variant="outline"
              className="justify-start h-auto p-4"
            >
              <Wifi className="h-8 w-8 mr-3" />
              <div className="text-left">
                <div className="font-medium">Institute Card (RFID/NFC)</div>
                <div className="text-sm text-muted-foreground">Mark attendance using institute RFID cards</div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
  );
};

export default QRAttendance;