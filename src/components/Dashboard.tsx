import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import ClassSelector from './ClassSelector';
import SubjectSelector from './SubjectSelector';
import SubjectDashboard from '@/pages/SubjectDashboard';

import Lectures from './Lectures';
import Results from './Results';
import DataTable from './ui/data-table';
import AdminFilters from './AdminFilters';
import ParentChildrenSelector from './ParentChildrenSelector';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, Calendar, TrendingUp, Award, Clock } from 'lucide-react';
import UnderMaintenance from './UnderMaintenance';

// Mock dashboard data
const mockStats = [{
  title: 'Total Students',
  value: '1,234',
  icon: Users,
  change: '+12%',
  changeType: 'positive'
}, {
  title: 'Active Classes',
  value: '24',
  icon: BookOpen,
  change: '+3',
  changeType: 'positive'
}, {
  title: 'Today\'s Attendance',
  value: '87%',
  icon: Calendar,
  change: '+5%',
  changeType: 'positive'
}, {
  title: 'Average Performance',
  value: '82%',
  icon: Award,
  change: '-2%',
  changeType: 'negative'
}];
const Dashboard = () => {
  const {
    user,
    selectedInstitute,
    selectedClass,
    selectedSubject,
    selectedChild
  } = useAuth();

  const userRole = useInstituteRole(); // CRITICAL: Use institute-specific role
  console.log('🎯 Dashboard - Institute Role:', userRole, 'from instituteUserType:', selectedInstitute?.userRole);

  // Subject-level dashboard - show SubjectDashboard
  if (selectedSubject && selectedClass && selectedInstitute) {
    return <SubjectDashboard />;
  }

  // Special handling for Parent role - child selector
  if (userRole === 'Parent' && !selectedChild) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Select Your Child
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-8">
            Choose a child to view their academic information, attendance, and results.
          </p>
        </div>
        <ParentChildrenSelector />
      </div>
    );
  }

  // For Attendance Markers, show Under Maintenance
  if (userRole === 'AttendanceMarker') {
    return <UnderMaintenance title="Attendance Marker Dashboard" description="Dashboard features are under maintenance. Use the sidebar to navigate to attendance features." />;
  }

  // All other dashboards show Under Maintenance
  return <UnderMaintenance title="Dashboard Under Maintenance" description="We're working on improving the dashboard experience. Please check back later or use the sidebar to navigate to other features." />;
};
export default Dashboard;