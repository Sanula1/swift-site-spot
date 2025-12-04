import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import ClassSelector from './ClassSelector';
import SubjectSelector from './SubjectSelector';

import Lectures from './Lectures';
import Results from './Results';
import DataTable from './ui/data-table';
import AdminFilters from './AdminFilters';
import ParentChildrenSelector from './ParentChildrenSelector';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, Calendar, TrendingUp, Award, Clock } from 'lucide-react';

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

  // Special handling for Parent role
  if (userRole === 'Parent') {
    // If no child selected, show child selector with dashboard styling
    if (!selectedChild) {
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
    
    // If child is selected, show child dashboard with attendance and results
    return (
      <div className="space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Parent Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Viewing information for: <span className="font-semibold">{(selectedChild as any).name}</span>
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {mockStats.map((stat, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </div>
                <p className={`text-xs ${stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.change} from last month
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions for Parent */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Child's Recent Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Attendance marked - Mathematics
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      2 hours ago
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      New exam result published
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Yesterday
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Homework submission due
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Tomorrow
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  onClick={() => window.location.href = '#child-attendance'}
                >
                  <Calendar className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Attendance
                  </span>
                </button>
                <button 
                  className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                  onClick={() => window.location.href = '#child-results'}
                >
                  <Award className="h-6 w-6 text-green-600 mx-auto mb-1" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Results
                  </span>
                </button>
                <button className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
                  <BookOpen className="h-6 w-6 text-purple-600 mx-auto mb-1" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Homework
                  </span>
                </button>
                <button className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-center hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors">
                  <Users className="h-6 w-6 text-orange-600 mx-auto mb-1" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Teachers
                  </span>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // For Attendance Markers, show dashboard
  if (userRole === 'AttendanceMarker') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Welcome, Attendance Marker!</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Use the sidebar to navigate to attendance features.</p>
      </div>
    );
  }

  // System Admin gets direct dashboard with admin filters
  if (user?.role === 'SystemAdmin') {
    return <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            System Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Welcome back, {user?.name}! Manage all system resources.
          </p>
        </div>

        {/* Admin Filters for System Admin */}
        <AdminFilters />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {mockStats.map((stat, index) => <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </div>
                <p className={`text-xs ${stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.change} from last month
                </p>
              </CardContent>
            </Card>)}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Recent Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      New student enrollment
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      2 minutes ago
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Attendance marked for Grade 10
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      15 minutes ago
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Exam results published
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      1 hour ago
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <button className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                  <Users className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Users
                  </span>
                </button>
                <button className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                  <Calendar className="h-6 w-6 text-green-600 mx-auto mb-1" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Attendance
                  </span>
                </button>
                <button className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
                  <BookOpen className="h-6 w-6 text-purple-600 mx-auto mb-1" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Classes
                  </span>
                </button>
                <button className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-center hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors">
                  <Award className="h-6 w-6 text-orange-600 mx-auto mb-1" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Results
                  </span>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>;
  }

  // Subject-level dashboard - Enhanced UI
  if (selectedSubject && selectedClass && selectedInstitute) {
    return (
      <div className="space-y-6">
        {/* Subject Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{selectedSubject.name}</h1>
              <p className="text-blue-100 mb-4">{selectedSubject.description || 'No description available'}</p>
              <div className="flex flex-wrap gap-3">
                <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg">
                  <span className="text-sm">Code: {selectedSubject.code}</span>
                </div>
                <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg">
                  <span className="text-sm">Credits: {selectedSubject.creditHours || 0}</span>
                </div>
                <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg">
                  <span className="text-sm">{selectedSubject.category || 'General'}</span>
                </div>
              </div>
            </div>
            <BookOpen className="h-16 w-16 text-white/30" />
          </div>
        </div>

        {/* Subject Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Lectures
              </CardTitle>
              <BookOpen className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">24</div>
              <p className="text-xs text-green-600">+3 this week</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Active Homework
              </CardTitle>
              <Calendar className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">5</div>
              <p className="text-xs text-yellow-600">2 due soon</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Avg. Attendance
              </CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">89%</div>
              <p className="text-xs text-green-600">+2% from last month</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Class Average
              </CardTitle>
              <Award className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">78%</div>
              <p className="text-xs text-green-600">+5% improvement</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions for Subject */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Recent Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      New lecture uploaded
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">1 hour ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Homework submitted by 23 students
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">3 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Exam scheduled for next week
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Yesterday</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all hover:scale-105"
                  onClick={() => {
                    const event = new CustomEvent('navigate', { detail: { page: 'lectures' }});
                    window.dispatchEvent(event);
                  }}
                >
                  <BookOpen className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Lectures</span>
                </button>
                <button 
                  className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center hover:bg-green-100 dark:hover:bg-green-900/30 transition-all hover:scale-105"
                  onClick={() => {
                    const event = new CustomEvent('navigate', { detail: { page: 'homework' }});
                    window.dispatchEvent(event);
                  }}
                >
                  <Calendar className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Homework</span>
                </button>
                <button 
                  className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all hover:scale-105"
                  onClick={() => {
                    const event = new CustomEvent('navigate', { detail: { page: 'exams' }});
                    window.dispatchEvent(event);
                  }}
                >
                  <Award className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Exams</span>
                </button>
                <button 
                  className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-center hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-all hover:scale-105"
                  onClick={() => {
                    const event = new CustomEvent('navigate', { detail: { page: 'results' }});
                    window.dispatchEvent(event);
                  }}
                >
                  <TrendingUp className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Results</span>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // For other roles, always show main dashboard content here.
  return <div className="space-y-6">

      <div>
        
        
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {mockStats.map((stat, index) => <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stat.value}
              </div>
              <p className={`text-xs ${stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                {stat.change} from last month
              </p>
            </CardContent>
          </Card>)}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Recent Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    New student enrollment
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    2 minutes ago
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Attendance marked for Grade 10
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    15 minutes ago
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Exam results published
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    1 hour ago
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <button className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                <Users className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Students
                </span>
              </button>
              <button className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                <Calendar className="h-6 w-6 text-green-600 mx-auto mb-1" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Attendance
                </span>
              </button>
              <button className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
                <BookOpen className="h-6 w-6 text-purple-600 mx-auto mb-1" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Classes
                </span>
              </button>
              <button className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-center hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors">
                <Award className="h-6 w-6 text-orange-600 mx-auto mb-1" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Results
                </span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>;
};
export default Dashboard;