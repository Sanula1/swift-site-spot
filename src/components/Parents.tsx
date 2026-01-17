import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import MUITable from '@/components/ui/mui-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, RefreshCw, Search, Plus, AlertTriangle, User, MapPin, Phone, Briefcase, Calendar, Home, Filter, ChevronDown, ChevronUp, X, Eye, GraduationCap, Mail, Check, ChevronsUpDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import { type UserRole } from '@/contexts/types/auth.types';
import { useToast } from '@/hooks/use-toast';
import { useTableData } from '@/hooks/useTableData';
import ImagePreviewModal from '@/components/ImagePreviewModal';
import CurrentSelection from '@/components/ui/current-selection';
import { SafeImage } from '@/components/ui/SafeImage';
import { Occupation, formatOccupation } from '@/types/occupation.types';
import { getImageUrl } from '@/utils/imageUrlHelper';
import { cn } from '@/lib/utils';

// Searchable Occupation Combobox Component
const OccupationCombobox = ({
  value,
  onValueChange
}: {
  value: string;
  onValueChange: (value: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const occupations = useMemo(() => {
    return Object.values(Occupation).map(occ => ({
      value: occ,
      label: formatOccupation(occ)
    }));
  }, []);
  const filteredOccupations = useMemo(() => {
    if (!searchQuery) return occupations;
    return occupations.filter(occ => occ.label.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [occupations, searchQuery]);
  return <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full sm:w-[250px] justify-between bg-background">
          {value && value !== 'all' ? formatOccupation(value) : "Filter by Occupation"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search occupation..." value={searchQuery} onValueChange={setSearchQuery} />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>No occupation found.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="all" onSelect={() => {
              onValueChange('all');
              setOpen(false);
              setSearchQuery('');
            }}>
                <Check className={cn("mr-2 h-4 w-4", value === 'all' ? "opacity-100" : "opacity-0")} />
                All Occupations
              </CommandItem>
              {filteredOccupations.map(occupation => <CommandItem key={occupation.value} value={occupation.label} onSelect={() => {
              onValueChange(occupation.value);
              setOpen(false);
              setSearchQuery('');
            }}>
                  <Check className={cn("mr-2 h-4 w-4", value === occupation.value ? "opacity-100" : "opacity-0")} />
                  {occupation.label}
                </CommandItem>)}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>;
};
const Parents = () => {
  const {
    user,
    selectedInstitute,
    selectedClass
  } = useAuth();
  const {
    toast
  } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [imagePreview, setImagePreview] = useState<{
    isOpen: boolean;
    url: string;
    title: string;
  }>({
    isOpen: false,
    url: '',
    title: ''
  });
  const [childrenDialog, setChildrenDialog] = useState<{
    isOpen: boolean;
    parent: any;
    children: any[];
  }>({
    isOpen: false,
    parent: null,
    children: []
  });

  // Filter states
  const [selectedOccupation, setSelectedOccupation] = useState<string>('');
  const [selectedWorkplace, setSelectedWorkplace] = useState<string>('');
  const [enrolledAfter, setEnrolledAfter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [includeStudentInfo, setIncludeStudentInfo] = useState(true);
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
    }

    // IMPORTANT: Parents page should NOT be subject-specific.
    return endpoint;
  };

  // Use the useTableData hook for better data management and pagination
  const tableData = useTableData({
    endpoint: getEndpoint(),
    defaultParams: {
      students: String(includeStudentInfo),
      ...(selectedOccupation && selectedOccupation !== 'all' && {
        occupation: selectedOccupation
      }),
      ...(selectedWorkplace && {
        workplace: selectedWorkplace
      }),
      ...(enrolledAfter && {
        enrolledAfter
      }),
      ...(sortBy && {
        sortBy
      }),
      ...(sortOrder && {
        sortOrder
      })
    },
    autoLoad: true,
    pagination: {
      defaultLimit: 50,
      availableLimits: [25, 50, 100]
    },
    dependencies: [selectedOccupation, selectedWorkplace, enrolledAfter, sortBy, sortOrder, selectedClass?.id, includeStudentInfo]
  });

  // Table columns configuration
  const columns = [{
    id: 'imageUrl',
    label: 'Avatar',
    minWidth: 80,
    align: 'center' as const,
    format: (value: string, row: any) => <div className="cursor-pointer flex justify-center" onClick={() => {
      if (value) {
        setImagePreview({
          isOpen: true,
          url: value,
          title: row.name
        });
      }
    }}>
      <Avatar className="h-10 w-10 md:h-12 md:w-12 lg:h-14 lg:w-14 hover:opacity-80 transition-opacity border-2 border-border">
          <AvatarImage src={getImageUrl(value)} alt={row.name} className="object-cover" />
          <AvatarFallback className="bg-muted">
            <User className="h-5 w-5 md:h-6 md:w-6" />
          </AvatarFallback>
        </Avatar>
      </div>
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
  },
  // Children column - only shown when includeStudentInfo is true - Modern UI
  ...(includeStudentInfo ? [{
    id: 'students',
    label: 'Children',
    minWidth: 200,
    align: 'center' as const,
    format: (value: any[], row: any) => {
      const children = value || row.children || [];
      return <div className="flex items-center justify-center gap-3">
          {/* Children count with gradient badge */}
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {children.slice(0, 3).map((child: any, idx: number) => {
                const rawImageUrl =
                  child?.instituteUserImageUrl ||
                  child?.profileImageUrl ||
                  child?.imageUrl ||
                  child?.user?.imageUrl;

                return (
                  <Avatar key={idx} className="h-8 w-8 border-2 border-background ring-2 ring-primary/20">
                    <AvatarImage src={getImageUrl(rawImageUrl)} alt={child.name} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/40 text-xs font-medium">
                      {child.name?.charAt(0) || 'C'}
                    </AvatarFallback>
                  </Avatar>
                );
              })}
              {children.length > 3 && <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                  +{children.length - 3}
                </div>}
            </div>
            <Badge variant="secondary" className="text-xs font-semibold bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-primary border border-primary/20">
              {children.length} {children.length === 1 ? 'Child' : 'Children'}
            </Badge>
          </div>
          
          {/* View button with modern styling */}
          {children.length > 0 && <Button variant="outline" size="sm" onClick={() => setChildrenDialog({
          isOpen: true,
          parent: row,
          children
        })} className="h-8 px-3 bg-gradient-to-r from-blue-500/5 to-purple-500/5 hover:from-blue-500/10 hover:to-purple-500/10 border-primary/20 hover:border-primary/40 transition-all duration-200 shadow-sm hover:shadow">
              <Eye className="h-4 w-4 mr-1.5 text-primary" />
              <span className="font-medium">View Details</span>
            </Button>}
        </div>;
    }
  }] : [])];

  // Filter data based on search term and filters
  const filteredData = tableData.state.data.filter(parent => {
    // Search term filter
    const matchesSearch = !searchTerm.trim() || parent.name?.toLowerCase().includes(searchTerm.toLowerCase()) || parent.addressLine1?.toLowerCase().includes(searchTerm.toLowerCase()) || parent.addressLine2?.toLowerCase().includes(searchTerm.toLowerCase()) || parent.occupation?.toLowerCase().includes(searchTerm.toLowerCase()) || parent.workPlace?.toLowerCase().includes(searchTerm.toLowerCase());

    // Additional filters
    const matchesInstituteId = !filters.instituteId.trim() || parent.userIdByInstitute?.toLowerCase().includes(filters.instituteId.toLowerCase());
    const matchesName = !filters.name.trim() || parent.name?.toLowerCase().includes(filters.name.toLowerCase());
    const matchesPhone = !filters.phone.trim() || parent.phoneNumber?.toLowerCase().includes(filters.phone.toLowerCase());
    const matchesAddress = !filters.address.trim() || parent.addressLine1?.toLowerCase().includes(filters.address.toLowerCase()) || parent.addressLine2?.toLowerCase().includes(filters.address.toLowerCase());
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
    setIncludeStudentInfo(false);
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
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto items-center">
          {/* Occupation Filter - Searchable Combobox */}
          <OccupationCombobox value={selectedOccupation} onValueChange={setSelectedOccupation} />

          {selectedOccupation && selectedOccupation !== 'all' && <Button variant="ghost" size="sm" onClick={() => setSelectedOccupation('')} className="w-full sm:w-auto">
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>}

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

      <div className="mb-4">
        <CurrentSelection
          institute={{ id: selectedInstitute.id, name: selectedInstitute.name }}
          class={selectedClass ? { id: selectedClass.id, name: selectedClass.name } : undefined}
        />
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
                    <Input placeholder="Filter by workplace..." value={selectedWorkplace} onChange={e => setSelectedWorkplace(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Enrolled After</label>
                    <Input type="date" placeholder="Filter by enrollment date..." value={enrolledAfter} onChange={e => setEnrolledAfter(e.target.value)} />
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
                    <Select value={sortOrder} onValueChange={value => setSortOrder(value as 'ASC' | 'DESC')}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sort order..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="ASC">Ascending</SelectItem>
                        <SelectItem value="DESC">Descending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Include Children Info</label>
                    <div className="flex items-center space-x-2 h-10 px-3 border rounded-md bg-background">
                      <Checkbox id="includeStudentInfoFilter" checked={includeStudentInfo} onCheckedChange={checked => setIncludeStudentInfo(checked === true)} />
                      <Label htmlFor="includeStudentInfoFilter" className="text-sm cursor-pointer">
                        Show Children Details
                      </Label>
                    </div>
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

      <ImagePreviewModal isOpen={imagePreview.isOpen} onClose={() => setImagePreview({
      isOpen: false,
      url: '',
      title: ''
    })} imageUrl={imagePreview.url} title={imagePreview.title} />

      {/* Children Details Dialog */}
      <Dialog open={childrenDialog.isOpen} onOpenChange={open => !open && setChildrenDialog({
      isOpen: false,
      parent: null,
      children: []
    })}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Children of {childrenDialog.parent?.name}
            </DialogTitle>
            <DialogDescription>
              {childrenDialog.children.length} {childrenDialog.children.length === 1 ? 'child' : 'children'} found
            </DialogDescription>
          </DialogHeader>
          
          {childrenDialog.children.length > 0 ? <Table>
              <TableHeader>
                  <TableRow>
                    <TableHead>Photo</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Relationship</TableHead>
                    <TableHead>Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {childrenDialog.children.map((child: any, index: number) => {
              const rawImageUrl =
                child?.instituteUserImageUrl ||
                child?.profileImageUrl ||
                child?.imageUrl ||
                child?.user?.imageUrl;
              const imageSrc = rawImageUrl ? getImageUrl(rawImageUrl) : '';
              return <TableRow key={child.userId || index}>
                        <TableCell>
                          <button type="button" className={cn('group inline-flex', imageSrc ? 'cursor-pointer' : 'cursor-default')} onClick={() => {
                    if (!imageSrc) return;
                    setImagePreview({
                      isOpen: true,
                      url: imageSrc,
                      title: child.name
                    });
                  }} aria-label={imageSrc ? `Open ${child.name} photo` : `${child.name} photo unavailable`}>
                            <div className="h-14 w-14 rounded-xl overflow-hidden border border-border bg-muted shadow-sm transition-transform group-hover:scale-105">
                              <SafeImage src={imageSrc} alt={`${child.name} student photo`} className="h-full w-full object-cover" fallback={<div className="h-full w-full grid place-items-center text-muted-foreground">
                                    <User className="h-6 w-6" />
                                  </div>} />
                            </div>
                          </button>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {child.studentId || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{child.name || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-primary border border-primary/20">
                            {child.relationshipType || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {child.phoneNumber || 'N/A'}
                          </div>
                        </TableCell>
                      </TableRow>;
            })}
                </TableBody>
            </Table> : <div className="text-center py-8 text-muted-foreground">
              No children information available
            </div>}
        </DialogContent>
      </Dialog>
    </div>;
};
export default Parents;