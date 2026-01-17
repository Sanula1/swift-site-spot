import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Mail, Phone, User } from 'lucide-react';
import { useTableData } from '@/hooks/useTableData';
import { useAuth } from '@/contexts/AuthContext';
import UserOrganizationsDialog from './forms/UserOrganizationsDialog';

interface OrganizationStudentsProps {
  organizationId: string;
  userRole?: string;
}

interface OrganizationStudent {
  userId: string;
  userIdByInstitute: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phoneNumber: string;
  imageUrl: string | null;
  mainUserType: string;
  instituteUserType: string;
  organizationRole: string;
  verificationStatus: string;
}

const OrganizationStudents = ({ organizationId, userRole }: OrganizationStudentsProps) => {
  const { currentInstituteId } = useAuth();
  const [selectedUser, setSelectedUser] = React.useState<{ userId: string; userName: string } | null>(null);

  const { state, pagination, actions } = useTableData<OrganizationStudent>({
    endpoint: `/organizations/institute/${currentInstituteId}/organization/${organizationId}/students`,
    pagination: {
      defaultLimit: 50,
      availableLimits: [25, 50, 100]
    },
    autoLoad: true, // Enable auto-loading from cache
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role.toUpperCase()) {
      case 'ADMIN':
        return 'default';
      case 'MEMBER':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'verified':
        return 'default';
      case 'unverified':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getUserTypeBadgeVariant = (userType: string) => {
    switch (userType.toUpperCase()) {
      case 'INSTITUTE_ADMIN':
        return 'default';
      case 'TEACHER':
        return 'secondary';
      case 'STUDENT':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (state.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">
            Members ({pagination.totalCount})
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Organization members enrolled from the institute
          </p>
        </div>
        <Button 
          onClick={() => actions.loadData(true)}
          disabled={state.loading}
          className="shrink-0"
        >
          <Users className="h-4 w-4 mr-2" />
          {state.loading ? 'Loading...' : 'Load Members'}
        </Button>
      </div>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Members ({pagination.totalCount})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {state.data.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No members found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Name</TableHead>
                  <TableHead className="hidden sm:table-cell min-w-[100px]">User ID</TableHead>
                  <TableHead className="hidden md:table-cell min-w-[200px]">Email</TableHead>
                  <TableHead className="hidden lg:table-cell min-w-[120px]">Phone</TableHead>
                  <TableHead className="min-w-[100px]">User Type</TableHead>
                  <TableHead className="hidden md:table-cell min-w-[80px]">Org Role</TableHead>
                  <TableHead className="hidden lg:table-cell min-w-[80px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.data.map((student) => (
                  <TableRow 
                    key={student.userId}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedUser({ userId: student.userId, userName: student.name })}
                  >
                    <TableCell>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{student.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {student.userIdByInstitute}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{student.userIdByInstitute}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1 truncate max-w-[200px]">
                        <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm truncate">{student.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{student.phoneNumber}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getUserTypeBadgeVariant(student.instituteUserType)} className="text-xs">
                        {student.instituteUserType.replace('_', ' ')}
                      </Badge>
                      <div className="md:hidden mt-1">
                        <Badge variant={getRoleBadgeVariant(student.organizationRole)} className="text-xs">
                          {student.organizationRole}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={getRoleBadgeVariant(student.organizationRole)} className="text-xs">
                        {student.organizationRole}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant={getStatusBadgeVariant(student.verificationStatus)} className="text-xs">
                        {student.verificationStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* User Organizations Dialog */}
      {selectedUser && (
        <UserOrganizationsDialog
          open={!!selectedUser}
          onOpenChange={(open) => !open && setSelectedUser(null)}
          userId={selectedUser.userId}
          userName={selectedUser.userName}
        />
      )}
    </div>
  );
};

export default OrganizationStudents;
