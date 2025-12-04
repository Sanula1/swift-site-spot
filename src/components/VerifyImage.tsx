import React, { useState } from 'react';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import { RefreshCw, CheckCircle, Eye, XCircle } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { getBaseUrl } from '@/contexts/utils/auth.api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import ImagePreviewModal from '@/components/ImagePreviewModal';

interface UnverifiedImageStudent {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  userIdByInstitute: string;
  instituteUserImageUrl: string;
  isImageVerified: boolean;
  gender?: string;
  dateOfBirth?: string;
  addressLine1?: string;
  addressLine2?: string;
  imageUrl?: string;
  instituteCardId?: string;
}

interface Column {
  id: 'instituteImage' | 'profileImage' | 'id' | 'userIdByInstitute' | 'name' | 'email' | 'phoneNumber' | 'actions';
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
}

const columns: readonly Column[] = [
  { id: 'instituteImage', label: 'Institute Image', minWidth: 100, align: 'center' },
  { id: 'profileImage', label: 'Profile Image', minWidth: 100, align: 'center' },
  { id: 'id', label: 'ID', minWidth: 80 },
  { id: 'userIdByInstitute', label: 'User ID', minWidth: 120 },
  { id: 'name', label: 'Name', minWidth: 170 },
  { id: 'email', label: 'Email', minWidth: 200 },
  { id: 'phoneNumber', label: 'Phone', minWidth: 130 },
  { id: 'actions', label: 'Actions', minWidth: 250, align: 'center' },
];

