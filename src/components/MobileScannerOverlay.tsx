// src/components/MobileScannerOverlay.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, CheckCircle, Scan, QrCode, Barcode, Wifi } from 'lucide-react';
import { AttendanceStatus, ALL_ATTENDANCE_STATUSES, ATTENDANCE_STATUS_CONFIG } from '@/types/attendance.types';

interface MobileScannerOverlayProps {
  isActive: boolean;
  onClose: () => void;
  scanMethod: 'qr' | 'barcode' | 'rfid/nfc';
  status: AttendanceStatus;
  onStatusChange: (status: AttendanceStatus) => void;
  markedCount: number;
  lastMarkedStudent?: { name: string; status: AttendanceStatus } | null;
  showSuccessAnimation?: boolean;
}

const MobileScannerOverlay: React.FC<MobileScannerOverlayProps> = ({
  isActive,
  onClose,
  scanMethod,
  status,
  onStatusChange,
  markedCount,
  lastMarkedStudent,
  showSuccessAnimation
}) => {
  if (!isActive) return null;

  const getMethodIcon = () => {
    switch (scanMethod) {
      case 'qr':
        return <QrCode className="h-5 w-5" />;
      case 'barcode':
        return <Barcode className="h-5 w-5" />;
      case 'rfid/nfc':
        return <Wifi className="h-5 w-5" />;
    }
  };

  return (
    <div className="barcode-scanner-modal fixed inset-0 z-[9999]">
      {/* Top Controls - Safe area aware */}
      <div className="absolute top-0 left-0 right-0 pt-safe-top bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center justify-between p-4">
          {/* Close Button */}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onClose}
            className="bg-black/50 hover:bg-black/70 text-white rounded-full h-12 w-12"
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Title */}
          <div className="flex items-center gap-2 text-white">
            {getMethodIcon()}
            <span className="font-semibold text-lg">
              {scanMethod === 'qr' ? 'QR Scanner' : scanMethod === 'barcode' ? 'Barcode Scanner' : 'RFID/NFC'}
            </span>
          </div>

          {/* Marked Count */}
          <Badge 
            variant="secondary" 
            className="bg-primary text-primary-foreground text-lg px-4 py-2"
          >
            {markedCount}
          </Badge>
        </div>
      </div>

      {/* Center Scanning Frame */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative">
          {/* Scanning frame */}
          <div className="w-64 h-64 sm:w-72 sm:h-72 border-4 border-white/80 rounded-2xl relative">
            {/* Corner indicators */}
            <div className="absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-primary rounded-tl-lg" />
            <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-primary rounded-tr-lg" />
            <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-primary rounded-bl-lg" />
            <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-primary rounded-br-lg" />
            
            {/* Scanning line animation */}
            <div className="absolute left-2 right-2 h-1 bg-primary/70 rounded-full animate-scan-line shadow-lg shadow-primary/50" />
          </div>

          {/* Instructions */}
          <p className="text-white text-center mt-4 text-base font-medium drop-shadow-lg">
            Position {scanMethod === 'qr' ? 'QR code' : 'barcode'} within the frame
          </p>
        </div>
      </div>

      {/* Success Animation Overlay */}
      {showSuccessAnimation && lastMarkedStudent && (
        <div className="absolute inset-0 bg-success/40 backdrop-blur-sm flex items-center justify-center z-[10000] animate-in fade-in duration-200">
          <div className="bg-card rounded-2xl p-8 shadow-2xl max-w-xs mx-4 animate-in zoom-in-95 duration-300">
            <div className="text-center space-y-4">
              <div className="mx-auto w-20 h-20 bg-success rounded-full flex items-center justify-center animate-in zoom-in duration-500">
                <CheckCircle className="h-12 w-12 text-success-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-success mb-2">
                  Attendance Marked!
                </h3>
                <p className="text-lg font-medium text-foreground">
                  {lastMarkedStudent.name}
                </p>
                <Badge 
                  className="mt-3 text-base px-4 py-1" 
                  variant={lastMarkedStudent.status === 'present' ? 'default' : 'secondary'}
                >
                  {ATTENDANCE_STATUS_CONFIG[lastMarkedStudent.status].label}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Controls - Safe area aware */}
      <div className="absolute bottom-0 left-0 right-0 pb-safe-bottom bg-gradient-to-t from-black/70 to-transparent">
        <div className="p-4 space-y-4">
          {/* Status Selector */}
          <div className="flex items-center gap-3">
            <span className="text-white font-medium whitespace-nowrap">Status:</span>
            <Select value={status} onValueChange={(value) => onStatusChange(value as AttendanceStatus)}>
              <SelectTrigger className="flex-1 bg-white/10 border-white/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-[10001]">
                {ALL_ATTENDANCE_STATUSES.map((statusOption) => (
                  <SelectItem key={statusOption} value={statusOption}>
                    {ATTENDANCE_STATUS_CONFIG[statusOption].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Close/Stop Button */}
          <Button 
            variant="destructive" 
            size="lg" 
            className="w-full text-lg py-6"
            onClick={onClose}
          >
            <X className="h-5 w-5 mr-2" />
            Stop Scanning
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MobileScannerOverlay;
