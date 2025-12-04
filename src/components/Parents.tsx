import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import MUITable from '@/components/ui/mui-table';
import { Users, RefreshCw, Search, Plus, AlertTriangle, User, MapPin, Phone, Briefcase, Calendar, Home, Filter, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import { type UserRole } from '@/contexts/types/auth.types';
import { useToast } from '@/hooks/use-toast';
import { useTableData } from '@/hooks/useTableData';
import ImagePreviewModal from '@/components/ImagePreviewModal';
import { Occupation, formatOccupation } from '@/types/occupation.types';
import { getImageUrl } from '@/utils/imageUrlHelper';

const Parents = () => {
  const {
    user,
    selectedInstitute,
    selectedClass,
    selectedSubject
  } = useAuth();
  const {
    toast
  } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [imagePreview, setImagePreview] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: '',
    title: ''
  });

  // Filter states
  const [selectedOccupation, setSelectedOccupation] = useState<string>('');
  const [selectedWorkplace, setSelectedWorkplace] = useState<string>('');
  const [enrolledAfter, setEnrolledAfter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [filters, setFilters] = useState({
    instituteId: '',
    name: '',
    phone: '',
    address: ''
  });
  const userRole = useInstituteRole();
  const canViewParents = userRole === 'InstituteAdmin' || userRole === 'Teacher';
  const canCreateParents = userRole === 'InstituteAdmin';

  // Build dynamic endpoint based on selection context
  const getEndpoint = () => {
    if (!selectedInstitute) return '';
    
    let endpoint = `/institute-users/institute/${selectedInstitute.id}/users/PARENT`;
    
    // Add class context if class is selected
    if (selectedClass) {
      endpoint += `/class/${selectedClass.id}`;
      
      // Add subject context if subject is selected
      if (selectedSubject) {
        endpoint += `/subject/${selectedSubject.id}`;
      }
    }
    
    return endpoint;
  };

  // Use the useTableData hook for better data management and pagination
  const tableData = useTableData({
    endpoint: getEndpoint(),
    defaultParams: {
      parent: 'true',
      ...(selectedOccupation && { occupation: selectedOccupation }),
      ...(selectedWorkplace && { workplace: selectedWorkplace }),
      ...(enrolledAfter && { enrolledAfter }),
      ...(sortBy && { sortBy }),
      ...(sortOrder && { sortOrder })
    },
    autoLoad: true,
    pagination: {
      defaultLimit: 50,
      availableLimits: [25, 50, 100]
    },
    dependencies: [selectedOccupation, selectedWorkplace, enrolledAfter, sortBy, sortOrder, selectedClass?.id, selectedSubject?.id]
  });

  // Table columns configuration
  const columns = [{
    id: 'imageUrl',
    label: 'Avatar',
    minWidth: 80,
    align: 'center' as const,
    format: (value: string, row: any) => (
      <div 
        className="cursor-pointer flex justify-center"
        onClick={() => {
          if (value) {
            setImagePreview({ 
              isOpen: true, 
              url: value, 
              title: row.name 
            });
          }
        }}
      >
      <Avatar className="h-10 w-10 md:h-12 md:w-12 lg:h-14 lg:w-14 hover:opacity-80 transition-opacity border-2 border-border">
          <AvatarImage src={getImageUrl(value)} alt={row.name} className="object-cover" />
          <AvatarFallback className="bg-muted">
            <User className="h-5 w-5 md:h-6 md:w-6" />
          </AvatarFallback>
        </Avatar>
      </div>
    )
  }, {
    id: 'name',
    label: 'Name',
    minWidth: 150,
    format: (value: string) => <div className="font-medium text-sm md:text-base">
          {value}
        </div>
  }, {
    id: 'phoneNumber',
    label: 'Phone',
    minWidth: 130,
    format: (value: string) => <div className="text-sm flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          {value || 'Not specified'}
        </div>
  }, {
    id: 'dateOfBirth',
    label: 'Date of Birth',
    minWidth: 120,
    format: (value: string) => <div className="text-sm flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {value ? new Date(value).toLocaleDateString() : 'Not specified'}
        </div>
  }, {
    id: 'addressLine1',
    label: 'Address',
    minWidth: 200,
    format: (value: string, row: any) => <div className="text-sm flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <div>
            <div>{value || 'Not specified'}</div>
            {row.addressLine2 && <div className="text-xs text-muted-foreground">{row.addressLine2}</div>}
          </div>
        </div>
  }, {
    id: 'occupation',
    label: 'Occupation',
    minWidth: 130,
    format: (value: string, row: any) => <div className="text-sm">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            {value || 'Not specified'}
          </div>
          {row.workPlace && <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
              <Home className="h-3 w-3" />
              {row.workPlace}
            </div>}
        </div>
  }];

  // Filter data based on search term and filters
  const filteredData = tableData.state.data.filter(parent => {
    // Search term filter
    const matchesSearch = !searchTerm.trim() || 
      parent.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      parent.addressLine1?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      parent.addressLine2?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      parent.occupation?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      parent.workPlace?.toLowerCase().includes(searchTerm.toLowerCase());

    // Additional filters
    const matchesInstituteId = !filters.instituteId.trim() || parent.userIdByInstitute?.toLowerCase().includes(filters.instituteId.toLowerCase());
    const matchesName = !filters.name.trim() || parent.name?.toLowerCase().includes(filters.name.toLowerCase());
    const matchesPhone = !filters.phone.trim() || parent.phoneNumber?.toLowerCase().includes(filters.phone.toLowerCase());
    const matchesAddress = !filters.address.trim() || 
      parent.addressLine1?.toLowerCase().includes(filters.address.toLowerCase()) || 
      parent.addressLine2?.toLowerCase().includes(filters.address.toLowerCase());
    
    return matchesSearch && matchesInstituteId && matchesName && matchesPhone && matchesAddress;
  });

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      instituteId: '',
      name: '',
      phone: '',
      address: ''
    });
    setSelectedOccupation('');
    setSelectedWorkplace('');
    setEnrolledAfter('');
    setSortBy('name');
    setSortOrder('ASC');
    setSearchTerm('');
  };

  // Access control check
  if (!canViewParents) {
    return <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
        <p className="text-muted-foreground">
          You don't have permission to view parents. Only Institute Admins and Teachers can access this section.
        </p>
      </div>;
  }

  // Selection requirement check
  if (!selectedInstitute) {
    return <div className="flex flex-col items-center justify-center h-64 text-center">
        <Users className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Selection Required</h3>
        <p className="text-muted-foreground">
          Please select an institute to view parents.
        </p>
      </div>;
  }
  return <div className="h-screen flex flex-col p-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 md:w-8 md:h-8" />
            Institute Parents
          </h1>
          <div className="text-sm md:text-base text-muted-foreground">
            <p>
              Institute: <span className="font-medium">{selectedInstitute.name}</span>
              {selectedClass && <> • Class: <span className="font-medium">{selectedClass.name}</span></>}
              {selectedSubject && <> • Subject: <span className="font-medium">{selectedSubject.name}</span></>}
            </p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          {/* Occupation Filter */}
          <Select value={selectedOccupation} onValueChange={setSelectedOccupation}>
            <SelectTrigger className="w-full sm:w-[220px] bg-background">
              <SelectValue placeholder="Filter by Occupation" />
            </SelectTrigger>
            <SelectContent className="bg-popover max-h-[300px]">
              <SelectItem value="all" className="hover:bg-accent">All Occupations</SelectItem>
              {Object.values(Occupation).map((occupation) => (
                <SelectItem key={occupation} value={occupation} className="hover:bg-accent">
                  {formatOccupation(occupation)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedOccupation && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedOccupation('')}
              className="w-full sm:w-auto"
            >
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>
          )}
          
          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-4 h-4" />
                More Filters
                {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
          
          <Button onClick={() => tableData.actions.refresh()} disabled={tableData.state.loading} variant="outline" size="sm" className="w-full sm:w-auto">
            <RefreshCw className={`w-4 h-4 mr-2 ${tableData.state.loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4">
        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <CollapsibleContent>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base">Advanced Filters</CardTitle>
                  <Button variant="outline" size="sm" onClick={clearFilters} className="text-xs">
                    Clear All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Institute ID</label>
                    <Input placeholder="Filter by Institute ID..." value={filters.instituteId} onChange={e => setFilters(prev => ({
                    ...prev,
                    instituteId: e.target.value
                  }))} />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input placeholder="Filter by name..." value={filters.name} onChange={e => setFilters(prev => ({
                    ...prev,
                    name: e.target.value
                  }))} />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone</label>
                    <Input placeholder="Filter by phone..." value={filters.phone} onChange={e => setFilters(prev => ({
                    ...prev,
                    phone: e.target.value
                  }))} />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Address</label>
                    <Input placeholder="Filter by address..." value={filters.address} onChange={e => setFilters(prev => ({
                    ...prev,
                    address: e.target.value
                  }))} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Workplace</label>
                    <Input 
                      placeholder="Filter by workplace..." 
                      value={selectedWorkplace} 
                      onChange={e => setSelectedWorkplace(e.target.value)} 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Enrolled After</label>
                    <Input 
                      type="date"
                      placeholder="Filter by enrollment date..." 
                      value={enrolledAfter} 
                      onChange={e => setEnrolledAfter(e.target.value)} 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sort By</label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sort by..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="occupation">Occupation</SelectItem>
                        <SelectItem value="workplace">Workplace</SelectItem>
                        <SelectItem value="dateOfBirth">Date of Birth</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sort Order</label>
                    <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as 'ASC' | 'DESC')}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sort order..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="ASC">Ascending</SelectItem>
                        <SelectItem value="DESC">Descending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Parents MUI Table - Full Height */}
      <div className="flex-1 min-h-0">
        <MUITable title="Institute Parents" columns={columns} data={filteredData} page={tableData.pagination.page} rowsPerPage={tableData.pagination.limit} totalCount={tableData.pagination.totalCount} onPageChange={tableData.actions.setPage} onRowsPerPageChange={tableData.actions.setLimit} rowsPerPageOptions={tableData.availableLimits} allowAdd={false} allowEdit={false} allowDelete={false} />
      </div>

      <ImagePreviewModal
        isOpen={imagePreview.isOpen}
        onClose={() => setImagePreview({ isOpen: false, url: '', title: '' })}
        imageUrl={imagePreview.url}
        title={imagePreview.title}
      />
    </div>;
};
export default Parents;