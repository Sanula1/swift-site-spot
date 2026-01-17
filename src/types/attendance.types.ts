// ============= ATTENDANCE STATUS TYPES =============
// Enhanced attendance system with 6 statuses including departure tracking

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'left' | 'left_early' | 'left_lately';

// Status display configuration for consistent UI across all components
export const ATTENDANCE_STATUS_CONFIG: Record<AttendanceStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  badgeVariant: 'default' | 'destructive' | 'secondary' | 'outline';
}> = {
  present: {
    label: 'Present',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
    icon: '✓',
    badgeVariant: 'default'
  },
  absent: {
    label: 'Absent',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-500/10 border-red-500/20',
    icon: '✗',
    badgeVariant: 'destructive'
  },
  late: {
    label: 'Late',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/20',
    icon: '⏰',
    badgeVariant: 'secondary'
  },
  left: {
    label: 'Left',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/20',
    icon: '→',
    badgeVariant: 'secondary'
  },
  left_early: {
    label: 'Left Early',
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-500/10 border-pink-500/20',
    icon: '⏰→',
    badgeVariant: 'secondary'
  },
  left_lately: {
    label: 'Left Late',
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-500/10 border-indigo-500/20',
    icon: '🕐→',
    badgeVariant: 'secondary'
  }
};

// Extended summary interface with new departure fields
export interface AttendanceSummary {
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalLeft: number;
  totalLeftEarly: number;
  totalLeftLately: number;
  attendanceRate: number;
}

// Helper function to get status config with fallback
export const getAttendanceStatusConfig = (status: string) => {
  const normalizedStatus = status?.toLowerCase() as AttendanceStatus;
  return ATTENDANCE_STATUS_CONFIG[normalizedStatus] || ATTENDANCE_STATUS_CONFIG.present;
};

// Helper to normalize summary with defaults for backward compatibility
export const normalizeAttendanceSummary = (summary: Partial<AttendanceSummary> | undefined): AttendanceSummary => {
  return {
    totalPresent: summary?.totalPresent || 0,
    totalAbsent: summary?.totalAbsent || 0,
    totalLate: summary?.totalLate || 0,
    totalLeft: summary?.totalLeft || 0,
    totalLeftEarly: summary?.totalLeftEarly || 0,
    totalLeftLately: summary?.totalLeftLately || 0,
    attendanceRate: summary?.attendanceRate || 0
  };
};

// All available statuses for selectors
export const ALL_ATTENDANCE_STATUSES: AttendanceStatus[] = [
  'present',
  'absent', 
  'late',
  'left',
  'left_early',
  'left_lately'
];

// Chart colors for visualization
export const ATTENDANCE_CHART_COLORS = {
  present: '#10b981',
  absent: '#ef4444',
  late: '#f59e0b',
  left: '#8b5cf6',
  left_early: '#ec4899',
  left_lately: '#6366f1'
};