const VerifyImage = () => {
  const { user, currentInstituteId, selectedInstitute } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [students, setStudents] = useState<UnverifiedImageStudent[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [verifyingIds, setVerifyingIds] = useState<Set<string>>(new Set());
  const [rejectingIds, setRejectingIds] = useState<Set<string>>(new Set());
  const [selectedStudent, setSelectedStudent] = useState<UnverifiedImageStudent | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const userRole = useInstituteRole();

  if (userRole !== 'InstituteAdmin') {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Access denied. InstituteAdmin role required.</p>
      </div>
    );
  }

  if (!currentInstituteId) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please select an institute first.</p>
      </div>
    );
  }

  const fetchUnverifiedImages = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${getBaseUrl()}/institute-users/institute/${currentInstituteId}/users/unverified-with-images?page=${page}&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch unverified images');
      }

      const result = await response.json();
      setStudents(result.data || []);
      setTotalCount(result.meta?.total || 0);
      
      toast({
        title: "Data Loaded",
        description: `Found ${result.meta?.total || 0} unverified images`,
        duration: 1500
      });
    } catch (error) {
      console.error('Error fetching unverified images:', error);
      toast({
        title: "Error",
        description: "Failed to load unverified images",
        variant: "destructive",
        duration: 1500
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (student: UnverifiedImageStudent) => {
    setSelectedStudent(student);
    setIsViewDialogOpen(true);
  };

  const handleVerifyImage = async (studentId: string) => {
    setVerifyingIds(prev => new Set(prev).add(studentId));
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${getBaseUrl()}/institute-users/institute/${currentInstituteId}/users/${studentId}/verify-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status: 'VERIFIED' })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to verify image');
      }

      const result = await response.json();

      toast({
        title: "Image Verified",
        description: result.message || "Image has been verified successfully",
        duration: 1500
      });

      fetchUnverifiedImages();
    } catch (error) {
      console.error('Error verifying image:', error);
      toast({
        title: "Error",
        description: "Failed to verify image",
        variant: "destructive",
        duration: 1500
      });
    } finally {
      setVerifyingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(studentId);
        return newSet;
      });
    }
  };

  const handleRejectImage = async () => {
    if (!selectedStudent || !rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a rejection reason",
        variant: "destructive",
        duration: 1500
      });
      return;
    }

    setRejectingIds(prev => new Set(prev).add(selectedStudent.id));
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${getBaseUrl()}/institute-users/institute/${currentInstituteId}/users/${selectedStudent.id}/verify-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            status: 'REJECTED',
            rejectionReason: rejectionReason 
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to reject image');
      }

      const result = await response.json();

      toast({
        title: "Image Rejected",
        description: result.message || "Image has been rejected successfully",
        duration: 1500
      });

      setIsRejectDialogOpen(false);
      setRejectionReason('');
      setSelectedStudent(null);
      fetchUnverifiedImages();
    } catch (error) {
      console.error('Error rejecting image:', error);
      toast({
        title: "Error",
        description: "Failed to reject image",
        variant: "destructive",
        duration: 1500
      });
    } finally {
      setRejectingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedStudent.id);
        return newSet;
      });
    }
  };

  const openRejectDialog = (student: UnverifiedImageStudent) => {
    setSelectedStudent(student);
    setIsRejectDialogOpen(true);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLimit(+event.target.value);
    setPage(1);
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 pb-4">
        <div>
          <h1 className="text-3xl font-bold">Verify Image</h1>
          <p className="text-muted-foreground mt-1">
            Verify and manage user images for {selectedInstitute?.name || 'institute'}
          </p>
        </div>
        <Button
          onClick={fetchUnverifiedImages}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Load Images
            </>
          )}
        </Button>
      </div>

      <Paper sx={{ 
        flex: 1, 
        overflow: 'hidden',
        mx: 3,
        mb: 3,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <TableContainer sx={{ flex: 1 }}>
          <Table stickyHeader aria-label="sticky table">
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    align={column.align}
                    style={{ minWidth: column.minWidth }}
                    sx={{ fontWeight: 'bold', backgroundColor: 'rgba(0, 0, 0, 0.04)' }}
                  >
                    {column.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center">
                    <div className="py-12 text-center text-gray-500">
                      <p className="text-lg">No pending images</p>
                      <p className="text-sm">Click "Load Images" to fetch unverified images</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student) => (
                  <TableRow hover role="checkbox" tabIndex={-1} key={student.id}>
                    <TableCell align="center">
                      <Avatar 
                        className="h-16 w-16 mx-auto cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setPreviewImage({ url: student.instituteUserImageUrl, title: `${student.name} - Institute Image` })}
                      >
                        <AvatarImage src={student.instituteUserImageUrl} alt={student.name} />
                        <AvatarFallback>{student.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell align="center">
                      {student.imageUrl ? (
                        <Avatar 
                          className="h-16 w-16 mx-auto cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setPreviewImage({ url: student.imageUrl!, title: `${student.name} - Profile Image` })}
                        >
                          <AvatarImage src={student.imageUrl} alt={student.name} />
                          <AvatarFallback>{student.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                      ) : (
                        <span className="text-muted-foreground text-sm">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>{student.id}</TableCell>
                    <TableCell>{student.userIdByInstitute}</TableCell>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>{student.phoneNumber}</TableCell>
                    <TableCell align="center">
                      <div className="flex justify-center items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(student)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleVerifyImage(student.id)}
                          disabled={verifyingIds.has(student.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Verify
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openRejectDialog(student)}
                          disabled={rejectingIds.has(student.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={totalCount}
          rowsPerPage={limit}
          page={page - 1}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Complete information about the user
            </DialogDescription>
          </DialogHeader>
          
          {selectedStudent && (
            <div className="space-y-6">
              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">ID</Label>
                  <p className="text-base">{selectedStudent.id}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">User ID by Institute</Label>
                  <p className="text-base">{selectedStudent.userIdByInstitute}</p>
                </div>
              </div>

              {/* Institute Image */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Institute Image</Label>
                <div className="flex justify-center">
                  <Avatar 
                    className="h-32 w-32 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setPreviewImage({ url: selectedStudent.instituteUserImageUrl, title: `${selectedStudent.name} - Institute Image` })}
                  >
                    <AvatarImage src={selectedStudent.instituteUserImageUrl} alt={selectedStudent.name} />
                    <AvatarFallback>{selectedStudent.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                </div>
              </div>

              {/* Profile Image */}
              {selectedStudent.imageUrl && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Profile Image</Label>
                  <div className="flex justify-center">
                    <Avatar 
                      className="h-32 w-32 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setPreviewImage({ url: selectedStudent.imageUrl!, title: `${selectedStudent.name} - Profile Image` })}
                    >
                      <AvatarImage src={selectedStudent.imageUrl} alt={`${selectedStudent.name} profile`} />
                      <AvatarFallback>{selectedStudent.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              )}

              {/* Other Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                  <p className="text-base">{selectedStudent.name}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <p className="text-base">{selectedStudent.email}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Phone Number</Label>
                  <p className="text-base">{selectedStudent.phoneNumber}</p>
                </div>

                {selectedStudent.gender && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Gender</Label>
                    <p className="text-base">{selectedStudent.gender}</p>
                  </div>
                )}

                {selectedStudent.dateOfBirth && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Date of Birth</Label>
                    <p className="text-base">{new Date(selectedStudent.dateOfBirth).toLocaleDateString()}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Address Line 1</Label>
                  <p className="text-base">{selectedStudent.addressLine1 || 'N/A'}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Address Line 2</Label>
                  <p className="text-base">{selectedStudent.addressLine2 || 'N/A'}</p>
                </div>

                {selectedStudent.instituteCardId && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Institute Card ID</Label>
                    <p className="text-base">{selectedStudent.instituteCardId}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Verification Status</Label>
                  <p className="text-base">{selectedStudent.isImageVerified ? 'Verified' : 'Pending'}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Image</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this image
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">Rejection Reason</Label>
              <Textarea
                id="rejectionReason"
                placeholder="e.g., Image quality is too poor"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsRejectDialogOpen(false);
                  setRejectionReason('');
                  setSelectedStudent(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectImage}
                disabled={!rejectionReason.trim() || (selectedStudent && rejectingIds.has(selectedStudent.id))}
              >
                {selectedStudent && rejectingIds.has(selectedStudent.id) ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Image
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      {previewImage && (
        <ImagePreviewModal
          isOpen={!!previewImage}
          onClose={() => setPreviewImage(null)}
          imageUrl={previewImage.url}
          title={previewImage.title}
        />
      )}
    </div>
  );
};

export default VerifyImage;
