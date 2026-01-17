import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Sun,
  Settings as SettingsIcon, 
  Users, 
  LayoutGrid, 
  List,
  Palette,
  Monitor as DisplayIcon,
  UserCircle,
  Mail,
  Phone,
  MapPin,
  Link,
  Save
} from 'lucide-react';

interface ThemeOption {
  value: 'light';
  label: string;
  icon: React.ReactNode;
  description: string;
}

interface MockUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  location: string;
  phone: string;
  avatar?: string;
  lastActive: string;
  status: 'active' | 'inactive';
}

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'card' | 'table'>(() => {
    return (localStorage.getItem('viewMode') as 'card' | 'table') || 'card';
  });
  const [currentTheme] = useState<'light'>('light');
  const [attendanceUrl, setAttendanceUrl] = useState(() => {
    return localStorage.getItem('attendanceUrl') || '';
  });
  const [apiBaseUrl, setApiBaseUrl] = useState(() => {
    return localStorage.getItem('baseUrl') || '';
  });

  const themeOptions: ThemeOption[] = [
    {
      value: 'light',
      label: 'Light Mode',
      icon: <Sun className="h-5 w-5" />,
      description: 'Clean and bright interface'
    }
  ];

  const mockUsers: MockUser[] = [
    {
      id: '1',
      name: 'John Smith',
      email: 'john.smith@company.com',
      role: 'System Administrator',
      department: 'IT',
      location: 'New York',
      phone: '+1-555-0101',
      avatar: '',
      lastActive: '2024-07-13T10:30:00Z',
      status: 'active'
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@company.com',
      role: 'Organization Manager',
      department: 'Operations',
      location: 'California',
      phone: '+1-555-0202',
      avatar: '',
      lastActive: '2024-07-13T09:15:00Z',
      status: 'active'
    },
    {
      id: '3',
      name: 'Michael Chen',
      email: 'michael.chen@company.com',
      role: 'Institute Admin',
      department: 'Education',
      location: 'Texas',
      phone: '+1-555-0303',
      avatar: '',
      lastActive: '2024-07-12T16:45:00Z',
      status: 'active'
    },
    {
      id: '4',
      name: 'Emily Davis',
      email: 'emily.davis@company.com',
      role: 'Teacher',
      department: 'Mathematics',
      location: 'Florida',
      phone: '+1-555-0404',
      avatar: '',
      lastActive: '2024-07-11T14:20:00Z',
      status: 'inactive'
    }
  ];

  const handleThemeChange = () => {
    // Always use light mode
    const root = window.document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
    localStorage.setItem('theme', 'light');
  };

  const handleViewModeChange = (mode: 'card' | 'table') => {
    setViewMode(mode);
    localStorage.setItem('viewMode', mode);
  };

  const handleAttendanceUrlSave = () => {
    localStorage.setItem('attendanceUrl', attendanceUrl);
    toast({
      title: "Settings Saved",
      description: "Attendance backend URL has been updated successfully.",
    });
  };

  const handleApiBaseUrlSave = () => {
    // Ensure URL format is correct
    let formattedUrl = apiBaseUrl;
    if (formattedUrl && !formattedUrl.startsWith('http')) {
      formattedUrl = `http://${formattedUrl}`;
    }
    
    // Remove trailing slash
    if (formattedUrl.endsWith('/')) {
      formattedUrl = formattedUrl.slice(0, -1);
    }
    
    localStorage.setItem('baseUrl', formattedUrl);
    setApiBaseUrl(formattedUrl);
    
    toast({
      title: "Settings Saved", 
      description: "API base URL has been updated successfully.",
    });
  };

  const handleQuickSetPort3000 = () => {
    const url = 'http://localhost:8080';
    setApiBaseUrl(url);
    localStorage.setItem('baseUrl', url);
    
    toast({
      title: "Quick Setup",
      description: "API base URL set to localhost:8080",
    });
  };

  // Initialize theme on component mount
  useEffect(() => {
    handleThemeChange();
  }, []);

  const UserCard = ({ user }: { user: MockUser }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.avatar} />
              <AvatarFallback>
                {user.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{user.name}</CardTitle>
              <Badge variant="outline" className="mt-1">
                {user.role}
              </Badge>
            </div>
          </div>
          <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
            {user.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2 text-sm">
          <div className="flex items-center space-x-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{user.email}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{user.phone}</span>
          </div>
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{user.location}</span>
          </div>
          <div className="flex items-center space-x-2">
            <UserCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{user.department}</span>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground pt-2">
          Last active: {new Date(user.lastActive).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your preferences and customize your experience
        </p>
      </div>

      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Palette className="h-5 w-5" />
            <CardTitle>Appearance</CardTitle>
          </div>
          <CardDescription>
            Customize how the application looks and choose your preferred display mode
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Theme Selection */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Theme Mode</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Application uses light mode for a clean and bright interface
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <Card className="ring-2 ring-primary border-primary">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-full bg-primary text-primary-foreground">
                      <Sun className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Light Mode</div>
                      <div className="text-xs text-muted-foreground">
                        Clean and bright interface
                      </div>
                    </div>
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator />

          {/* View Mode Selection */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Display Mode</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Choose how content is displayed throughout the application
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  viewMode === 'card' 
                    ? 'ring-2 ring-primary border-primary' 
                    : 'hover:border-primary/50'
                }`}
                onClick={() => handleViewModeChange('card')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${
                      viewMode === 'card' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}>
                      <LayoutGrid className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Card View</div>
                      <div className="text-xs text-muted-foreground">
                        Display content in organized cards
                      </div>
                    </div>
                    {viewMode === 'card' && (
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  viewMode === 'table' 
                    ? 'ring-2 ring-primary border-primary' 
                    : 'hover:border-primary/50'
                }`}
                onClick={() => handleViewModeChange('table')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${
                      viewMode === 'table' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}>
                      <List className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Table View</div>
                      <div className="text-xs text-muted-foreground">
                        Display content in structured tables
                      </div>
                    </div>
                    {viewMode === 'table' && (
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Current Selection:</strong> {viewMode === 'card' ? 'Card View' : 'Table View'} - 
                Content will be displayed in {viewMode === 'card' ? 'organized card format' : 'structured table format'} across the application.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backend Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Link className="h-5 w-5" />
            <CardTitle>Backend Configuration</CardTitle>
          </div>
          <CardDescription>
            Configure backend service URLs and connection settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* API Base URL Configuration */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">API Base URL</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Configure the main API endpoint for all services
              </p>
            </div>
            <div className="flex space-x-2">
              <Input
                type="url"
                placeholder="http://localhost:3000"
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleApiBaseUrlSave} variant="outline">
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button onClick={handleQuickSetPort3000} variant="secondary">
                Port 3000
              </Button>
            </div>
            {apiBaseUrl && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Current API URL:</strong> {apiBaseUrl}
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Attendance URL Configuration */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Attendance Backend URL</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Enter the backend URL for attendance services (optional - uses API Base URL if empty)
              </p>
            </div>
            <div className="flex space-x-2">
              <Input
                type="url"
                placeholder="Leave empty to use API Base URL"
                value={attendanceUrl}
                onChange={(e) => setAttendanceUrl(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleAttendanceUrlSave} variant="outline">
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
            {attendanceUrl && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Current Attendance URL:</strong> {attendanceUrl}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Only show users section for non-OrganizationManager roles */}
      {user?.role !== 'OrganizationManager' && (
        <>
          <Separator />

          {/* Users Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <h2 className="text-xl font-semibold">System Users</h2>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === 'card' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleViewModeChange('card')}
                >
                  <LayoutGrid className="h-4 w-4 mr-1" />
                  Cards
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleViewModeChange('table')}
                >
                  <List className="h-4 w-4 mr-1" />
                  Table
                </Button>
              </div>
            </div>

            {viewMode === 'card' ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {mockUsers.map((user) => (
                  <UserCard key={user.id} user={user} />
                ))}
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Users List</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Active</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.avatar} />
                                <AvatarFallback className="text-xs">
                                  {user.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{user.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{user.role}</Badge>
                          </TableCell>
                          <TableCell>{user.department}</TableCell>
                          <TableCell>{user.location}</TableCell>
                          <TableCell>
                            <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                              {user.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(user.lastActive).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Settings;
