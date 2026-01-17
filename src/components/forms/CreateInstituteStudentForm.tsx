import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CalendarIcon, Eye, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { studentsApi, StudentCreateData } from '@/api/students.api';
import { usersApi, BasicUser } from '@/api/users.api';
import UserInfoDialog from './UserInfoDialog';
import { getBaseUrl } from '@/contexts/utils/auth.api';
interface CreateInstituteStudentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}
const CreateInstituteStudentForm: React.FC<CreateInstituteStudentFormProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [userInfoDialog, setUserInfoDialog] = useState<{ open: boolean; user: BasicUser | null }>({
    open: false,
    user: null
  });
  const [formData, setFormData] = useState({
    // User data
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    nic: '',
    birthCertificateNo: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    district: '',
    province: '',
    postalCode: '',
    country: '',
    // Parent IDs
    fatherId: '',
    motherId: '',
    guardianId: '',
    // Student data
    studentId: '',
    emergencyContact: '',
    medicalConditions: '',
    allergies: '',
    bloodGroup: ''
  });
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleViewUser = async (userId: string) => {
    if (!userId) {
      toast({
        title: "Missing ID",
        description: "Please enter a user ID first",
        variant: "destructive",
      });
      return;
    }

    try {
      const user = await usersApi.getBasicInfo(userId);
      setUserInfoDialog({ open: true, user });
    } catch (error: any) {
      console.error('Error fetching user info:', error);
      toast({
        title: "Error",
        description: error?.message || 'Failed to fetch user information',
        variant: "destructive",
      });
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dateOfBirth) {
      toast({
        title: "Error",
        description: "Please select a date of birth",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      const studentData: StudentCreateData = {
        user: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          userType: 'STUDENT',
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender,
          nic: formData.nic || undefined,
          birthCertificateNo: formData.birthCertificateNo || undefined,
          addressLine1: formData.addressLine1 || undefined,
          addressLine2: formData.addressLine2 || undefined,
          city: formData.city || undefined,
          district: formData.district || undefined,
          province: formData.province || undefined,
          postalCode: formData.postalCode || undefined,
          country: formData.country || undefined,
          isActive: false
        },
        fatherId: formData.fatherId || null,
        motherId: formData.motherId || null,
        guardianId: formData.guardianId || null,
        studentId: formData.studentId,
        emergencyContact: formData.emergencyContact,
        medicalConditions: formData.medicalConditions || undefined,
        allergies: formData.allergies || undefined,
        bloodGroup: formData.bloodGroup || undefined,
        isActive: false
      };
      const newStudent = await studentsApi.create(studentData);
      
      // If image is selected, upload it using signed URL
      if (selectedImage && newStudent.userId) {
        try {
          const { uploadWithSignedUrl } = await import('@/utils/signedUploadHelper');
          
          // Step 1: Upload to S3 using signed URL
          const relativePath = await uploadWithSignedUrl(
            selectedImage,
            'student-images'
          );
          
          // Step 2: Update student with relativePath
          const token = localStorage.getItem('access_token');
          const imageResponse = await fetch(`${getBaseUrl()}/students/${newStudent.userId}/image-url`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ imageUrl: relativePath })
          });
          
          if (!imageResponse.ok) {
            console.error('Failed to update student image URL');
            toast({
              title: "Warning",
              description: "Student created but image upload failed",
              variant: "destructive"
            });
          }
        } catch (imageError) {
          console.error('Error uploading student image:', imageError);
        }
      }
      
      toast({
        title: "Success",
        description: "Student created successfully!"
      });

      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        gender: '',
        nic: '',
        birthCertificateNo: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        district: '',
        province: '',
        postalCode: '',
        country: '',
        fatherId: '',
        motherId: '',
        guardianId: '',
        studentId: '',
        emergencyContact: '',
        medicalConditions: '',
        allergies: '',
        bloodGroup: ''
      });
      setSelectedImage(null);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating student:', error);
      toast({
        title: "Error",
        description: "Failed to create student. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  return <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Student</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Personal Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input id="firstName" value={formData.firstName} onChange={e => handleInputChange('firstName', e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input id="lastName" value={formData.lastName} onChange={e => handleInputChange('lastName', e.target.value)} required />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={formData.email} 
                  onChange={e => handleInputChange('email', e.target.value)} 
                  className="h-16 text-lg"
                  required 
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input 
                  id="phone" 
                  value={formData.phone} 
                  onChange={e => handleInputChange('phone', e.target.value)} 
                  className="h-16 text-lg"
                  required 
                />
              </div>

              <div>
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                <div className="relative">
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    className="h-16 text-lg"
                    placeholder="mm/dd/yyyy"
                    required
                  />
                  <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div>
                <Label htmlFor="gender">Gender *</Label>
                <Select value={formData.gender} onValueChange={value => handleInputChange('gender', value)}>
                  <SelectTrigger className="h-16 text-lg">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="nic">NIC</Label>
                <Input 
                  id="nic" 
                  value={formData.nic} 
                  onChange={e => handleInputChange('nic', e.target.value)} 
                  className="h-16 text-lg"
                />
              </div>

              <div>
                <Label htmlFor="birthCertificateNo">Birth Certificate No</Label>
                <Input 
                  id="birthCertificateNo" 
                  value={formData.birthCertificateNo} 
                  onChange={e => handleInputChange('birthCertificateNo', e.target.value)} 
                  className="h-16 text-lg"
                />
              </div>
              
              <div>
                <Label htmlFor="studentImage">Student Image</Label>
                <div className="space-y-2">
                  <Input
                    id="studentImage"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
                    className="h-16 text-lg"
                  />
                  {selectedImage && (
                    <span className="text-xs text-muted-foreground">
                      Selected: {selectedImage.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Address & Student Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Address Information</h3>
              
              <div>
                <Label htmlFor="addressLine1">Address Line 1</Label>
                <Input 
                  id="addressLine1" 
                  value={formData.addressLine1} 
                  onChange={e => handleInputChange('addressLine1', e.target.value)} 
                  className="h-16 text-lg"
                />
              </div>

              <div>
                <Label htmlFor="addressLine2">Address Line 2</Label>
                <Input 
                  id="addressLine2" 
                  value={formData.addressLine2} 
                  onChange={e => handleInputChange('addressLine2', e.target.value)} 
                  className="h-16 text-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input 
                    id="city" 
                    value={formData.city} 
                    onChange={e => handleInputChange('city', e.target.value)} 
                    className="h-16 text-lg"
                  />
                </div>
                <div>
                  <Label htmlFor="district">District</Label>
                  <Input 
                    id="district" 
                    value={formData.district} 
                    onChange={e => handleInputChange('district', e.target.value)} 
                    className="h-16 text-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="province">Province</Label>
                  <Input 
                    id="province" 
                    value={formData.province} 
                    onChange={e => handleInputChange('province', e.target.value)} 
                    className="h-16 text-lg"
                  />
                </div>
                <div>
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input 
                    id="postalCode" 
                    value={formData.postalCode} 
                    onChange={e => handleInputChange('postalCode', e.target.value)} 
                    className="h-16 text-lg"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="country">Country</Label>
                <Input 
                  id="country" 
                  value={formData.country} 
                  onChange={e => handleInputChange('country', e.target.value)} 
                  className="h-16 text-lg"
                />
              </div>

              <h3 className="text-lg font-semibold mt-6">Parent Information</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="fatherId">Father ID</Label>
                  <div className="flex gap-1 mt-2">
                    <Input 
                      id="fatherId" 
                      value={formData.fatherId} 
                      onChange={e => handleInputChange('fatherId', e.target.value)} 
                      className="h-16 text-lg"
                      placeholder="Enter father's user ID"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-16 w-12 shrink-0"
                      onClick={() => handleViewUser(formData.fatherId)}
                      disabled={!formData.fatherId}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="motherId">Mother ID</Label>
                  <div className="flex gap-1 mt-2">
                    <Input 
                      id="motherId" 
                      value={formData.motherId} 
                      onChange={e => handleInputChange('motherId', e.target.value)} 
                      className="h-16 text-lg"
                      placeholder="Enter mother's user ID"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-16 w-12 shrink-0"
                      onClick={() => handleViewUser(formData.motherId)}
                      disabled={!formData.motherId}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="guardianId">Guardian ID</Label>
                  <div className="flex gap-1 mt-2">
                    <Input 
                      id="guardianId" 
                      value={formData.guardianId} 
                      onChange={e => handleInputChange('guardianId', e.target.value)} 
                      className="h-16 text-lg"
                      placeholder="Enter guardian's user ID"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-16 w-12 shrink-0"
                      onClick={() => handleViewUser(formData.guardianId)}
                      disabled={!formData.guardianId}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <h3 className="text-lg font-semibold mt-6">Student Information</h3>
              
              <div>
                <Label htmlFor="studentId">Student ID *</Label>
                <Input 
                  id="studentId" 
                  value={formData.studentId} 
                  onChange={e => handleInputChange('studentId', e.target.value)} 
                  className="h-16 text-lg"
                  required 
                />
              </div>

              <div>
                <Label htmlFor="emergencyContact">Emergency Contact *</Label>
                <Input 
                  id="emergencyContact" 
                  value={formData.emergencyContact} 
                  onChange={e => handleInputChange('emergencyContact', e.target.value)} 
                  className="h-16 text-lg"
                  required 
                />
              </div>

              <div>
                <Label htmlFor="bloodGroup">Blood Group</Label>
                <Select value={formData.bloodGroup} onValueChange={value => handleInputChange('bloodGroup', value)}>
                  <SelectTrigger className="h-16 text-lg">
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="medicalConditions">Medical Conditions</Label>
                <Textarea 
                  id="medicalConditions" 
                  value={formData.medicalConditions} 
                  onChange={e => handleInputChange('medicalConditions', e.target.value)} 
                  placeholder="Enter any medical conditions..." 
                  className="min-h-24 text-lg"
                />
              </div>

              <div>
                <Label htmlFor="allergies">Allergies</Label>
                <Textarea 
                  id="allergies" 
                  value={formData.allergies} 
                  onChange={e => handleInputChange('allergies', e.target.value)} 
                  placeholder="Enter any allergies..." 
                  className="min-h-24 text-lg"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="h-16 text-lg px-8">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="h-16 text-lg px-8">
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              Create Student
            </Button>
          </div>
        </form>

        <UserInfoDialog 
          open={userInfoDialog.open}
          onClose={() => setUserInfoDialog({ open: false, user: null })}
          user={userInfoDialog.user}
        />
      </DialogContent>
    </Dialog>;
};
export default CreateInstituteStudentForm;