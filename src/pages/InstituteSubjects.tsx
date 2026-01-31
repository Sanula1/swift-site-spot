import React, { useState, useEffect } from 'react';
import MUITable from '@/components/ui/mui-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { getImageUrl } from '@/utils/imageUrlHelper';
import { RefreshCw, Filter, Eye, Edit, Trash2, Plus, BookOpen, AlertCircle, Power, PowerOff, Link2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { subjectsApi, Subject, CreateSubjectDto, UpdateSubjectDto, SUBJECT_TYPE_OPTIONS, BASKET_CATEGORY_OPTIONS, requiresBasketCategory } from '@/api/subjects.api';
import SubjectImageUpload from '@/components/SubjectImageUpload';
import AssignSubjectToClassForm from '@/components/forms/AssignSubjectToClassForm';

/**
 * Institute Subjects Management Page
 * 
 * Shows all subjects for the current institute:
 * ✅ View all institute subjects in a table
 * ✅ Create new subjects
 * ✅ Update existing subjects
 * ✅ Delete/Deactivate subjects
 */
const InstituteSubjects = () => {
  const {
    user,
    currentInstituteId,
    selectedInstitute
  } = useAuth();
  const { toast } = useToast();
  const userRole = useInstituteRole();
  
  // Data states
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Image preview state
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // View dialog
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  // Create dialog
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createImageUrl, setCreateImageUrl] = useState('');
  const [createForm, setCreateForm] = useState<CreateSubjectDto>({
    code: '',
    name: '',
    description: '',
    category: '',
    creditHours: 1,
    isActive: true,
    subjectType: 'MAIN',
    basketCategory: undefined,
    instituteId: '',
    imgUrl: ''
  });

  // Edit dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editForm, setEditForm] = useState<UpdateSubjectDto & { id: string }>({
    id: '',
    code: '',
    name: '',
    description: '',
    category: '',
    creditHours: 1,
    isActive: true,
    subjectType: 'MAIN',
    basketCategory: undefined,
    imgUrl: ''
  });

  // Delete dialog
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Deactivate dialog
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [subjectToDeactivate, setSubjectToDeactivate] = useState<Subject | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Assign to Class dialog
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  // Permission checks
  const isInstituteAdmin = userRole === 'InstituteAdmin';
  const isSuperAdmin = user?.role === 'SystemAdmin';
  const isTeacher = userRole === 'Teacher';
  const canCreate = isInstituteAdmin || isSuperAdmin;
  const canEdit = isInstituteAdmin || isSuperAdmin;
  const canDelete = isSuperAdmin;
  const canDeactivate = isInstituteAdmin || isSuperAdmin;
  const canAssignSubjects = isInstituteAdmin || isTeacher;

  // Fetch subjects
  const fetchSubjects = async (forceRefresh = false) => {
    if (!currentInstituteId) return;
    
    setIsLoading(true);
    try {
      const response = await subjectsApi.getAll(
        currentInstituteId,
        { userId: user?.id, role: userRole || 'User' },
        forceRefresh
      );
      
      const subjectsData = Array.isArray(response) ? response : (response as any)?.data || [];
      setSubjects(subjectsData);
    } catch (error: any) {
      console.error('Error fetching subjects:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to load subjects",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentInstituteId) {
      fetchSubjects();
    }
  }, [currentInstituteId]);

  const resolveImageUrl = (url?: string | null) => {
    if (!url) return '/placeholder.svg';
    return getImageUrl(url);
  };

  // Get unique categories
  const categories = [...new Set(subjects.map(s => s.category).filter(Boolean))];

  // Filter subjects
  const filteredSubjects = subjects.filter(s => {
    const matchesSearch = !searchTerm || 
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && s.isActive) ||
      (statusFilter === 'inactive' && !s.isActive);
    
    const matchesCategory = categoryFilter === 'all' || s.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // View subject
  const handleViewSubject = (subject: Subject) => {
    setSelectedSubject(subject);
    setIsViewDialogOpen(true);
  };

  // Create subject
  const handleOpenCreate = () => {
    setCreateForm({
      code: '',
      name: '',
      description: '',
      category: '',
      creditHours: 1,
      isActive: true,
      subjectType: 'MAIN',
      basketCategory: undefined,
      instituteId: currentInstituteId || '',
      imgUrl: ''
    });
    setCreateImageUrl('');
    setIsCreateDialogOpen(true);
  };

  const handleCreateSubject = async () => {
    if (!currentInstituteId || isCreating) return;
    
    if (!createForm.code || !createForm.name) {
      toast({
        title: "Validation Error",
        description: "Code and Name are required",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsCreating(true);
      await subjectsApi.create({
        ...createForm,
        instituteId: currentInstituteId,
        imgUrl: createImageUrl || undefined
      });
      
      toast({
        title: "Subject Created",
        description: `${createForm.name} has been created successfully`
      });
      
      setIsCreateDialogOpen(false);
      fetchSubjects(true);
    } catch (error: any) {
      console.error('Error creating subject:', error);
      toast({
        title: "Creation Failed",
        description: error?.message || "Failed to create subject",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Edit subject
  const handleOpenEdit = (subject: Subject) => {
    setEditForm({
      id: subject.id,
      code: subject.code,
      name: subject.name,
      description: subject.description || '',
      category: subject.category || '',
      creditHours: subject.creditHours || 1,
      isActive: subject.isActive,
      subjectType: subject.subjectType,
      basketCategory: subject.basketCategory || undefined,
      imgUrl: subject.imgUrl || ''
    });
    setEditImageUrl(subject.imgUrl || '');
    setIsEditDialogOpen(true);
  };

  const handleUpdateSubject = async () => {
    if (!currentInstituteId || isUpdating) return;
    
    if (!editForm.code || !editForm.name) {
      toast({
        title: "Validation Error",
        description: "Code and Name are required",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsUpdating(true);
      const { id, ...updateData } = editForm;
      await subjectsApi.update(id, { ...updateData, imgUrl: editImageUrl || undefined }, currentInstituteId);
      
      toast({
        title: "Subject Updated",
        description: `${editForm.name} has been updated successfully`
      });
      
      setIsEditDialogOpen(false);
      fetchSubjects(true);
    } catch (error: any) {
      console.error('Error updating subject:', error);
      toast({
        title: "Update Failed",
        description: error?.message || "Failed to update subject",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete subject
  const handleDeleteClick = (subject: Subject) => {
    setSubjectToDelete(subject);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteSubject = async () => {
    if (!subjectToDelete || !currentInstituteId || isDeleting) return;

    try {
      setIsDeleting(true);
      await subjectsApi.delete(subjectToDelete.id, currentInstituteId);
      
      toast({
        title: "Subject Deleted",
        description: `${subjectToDelete.name} has been permanently deleted`
      });
      
      setShowDeleteConfirm(false);
      setSubjectToDelete(null);
      fetchSubjects(true);
    } catch (error: any) {
      console.error('Error deleting subject:', error);
      toast({
        title: "Delete Failed",
        description: error?.message || "Failed to delete subject",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Deactivate subject
  const handleDeactivateClick = (subject: Subject) => {
    setSubjectToDeactivate(subject);
    setShowDeactivateConfirm(true);
  };

  const confirmDeactivateSubject = async () => {
    if (!subjectToDeactivate || !currentInstituteId || isDeactivating) return;

    try {
      setIsDeactivating(true);
      await subjectsApi.deactivate(subjectToDeactivate.id, currentInstituteId);
      
      toast({
        title: "Subject Deactivated",
        description: `${subjectToDeactivate.name} has been deactivated`
      });
      
      setShowDeactivateConfirm(false);
      setSubjectToDeactivate(null);
      fetchSubjects(true);
    } catch (error: any) {
      console.error('Error deactivating subject:', error);
      toast({
        title: "Deactivate Failed",
        description: error?.message || "Failed to deactivate subject",
        variant: "destructive"
      });
    } finally {
      setIsDeactivating(false);
    }
  };

  // Table columns
  const subjectsColumns = [
    {
      id: 'imgUrl',
      key: 'imgUrl',
      header: 'Image',
      format: (_: any, row: Subject) => (
        <div 
          className="w-14 h-14 rounded-lg overflow-hidden bg-muted cursor-pointer hover:ring-2 hover:ring-primary transition-all"
          onClick={() => {
            if (row.imgUrl) {
              setPreviewImage({ url: resolveImageUrl(row.imgUrl), title: `${row.name} - Image` });
            }
          }}
        >
          <img
            src={resolveImageUrl(row.imgUrl)}
            alt={row.name ? `Subject ${row.name}` : 'Subject image'}
            className="w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }}
          />
        </div>
      )
    },
    {
      key: 'code',
      header: 'Code',
      format: (_: any, row: Subject) => (
        <span className="font-mono text-sm font-medium">{row.code || 'N/A'}</span>
      )
    },
    {
      key: 'name',
      header: 'Subject Name',
      format: (_: any, row: Subject) => row.name || <span className="text-muted-foreground italic">No name</span>
    },
    {
      key: 'category',
      header: 'Category',
      format: (_: any, row: Subject) => row.category ? (
        <Badge variant="outline">{row.category}</Badge>
      ) : (
        <span className="text-muted-foreground italic">N/A</span>
      )
    },
    {
      key: 'subjectType',
      header: 'Type',
      format: (_: any, row: Subject) => {
        const typeOption = SUBJECT_TYPE_OPTIONS.find(o => o.value === row.subjectType);
        return (
          <Badge variant="secondary">{typeOption?.label || row.subjectType || 'N/A'}</Badge>
        );
      }
    },
    {
      key: 'creditHours',
      header: 'Credits',
      format: (_: any, row: Subject) => (
        <span className="font-medium">{row.creditHours || 0}</span>
      )
    },
    {
      key: 'isActive',
      header: 'Status',
      format: (_: any, row: Subject) => (
        <Badge variant={row.isActive ? 'default' : 'secondary'} className={row.isActive ? 'bg-green-600' : 'bg-gray-500'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      format: (_: any, row: Subject) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewSubject(row)}
            title="View details"
          >
            <Eye className="h-4 w-4" />
          </Button>
          
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenEdit(row)}
              className="text-blue-600 hover:text-blue-700"
              title="Edit subject"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          
          {canDeactivate && row.isActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeactivateClick(row)}
              className="text-orange-600 hover:text-orange-700"
              title="Deactivate subject"
            >
              <PowerOff className="h-4 w-4" />
            </Button>
          )}
          
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteClick(row)}
              className="text-red-600 hover:text-red-700"
              title="Delete subject"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )
    }
  ];

  // Show message if no institute selected
  if (!currentInstituteId) {
    return (
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              No Institute Selected
            </CardTitle>
            <CardDescription>
              Please select an institute from the dashboard to manage subjects.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:gap-3">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold flex items-center gap-1.5 sm:gap-2">
            <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />
            Institute Subjects
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
            Manage all subjects for {selectedInstitute?.name || 'this institute'}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {canCreate && (
            <Button onClick={handleOpenCreate} size="sm" className="h-8 sm:h-9 text-xs sm:text-sm px-2.5 sm:px-3">
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />
              <span className="hidden xs:inline">Add</span> Subject
            </Button>
          )}
          
          {canAssignSubjects && (
            <Button variant="secondary" onClick={() => setIsAssignDialogOpen(true)} size="sm" className="h-8 sm:h-9 text-xs sm:text-sm px-2.5 sm:px-3">
              <Link2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />
              <span className="hidden sm:inline">Assign to Class</span>
              <span className="sm:hidden">Assign</span>
            </Button>
          )}
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowFilters(!showFilters)}
            className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3"
          >
            <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />
            <span className="hidden xs:inline">Filters</span>
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchSubjects(true)} 
            disabled={isLoading}
            className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3"
          >
            <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="pt-3 sm:pt-4 pb-3 sm:pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              <div>
                <label className="text-xs sm:text-sm font-medium mb-1 block">Search</label>
                <Input 
                  placeholder="Search by code, name..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="h-8 sm:h-9 text-xs sm:text-sm"
                />
              </div>
              
              <div>
                <label className="text-xs sm:text-sm font-medium mb-1 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-xs sm:text-sm font-medium mb-1 block">Category</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <Card>
          <CardContent className="p-2.5 sm:p-4">
            <div className="text-lg sm:text-xl font-bold">{subjects.length}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2.5 sm:p-4">
            <div className="text-lg sm:text-xl font-bold text-green-600">
              {subjects.filter(s => s.isActive).length}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2.5 sm:p-4">
            <div className="text-lg sm:text-xl font-bold text-gray-600">
              {subjects.filter(s => !s.isActive).length}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Inactive</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2.5 sm:p-4">
            <div className="text-lg sm:text-xl font-bold text-blue-600">
              {categories.length}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Subjects Table */}
      <div className="w-full overflow-x-auto">
        <MUITable
          title="Institute Subjects"
          data={filteredSubjects}
          columns={subjectsColumns.map(col => ({
            id: col.key,
            label: col.header,
            minWidth: col.key === 'actions' ? 180 : col.key === 'name' ? 200 : 120,
            format: col.format
          }))}
          page={0}
          rowsPerPage={50}
          totalCount={filteredSubjects.length}
          onPageChange={() => {}}
          onRowsPerPageChange={() => {}}
          sectionType="subjects"
        />
      </div>

      {/* Create Subject Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Subject</DialogTitle>
            <DialogDescription>
              Add a new subject to the institute
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Subject Image (4:3 ratio)</Label>
              <SubjectImageUpload
                value={createImageUrl}
                onChange={(url) => setCreateImageUrl(url)}
                onRemove={() => setCreateImageUrl('')}
              />
              <p className="text-xs text-muted-foreground">
                Recommended: 4:3 aspect ratio, max 5MB (JPG, PNG, WebP)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Code *</Label>
                <Input 
                  value={createForm.code}
                  onChange={e => setCreateForm({ ...createForm, code: e.target.value })}
                  placeholder="e.g., MATH101"
                />
              </div>
              <div>
                <Label>Name *</Label>
                <Input 
                  value={createForm.name}
                  onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g., Mathematics"
                />
              </div>
            </div>
            
            <div>
              <Label>Description</Label>
              <Textarea 
                value={createForm.description}
                onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Subject description..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Input 
                  value={createForm.category}
                  onChange={e => setCreateForm({ ...createForm, category: e.target.value })}
                  placeholder="e.g., Science"
                  list="create-category-options"
                />
                <datalist id="create-category-options">
                  <option value="Science" />
                  <option value="Mathematics" />
                  <option value="Languages" />
                  <option value="Arts" />
                  <option value="Commerce" />
                  <option value="Technology" />
                  <option value="Humanities" />
                  <option value="Religion" />
                  <option value="Physical Education" />
                </datalist>
              </div>
              <div>
                <Label>Credit Hours</Label>
                <Input 
                  type="number"
                  min={0}
                  value={createForm.creditHours}
                  onChange={e => setCreateForm({ ...createForm, creditHours: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Subject Type</Label>
                <Input 
                  value={createForm.subjectType}
                  onChange={e => setCreateForm({ ...createForm, subjectType: e.target.value })}
                  placeholder="Type or select subject type"
                  list="create-subject-type-options"
                />
                <datalist id="create-subject-type-options">
                  {SUBJECT_TYPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </datalist>
                <p className="text-xs text-muted-foreground mt-1">
                  {SUBJECT_TYPE_OPTIONS.find(o => o.value === createForm.subjectType)?.description || 'Enter custom type or select from suggestions'}
                </p>
              </div>
              
              {requiresBasketCategory(createForm.subjectType || '') && (
                <div>
                  <Label>Basket Category *</Label>
                  <Input 
                    value={createForm.basketCategory || ''}
                    onChange={e => setCreateForm({ ...createForm, basketCategory: e.target.value })}
                    placeholder="Type or select basket category"
                    list="create-basket-category-options"
                  />
                  <datalist id="create-basket-category-options">
                    {BASKET_CATEGORY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </datalist>
                  <p className="text-xs text-muted-foreground mt-1">
                    Required for basket subject types
                  </p>
                </div>
              )}
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Active Status</Label>
                <p className="text-sm text-muted-foreground">
                  Enable this subject for students and classes
                </p>
              </div>
              <Switch
                checked={createForm.isActive}
                onCheckedChange={(checked) => setCreateForm({ ...createForm, isActive: checked })}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSubject} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create Subject'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Subject Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Subject</DialogTitle>
            <DialogDescription>
              Update subject details
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Subject Image (4:3 ratio)</Label>
              <SubjectImageUpload
                value={editImageUrl}
                onChange={(url) => setEditImageUrl(url)}
                onRemove={() => setEditImageUrl('')}
              />
              <p className="text-xs text-muted-foreground">
                Recommended: 4:3 aspect ratio, max 5MB (JPG, PNG, WebP)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Code *</Label>
                <Input 
                  value={editForm.code}
                  onChange={e => setEditForm({ ...editForm, code: e.target.value })}
                  placeholder="e.g., MATH101"
                />
              </div>
              <div>
                <Label>Name *</Label>
                <Input 
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="e.g., Mathematics"
                />
              </div>
            </div>
            
            <div>
              <Label>Description</Label>
              <Textarea 
                value={editForm.description}
                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Subject description..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Input 
                  value={editForm.category}
                  onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                  placeholder="e.g., Science"
                  list="edit-category-options"
                />
                <datalist id="edit-category-options">
                  <option value="Science" />
                  <option value="Mathematics" />
                  <option value="Languages" />
                  <option value="Arts" />
                  <option value="Commerce" />
                  <option value="Technology" />
                  <option value="Humanities" />
                  <option value="Religion" />
                  <option value="Physical Education" />
                </datalist>
              </div>
              <div>
                <Label>Credit Hours</Label>
                <Input 
                  type="number"
                  min={0}
                  value={editForm.creditHours}
                  onChange={e => setEditForm({ ...editForm, creditHours: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Subject Type</Label>
                <Input 
                  value={editForm.subjectType}
                  onChange={e => setEditForm({ ...editForm, subjectType: e.target.value })}
                  placeholder="Type or select subject type"
                  list="edit-subject-type-options"
                />
                <datalist id="edit-subject-type-options">
                  {SUBJECT_TYPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </datalist>
                <p className="text-xs text-muted-foreground mt-1">
                  {SUBJECT_TYPE_OPTIONS.find(o => o.value === editForm.subjectType)?.description || 'Enter custom type or select from suggestions'}
                </p>
              </div>
              
              {requiresBasketCategory(editForm.subjectType || '') && (
                <div>
                  <Label>Basket Category *</Label>
                  <Input 
                    value={editForm.basketCategory || ''}
                    onChange={e => setEditForm({ ...editForm, basketCategory: e.target.value })}
                    placeholder="Type or select basket category"
                    list="edit-basket-category-options"
                  />
                  <datalist id="edit-basket-category-options">
                    {BASKET_CATEGORY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </datalist>
                  <p className="text-xs text-muted-foreground mt-1">
                    Required for basket subject types
                  </p>
                </div>
              )}
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Active Status</Label>
                <p className="text-sm text-muted-foreground">
                  Enable this subject for students and classes
                </p>
              </div>
              <Switch
                checked={editForm.isActive}
                onCheckedChange={(checked) => setEditForm({ ...editForm, isActive: checked })}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSubject} disabled={isUpdating}>
              {isUpdating ? 'Updating...' : 'Update Subject'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Subject Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Subject Details</DialogTitle>
          </DialogHeader>
          {selectedSubject && (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted">
                  <img
                    src={resolveImageUrl(selectedSubject.imgUrl)}
                    alt={selectedSubject.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{selectedSubject.name}</h3>
                  <p className="text-sm font-mono text-muted-foreground">{selectedSubject.code}</p>
                  <Badge variant={selectedSubject.isActive ? 'default' : 'secondary'} className="mt-2">
                    {selectedSubject.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              
              {selectedSubject.description && (
                <div className="pt-4 border-t">
                  <label className="text-sm text-muted-foreground">Description</label>
                  <p className="mt-1">{selectedSubject.description}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm text-muted-foreground">Category</label>
                  <p className="font-medium">{selectedSubject.category || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Credit Hours</label>
                  <p className="font-medium">{selectedSubject.creditHours || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Subject Type</label>
                  <p className="font-medium">
                    {SUBJECT_TYPE_OPTIONS.find(o => o.value === selectedSubject.subjectType)?.label || selectedSubject.subjectType || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Basket Category</label>
                  <p className="font-medium">
                    {BASKET_CATEGORY_OPTIONS.find(o => o.value === selectedSubject.basketCategory)?.label || selectedSubject.basketCategory || 'N/A'}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                {canEdit && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsViewDialogOpen(false);
                      handleOpenEdit(selectedSubject);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Subject
                  </Button>
                )}
                <Button variant="secondary" onClick={() => setIsViewDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={(open) => !isDeleting && setShowDeleteConfirm(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subject</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{subjectToDelete?.name}</strong>?
              <br /><br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteSubject}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete Subject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate Confirmation */}
      <AlertDialog open={showDeactivateConfirm} onOpenChange={(open) => !isDeactivating && setShowDeactivateConfirm(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Subject</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate <strong>{subjectToDeactivate?.name}</strong>?
              <br /><br />
              The subject will be hidden but can be reactivated later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeactivating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeactivateSubject}
              disabled={isDeactivating}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isDeactivating ? 'Deactivating...' : 'Deactivate Subject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-2xl p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>{previewImage?.title}</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            {previewImage && (
              <img 
                src={previewImage.url} 
                alt={previewImage.title}
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Subject to Class Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Subjects to Class</DialogTitle>
            <DialogDescription>
              Select a class and assign subjects with optional default teacher
            </DialogDescription>
          </DialogHeader>
          <AssignSubjectToClassForm
            onSuccess={() => {
              setIsAssignDialogOpen(false);
              fetchSubjects(true);
            }}
            onCancel={() => setIsAssignDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InstituteSubjects;
