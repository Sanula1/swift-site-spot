import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getImageUrl } from '@/utils/imageUrlHelper';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DataCardView } from '@/components/ui/data-card-view';
import { useAuth } from '@/contexts/AuthContext';
import { PlusIcon, PencilIcon, TrashIcon, SearchIcon, EyeIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from '@/components/ui/badge';
import CreateInstituteForm from '@/components/forms/CreateInstituteForm';
import { enhancedCachedClient } from '@/api/enhancedCachedClient';
import { CACHE_TTL } from '@/config/cacheTTL';
import { useInstituteRole } from '@/hooks/useInstituteRole';

const Institutes = () => {
  const [institutes, setInstitutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('true');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedInstitute, setSelectedInstitute] = useState<any>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Mobile view toggle state
  const [mobileViewMode, setMobileViewMode] = useState<'table' | 'card'>('card');

  const itemsPerPage = 10;

  const getBaseUrl = () => {
    return localStorage.getItem('baseUrl') || '';
  };

  const fetchInstitutes = async (page: number = 1, search: string = '', isActive: string = 'true', forceRefresh = false) => {
    try {
      console.log('Loading institutes data...');
      setLoading(true);
      setError(null);
      
      const userRole = useInstituteRole();
      const params: Record<string, any> = {
        page: page.toString(),
        limit: itemsPerPage.toString(),
        search: search,
      };
      
      // Only add isActive filter if it's not 'all'
      if (isActive !== 'all') {
        params.isActive = isActive;
      }
      
      // Use enhanced cached client
      const data = await enhancedCachedClient.get(
        '/institutes',
        params,
        {
          ttl: CACHE_TTL.INSTITUTES,
          forceRefresh,
          userId: user?.id,
          role: userRole
        }
      );

      if (!data || (Array.isArray(data) && data.length === 0)) {
        setInstitutes([]);
        setTotalPages(1);
        toast({
          title: "No Institutes Found",
          description: "No institutes found according to the current filter.",
          variant: "default",
        });
        return;
      }

      console.log('Institutes data:', data);
      
      if (data.data && Array.isArray(data.data)) {
        setInstitutes(data.data);
        setTotalPages(data.meta?.totalPages || 1);
      } else if (Array.isArray(data)) {
        setInstitutes(data);
        setTotalPages(Math.ceil(data.length / itemsPerPage));
      } else {
        console.error('Unexpected data format:', data);
        setInstitutes([]);
      }
    } catch (error) {
      console.error('Error loading institutes:', error);
      setError('Failed to load institutes. Please try again.');
      toast({
        title: "Error",
        description: "Failed to load institutes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchInstituteById = async (id: string, forceRefresh = false) => {
    try {
      console.log('Fetching institute by ID:', id);
      const userRole = useInstituteRole();
      
      // Use enhanced cached client
      const data = await enhancedCachedClient.get(
        `/institutes/${id}`,
        {},
        {
          ttl: CACHE_TTL.INSTITUTE_DETAILS,
          forceRefresh,
          userId: user?.id,
          role: userRole,
          instituteId: id
        }
      );

      return data;
      return data;
    } catch (error) {
      console.error('Error fetching institute by ID:', error);
      throw error;
    }
  };

  // Removed automatic API call - users must click Refresh to load data

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleActiveFilterChange = (value: string) => {
    setIsActiveFilter(value);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleCreateInstitute = async (instituteData: any) => {
    try {
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/institutes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(instituteData),
      });

      if (!response.ok) {
        throw new Error('Failed to create institute');
      }

      toast({
        title: "Success",
        description: "Institute created successfully",
      });

      await fetchInstitutes(currentPage, searchTerm, isActiveFilter);
      setShowCreateDialog(false);
    } catch (error) {
      console.error('Error creating institute:', error);
      toast({
        title: "Error",
        description: "Failed to create institute. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditInstitute = async (id: string) => {
    try {
      console.log('Editing institute with ID:', id);
      const instituteData = await fetchInstituteById(id);
      setSelectedInstitute(instituteData);
      setShowEditDialog(true);
    } catch (error) {
      console.error('Error fetching institute for edit:', error);
      toast({
        title: "Error",
        description: "Failed to fetch institute details for editing.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateInstitute = async (instituteData: any) => {
    try {
      console.log('Updating institute:', selectedInstitute?.id, instituteData);
      const baseUrl = getBaseUrl();
      
      // Prepare data for PATCH - exclude id and system fields
      const updateData = {
        name: instituteData.name,
        code: instituteData.code,
        email: instituteData.email,
        phone: instituteData.phone,
        address: instituteData.address,
        city: instituteData.city,
        state: instituteData.state,
        country: instituteData.country,
        pinCode: instituteData.pinCode,
        imageUrl: instituteData.imageUrl || ''
      };
      
      const response = await fetch(`${baseUrl}/institutes/${selectedInstitute.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Update failed:', errorData);
        throw new Error('Failed to update institute');
      }

      toast({
        title: "Success",
        description: "Institute updated successfully",
      });

      await fetchInstitutes(currentPage, searchTerm, isActiveFilter);
      setShowEditDialog(false);
      setSelectedInstitute(null);
    } catch (error) {
      console.error('Error updating institute:', error);
      toast({
        title: "Error",
        description: "Failed to update institute. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteInstitute = async (instituteId: string) => {
    if (!confirm('Are you sure you want to delete this institute?')) return;

    try {
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/institutes/${instituteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete institute');
      }

      toast({
        title: "Success",
        description: "Institute deleted successfully",
      });

      await fetchInstitutes(currentPage, searchTerm, isActiveFilter);
    } catch (error) {
      console.error('Error deleting institute:', error);
      toast({
        title: "Error",
        description: "Failed to delete institute. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewInstitute = async (id: string) => {
    try {
      const instituteData = await fetchInstituteById(id);
      setSelectedInstitute(instituteData);
      setShowViewDialog(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch institute details.",
        variant: "destructive",
      });
    }
  };

  // Define columns for card view
  const instituteColumns = [
    { key: 'code', header: 'Code' },
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    { key: 'city', header: 'City' },
    { 
      key: 'isActive', 
      header: 'Status',
      render: (value: boolean) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Active' : 'Inactive'}
        </Badge>
      )
    }
  ];

  return (
    <div className="p-4 sm:p-6">
      {/* Header - Mobile Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Institutes</h1>
        
        {/* Controls Container - Mobile First */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-2">
          {/* Search Input - Full width on mobile */}
          <div className="relative w-full sm:w-auto">
            <Input
              type="text"
              placeholder="Search institutes..."
              value={searchTerm}
              onChange={handleSearch}
              className="pr-10 h-10"
            />
            <SearchIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          </div>
          
          {/* Filter and Add Button Row */}
          <div className="flex gap-2">
            <Select value={isActiveFilter} onValueChange={handleActiveFilterChange}>
              <SelectTrigger className="w-full sm:w-32 h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="default" 
              onClick={() => setShowCreateDialog(true)}
              className="whitespace-nowrap h-10 px-4"
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Add Institute</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading institutes...</p>
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => fetchInstitutes(currentPage, searchTerm, isActiveFilter)}>
            Try Again
          </Button>
        </div>
      ) : institutes.length > 0 ? (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {institutes.map(institute => (
                  <TableRow key={institute.id}>
                    <TableCell className="font-medium">{institute.code}</TableCell>
                    <TableCell>{institute.name}</TableCell>
                    <TableCell>{institute.email}</TableCell>
                    <TableCell>{institute.phone}</TableCell>
                    <TableCell>{institute.city}</TableCell>
                    <TableCell>
                      <Badge variant={institute.isActive ? 'default' : 'secondary'}>
                        {institute.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleViewInstitute(institute.id)}>
                          <EyeIcon className="h-4 w-4 mr-1" />
                          <span className="hidden lg:inline">View</span>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEditInstitute(institute.id)}>
                          <PencilIcon className="h-4 w-4 mr-1" />
                          <span className="hidden lg:inline">Edit</span>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteInstitute(institute.id)}>
                          <TrashIcon className="h-4 w-4 mr-1" />
                          <span className="hidden lg:inline">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden">
            <DataCardView
              data={institutes}
              columns={instituteColumns}
              onView={(institute) => handleViewInstitute(institute.id)}
              onEdit={(institute) => handleEditInstitute(institute.id)}
              onDelete={(institute) => handleDeleteInstitute(institute.id)}
              allowEdit={true}
              allowDelete={true}
            />
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="bg-muted/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <SearchIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No institutes found</h3>
            <p className="text-muted-foreground mb-4">
              No institutes found according to the current filter. Try adjusting your search criteria.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add First Institute
            </Button>
          </div>
        </div>
      )}

      {/* Pagination - Mobile Responsive */}
      {institutes.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-4 border-t">
          <p className="text-sm text-muted-foreground text-center sm:text-left">
            Showing page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
              className="h-9"
            >
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Prev</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              className="h-9"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create Dialog - Mobile Responsive */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>Create New Institute</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
            <CreateInstituteForm
              onSubmit={handleCreateInstitute}
              onCancel={() => setShowCreateDialog(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog - Mobile Responsive */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>Edit Institute</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
            <CreateInstituteForm
              initialData={selectedInstitute}
              onSubmit={handleUpdateInstitute}
              onCancel={() => {
                setShowEditDialog(false);
                setSelectedInstitute(null);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog - Mobile Responsive */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>Institute Details</DialogTitle>
          </DialogHeader>
          {selectedInstitute && (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              {selectedInstitute.imageUrl && (
                <div className="flex justify-center">
                  <img 
                    src={getImageUrl(selectedInstitute.imageUrl)} 
                    alt={selectedInstitute.name}
                    className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-lg border"
                  />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name:</label>
                  <p className="text-sm break-words">{selectedInstitute.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Code:</label>
                  <p className="text-sm break-words">{selectedInstitute.code}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email:</label>
                  <p className="text-sm break-words">{selectedInstitute.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone:</label>
                  <p className="text-sm break-words">{selectedInstitute.phone}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">City:</label>
                  <p className="text-sm break-words">{selectedInstitute.city}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">State:</label>
                  <p className="text-sm break-words">{selectedInstitute.state}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Country:</label>
                  <p className="text-sm break-words">{selectedInstitute.country}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Pin Code:</label>
                  <p className="text-sm break-words">{selectedInstitute.pinCode}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Address:</label>
                <p className="text-sm break-words">{selectedInstitute.address}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Institutes;
