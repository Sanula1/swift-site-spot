import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Filter, X, Search, RefreshCw } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export interface InstituteUserFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  minAge?: number;
  maxAge?: number;
  city?: string;
  sortBy?: 'createdAt' | 'name' | 'email' | 'dateOfBirth';
  sortOrder?: 'ASC' | 'DESC';
  // Student-specific
  studentId?: string;
  emergencyContact?: string;
  hasMedicalConditions?: boolean;
  hasAllergies?: boolean;
  // Parent-specific
  occupation?: string;
  workplace?: string;
}

interface InstituteUsersFiltersProps {
  filters: InstituteUserFilterParams;
  onFiltersChange: (filters: InstituteUserFilterParams) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  userType: 'STUDENT' | 'TEACHER' | 'ATTENDANCE_MARKER' | 'INSTITUTE_ADMIN' | 'INACTIVE';
  isApplying?: boolean;
}

const InstituteUsersFilters: React.FC<InstituteUsersFiltersProps> = ({
  filters,
  onFiltersChange,
  onApplyFilters,
  onClearFilters,
  userType,
  isApplying = false
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const updateFilter = (key: keyof InstituteUserFilterParams, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const getActiveFilterCount = () => {
    const activeFilters = Object.entries(filters).filter(([key, value]) => {
      if (key === 'page' || key === 'limit') return false;
      return value !== undefined && value !== null && value !== '';
    });
    return activeFilters.length;
  };

  const clearFilter = (key: keyof InstituteUserFilterParams) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFiltersChange(newFilters);
  };

  const isStudent = userType === 'STUDENT';

  return (
    <Card className="mb-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <span>Filters & Search</span>
                {getActiveFilterCount() > 0 && (
                  <Badge variant="secondary">{getActiveFilterCount()} active</Badge>
                )}
              </div>
              <Button variant="ghost" size="sm">
                {isOpen ? 'Hide' : 'Show'}
              </Button>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Search and Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by name, email, phone..."
                    value={filters.search || ''}
                    onChange={(e) => updateFilter('search', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={onApplyFilters} 
                  className="flex items-center space-x-2"
                  disabled={isApplying}
                >
                  {isApplying ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Applying...</span>
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      <span>Apply</span>
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={onClearFilters}>
                  Clear All
                </Button>
              </div>
            </div>

            {/* Active Filters Display */}
            {getActiveFilterCount() > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {Object.entries(filters).map(([key, value]) => {
                  if (key === 'page' || key === 'limit' || !value) return null;
                  return (
                    <Badge key={key} variant="secondary" className="flex items-center space-x-1">
                      <span>{key}: {String(value)}</span>
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-destructive" 
                        onClick={() => clearFilter(key as keyof InstituteUserFilterParams)}
                      />
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Filter Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Active Status Filter */}
              {userType !== 'INACTIVE' && (
                <div>
                  <Label>Status</Label>
                  <Select 
                    value={filters.isActive === undefined ? 'all' : String(filters.isActive)} 
                    onValueChange={(value) => updateFilter('isActive', value === 'all' ? undefined : value === 'true')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All users" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All users</SelectItem>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Gender Filter */}
              <div>
                <Label>Gender</Label>
                <Select 
                  value={filters.gender || 'all'} 
                  onValueChange={(value) => updateFilter('gender', value === 'all' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All genders" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All genders</SelectItem>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort By */}
              <div>
                <Label>Sort By</Label>
                <Select 
                  value={filters.sortBy || 'createdAt'} 
                  onValueChange={(value) => updateFilter('sortBy', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Join Date</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="dateOfBirth">Date of Birth</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Order */}
              <div>
                <Label>Sort Order</Label>
                <Select 
                  value={filters.sortOrder || 'DESC'} 
                  onValueChange={(value) => updateFilter('sortOrder', value as 'ASC' | 'DESC')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DESC">Newest First</SelectItem>
                    <SelectItem value="ASC">Oldest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* City Filter */}
              <div>
                <Label htmlFor="city">City/Address</Label>
                <Input
                  id="city"
                  placeholder="Search by city or address"
                  value={filters.city || ''}
                  onChange={(e) => updateFilter('city', e.target.value)}
                />
              </div>

              {/* Items per Page */}
              <div>
                <Label>Items per Page</Label>
                <Select 
                  value={String(filters.limit || 50)} 
                  onValueChange={(value) => updateFilter('limit', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Age Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minAge">Minimum Age</Label>
                <Input
                  id="minAge"
                  type="number"
                  placeholder="Min age"
                  value={filters.minAge || ''}
                  onChange={(e) => updateFilter('minAge', e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>
              
              <div>
                <Label htmlFor="maxAge">Maximum Age</Label>
                <Input
                  id="maxAge"
                  type="number"
                  placeholder="Max age"
                  value={filters.maxAge || ''}
                  onChange={(e) => updateFilter('maxAge', e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>
            </div>

            {/* Student-Specific Filters */}
            {isStudent && (
              <>
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold mb-4">Student-Specific Filters</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="studentId">Student ID</Label>
                      <Input
                        id="studentId"
                        placeholder="e.g., STU2024001"
                        value={filters.studentId || ''}
                        onChange={(e) => updateFilter('studentId', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="emergencyContact">Emergency Contact</Label>
                      <Input
                        id="emergencyContact"
                        placeholder="Emergency phone number"
                        value={filters.emergencyContact || ''}
                        onChange={(e) => updateFilter('emergencyContact', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>Has Medical Conditions</Label>
                      <Select 
                        value={filters.hasMedicalConditions === undefined ? 'any' : String(filters.hasMedicalConditions)} 
                        onValueChange={(value) => updateFilter('hasMedicalConditions', value === 'any' ? undefined : value === 'true')}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Has Allergies</Label>
                      <Select 
                        value={filters.hasAllergies === undefined ? 'any' : String(filters.hasAllergies)} 
                        onValueChange={(value) => updateFilter('hasAllergies', value === 'any' ? undefined : value === 'true')}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="occupation">Parent Occupation</Label>
                      <Input
                        id="occupation"
                        placeholder="e.g., Engineer, Doctor"
                        value={filters.occupation || ''}
                        onChange={(e) => updateFilter('occupation', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="workplace">Parent Workplace</Label>
                      <Input
                        id="workplace"
                        placeholder="e.g., Tech Company Ltd"
                        value={filters.workplace || ''}
                        onChange={(e) => updateFilter('workplace', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default InstituteUsersFilters;
