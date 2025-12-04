import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/api/client';
import { CalendarIcon, User, GraduationCap, Users, Camera, ImageIcon, X } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast as sonnerToast } from 'sonner';
import { getSignedUrl, uploadToSignedUrl, detectFolder } from '@/utils/imageUploadHelper';
interface CreateComprehensiveUserFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
}
type UserType = 'USER' | 'USER_WITHOUT_PARENT' | 'USER_WITHOUT_STUDENT';
type BloodGroup = 'A_POSITIVE' | 'A_NEGATIVE' | 'B_POSITIVE' | 'B_NEGATIVE' | 'O_POSITIVE' | 'O_NEGATIVE' | 'AB_POSITIVE' | 'AB_NEGATIVE';
enum Occupation {
  TEACHER = 'TEACHER',
  LECTURER = 'LECTURER',
  PRINCIPAL = 'PRINCIPAL',
  TUITION_TEACHER = 'TUITION_TEACHER',
  SCHOOL_COUNSELOR = 'SCHOOL_COUNSELOR',
  TUITION_INSTITUTE_OWNER = 'TUITION_INSTITUTE_OWNER',
  LIBRARIAN = 'LIBRARIAN',
  NURSE = 'NURSE',
  DOCTOR = 'DOCTOR',
  PHARMACIST = 'PHARMACIST',
  LABORATORY_TECHNICIAN = 'LABORATORY_TECHNICIAN',
  MIDWIFE = 'MIDWIFE',
  DENTIST = 'DENTIST',
  VETERINARY_DOCTOR = 'VETERINARY_DOCTOR',
  PHARMACIST_ASSISTANT = 'PHARMACIST_ASSISTANT',
  MEDICAL_REPRESENTATIVE = 'MEDICAL_REPRESENTATIVE',
  ENGINEER = 'ENGINEER',
  CIVIL_ENGINEER = 'CIVIL_ENGINEER',
  ARCHITECT = 'ARCHITECT',
  QUANTITY_SURVEYOR = 'QUANTITY_SURVEYOR',
  SURVEYOR = 'SURVEYOR',
  DRAFTSMAN = 'DRAFTSMAN',
  TECHNICIAN = 'TECHNICIAN',
  AIR_CONDITIONING_TECHNICIAN = 'AIR_CONDITIONING_TECHNICIAN',
  AUTO_ELECTRICIAN = 'AUTO_ELECTRICIAN',
  MOBILE_TECHNICIAN = 'MOBILE_TECHNICIAN',
  COMPUTER_TECHNICIAN = 'COMPUTER_TECHNICIAN',
  CCTV_INSTALLER = 'CCTV_INSTALLER',
  IT_OFFICER = 'IT_OFFICER',
  SOFTWARE_DEVELOPER = 'SOFTWARE_DEVELOPER',
  WEB_DEVELOPER = 'WEB_DEVELOPER',
  GRAPHIC_DESIGNER = 'GRAPHIC_DESIGNER',
  CONTENT_CREATOR = 'CONTENT_CREATOR',
  YOUTUBER = 'YOUTUBER',
  DATA_ENTRY_OPERATOR = 'DATA_ENTRY_OPERATOR',
  SOCIAL_MEDIA_MARKETER = 'SOCIAL_MEDIA_MARKETER',
  ACCOUNTANT = 'ACCOUNTANT',
  BANK_OFFICER = 'BANK_OFFICER',
  INSURANCE_AGENT = 'INSURANCE_AGENT',
  MARKETING_EXECUTIVE = 'MARKETING_EXECUTIVE',
  ENTREPRENEUR = 'ENTREPRENEUR',
  BUSINESS_OWNER = 'BUSINESS_OWNER',
  SHOP_OWNER = 'SHOP_OWNER',
  BOUTIQUE_OWNER = 'BOUTIQUE_OWNER',
  GROCERY_SHOP_OWNER = 'GROCERY_SHOP_OWNER',
  TAILORING_SHOP_OWNER = 'TAILORING_SHOP_OWNER',
  BEAUTY_SALON_OWNER = 'BEAUTY_SALON_OWNER',
  BARBER_SHOP_OWNER = 'BARBER_SHOP_OWNER',
  CONSULTANT = 'CONSULTANT',
  MANAGER = 'MANAGER',
  SUPERVISOR = 'SUPERVISOR',
  HR_OFFICER = 'HR_OFFICER',
  HR_EXECUTIVE = 'HR_EXECUTIVE',
  PROCUREMENT_OFFICER = 'PROCUREMENT_OFFICER',
  CLERK = 'CLERK',
  CASHIER = 'CASHIER',
  RECEPTIONIST = 'RECEPTIONIST',
  CASH_COLLECTOR = 'CASH_COLLECTOR',
  STORE_KEEPER = 'STORE_KEEPER',
  STORE_MANAGER = 'STORE_MANAGER',
  WAREHOUSE_ASSISTANT = 'WAREHOUSE_ASSISTANT',
  SALES_EXECUTIVE = 'SALES_EXECUTIVE',
  SALESMAN = 'SALESMAN',
  SHOP_ASSISTANT = 'SHOP_ASSISTANT',
  CALL_CENTER_AGENT = 'CALL_CENTER_AGENT',
  CALL_CENTER_SUPERVISOR = 'CALL_CENTER_SUPERVISOR',
  DRIVER = 'DRIVER',
  BUS_DRIVER = 'BUS_DRIVER',
  TUK_TUK_DRIVER = 'TUK_TUK_DRIVER',
  TAXI_DRIVER = 'TAXI_DRIVER',
  HEAVY_VEHICLE_DRIVER = 'HEAVY_VEHICLE_DRIVER',
  DELIVERY_RIDER = 'DELIVERY_RIDER',
  DELIVERY_PARTNER = 'DELIVERY_PARTNER',
  DELIVERY_HELPER = 'DELIVERY_HELPER',
  DELIVERY_DISPATCHER = 'DELIVERY_DISPATCHER',
  BUS_CONDUCTOR = 'BUS_CONDUCTOR',
  DRIVER_ASSISTANT = 'DRIVER_ASSISTANT',
  CRANE_OPERATOR = 'CRANE_OPERATOR',
  FORKLIFT_OPERATOR = 'FORKLIFT_OPERATOR',
  BUS_OWNER = 'BUS_OWNER',
  VEHICLE_INSPECTOR = 'VEHICLE_INSPECTOR',
  BOATMAN = 'BOATMAN',
  FERRY_OPERATOR = 'FERRY_OPERATOR',
  FARMER = 'FARMER',
  TEA_ESTATE_WORKER = 'TEA_ESTATE_WORKER',
  RUBBER_TAPPER = 'RUBBER_TAPPER',
  COCONUT_FARMER = 'COCONUT_FARMER',
  PADDY_FARMER = 'PADDY_FARMER',
  SPICE_CULTIVATOR = 'SPICE_CULTIVATOR',
  VEGETABLE_CULTIVATOR = 'VEGETABLE_CULTIVATOR',
  POULTRY_FARMER = 'POULTRY_FARMER',
  LIVESTOCK_FARMER = 'LIVESTOCK_FARMER',
  DAIRY_FARMER = 'DAIRY_FARMER',
  FISHERMAN = 'FISHERMAN',
  FISHER = 'FISHER',
  NET_REPAIRER = 'NET_REPAIRER',
  FISH_SELLER = 'FISH_SELLER',
  POLICE_OFFICER = 'POLICE_OFFICER',
  SOLDIER = 'SOLDIER',
  NAVY = 'NAVY',
  AIR_FORCE = 'AIR_FORCE',
  SECURITY_GUARD = 'SECURITY_GUARD',
  SECURITY_SUPERVISOR = 'SECURITY_SUPERVISOR',
  WATCHMAN = 'WATCHMAN',
  MECHANIC = 'MECHANIC',
  BUS_MECHANIC = 'BUS_MECHANIC',
  LIGHT_VEHICLE_MECHANIC = 'LIGHT_VEHICLE_MECHANIC',
  ELECTRICIAN = 'ELECTRICIAN',
  PLUMBER = 'PLUMBER',
  CARPENTER = 'CARPENTER',
  MASON = 'MASON',
  WELDER = 'WELDER',
  PAINTER_BUILDING = 'PAINTER_BUILDING',
  PAINTER_VEHICLE = 'PAINTER_VEHICLE',
  CONSTRUCTION_WORKER = 'CONSTRUCTION_WORKER',
  TAILOR = 'TAILOR',
  DRESSMAKER = 'DRESSMAKER',
  FASHION_DESIGNER = 'FASHION_DESIGNER',
  TAILORING_ASSISTANT = 'TAILORING_ASSISTANT',
  HAIRDRESSER = 'HAIRDRESSER',
  BEAUTICIAN = 'BEAUTICIAN',
  BARBER = 'BARBER',
  CHEF = 'CHEF',
  COOK = 'COOK',
  BAKER = 'BAKER',
  PASTRY_CHEF = 'PASTRY_CHEF',
  WAITER = 'WAITER',
  WAITRESS = 'WAITRESS',
  HOTEL_STAFF = 'HOTEL_STAFF',
  TOUR_GUIDE = 'TOUR_GUIDE',
  ARTIST = 'ARTIST',
  MUSICIAN = 'MUSICIAN',
  DANCER = 'DANCER',
  PHOTOGRAPHER = 'PHOTOGRAPHER',
  VIDEOGRAPHER = 'VIDEOGRAPHER',
  PHOTOGRAPHER_ASSISTANT = 'PHOTOGRAPHER_ASSISTANT',
  CAMERAMAN = 'CAMERAMAN',
  ACTOR = 'ACTOR',
  ACTRESS = 'ACTRESS',
  SINGER = 'SINGER',
  MUSIC_TEACHER = 'MUSIC_TEACHER',
  PAINTER_ARTIST = 'PAINTER_ARTIST',
  GYM_INSTRUCTOR = 'GYM_INSTRUCTOR',
  SPORTS_COACH = 'SPORTS_COACH',
  FITNESS_TRAINER = 'FITNESS_TRAINER',
  HOUSEWIFE = 'HOUSEWIFE',
  HOUSEMAID = 'HOUSEMAID',
  DOMESTIC_WORKER = 'DOMESTIC_WORKER',
  GARDENER = 'GARDENER',
  CLEANER = 'CLEANER',
  JANITOR = 'JANITOR',
  FACTORY_WORKER = 'FACTORY_WORKER',
  LABOURER = 'LABOURER',
  FRUIT_SELLER = 'FRUIT_SELLER',
  STREET_VENDOR = 'STREET_VENDOR',
  SMALL_BUSINESS_VENDOR = 'SMALL_BUSINESS_VENDOR',
  CIVIL_SERVANT = 'CIVIL_SERVANT',
  GOVERNMENT_OFFICER = 'GOVERNMENT_OFFICER',
  GRAMA_NILADHARI = 'GRAMA_NILADHARI',
  POSTMAN = 'POSTMAN',
  LAWYER = 'LAWYER',
  LEGAL_OFFICER = 'LEGAL_OFFICER',
  RESEARCHER = 'RESEARCHER',
  SCIENTIST = 'SCIENTIST',
  SOCIAL_WORKER = 'SOCIAL_WORKER',
  NGO_WORKER = 'NGO_WORKER',
  NGO_FIELD_OFFICER = 'NGO_FIELD_OFFICER',
  VOLUNTEER_WORKER = 'VOLUNTEER_WORKER',
  PRIEST = 'PRIEST',
  MONK = 'MONK',
  IMAM = 'IMAM',
  RELIGIOUS_LEADER = 'RELIGIOUS_LEADER',
  JOURNALIST = 'JOURNALIST',
  REPORTER = 'REPORTER',
  LANDLORD = 'LANDLORD',
  LANDLADY = 'LANDLADY',
  STUDENT_SCHOOL = 'STUDENT_SCHOOL',
  STUDENT_UNIVERSITY = 'STUDENT_UNIVERSITY',
  RETIRED_PERSON = 'RETIRED_PERSON',
  UNEMPLOYED = 'UNEMPLOYED',
}
enum District {
  COLOMBO = "COLOMBO",
  GAMPAHA = "GAMPAHA",
  KALUTARA = "KALUTARA",
  KANDY = "KANDY",
  MATALE = "MATALE",
  NUWARA_ELIYA = "NUWARA_ELIYA",
  GALLE = "GALLE",
  MATARA = "MATARA",
  HAMBANTOTA = "HAMBANTOTA",
  JAFFNA = "JAFFNA",
  KILINOCHCHI = "KILINOCHCHI",
  MANNAR = "MANNAR",
  MULLAITIVU = "MULLAITIVU",
  VAVUNIYA = "VAVUNIYA",
  TRINCOMALEE = "TRINCOMALEE",
  BATTICALOA = "BATTICALOA",
  AMPARA = "AMPARA",
  KURUNEGALA = "KURUNEGALA",
  PUTTALAM = "PUTTALAM",
  ANURADHAPURA = "ANURADHAPURA",
  POLONNARUWA = "POLONNARUWA",
  BADULLA = "BADULLA",
  MONARAGALA = "MONARAGALA",
  RATNAPURA = "RATNAPURA",
  KEGALLE = "KEGALLE",
}
enum Province {
  WESTERN = "WESTERN",
  CENTRAL = "CENTRAL",
  SOUTHERN = "SOUTHERN",
  NORTHERN = "NORTHERN",
  EASTERN = "EASTERN",
  NORTH_WESTERN = "NORTH_WESTERN",
  NORTH_CENTRAL = "NORTH_CENTRAL",
  UVA = "UVA",
  SABARAGAMUWA = "SABARAGAMUWA",
}
const CreateComprehensiveUserForm = ({
  onSubmit,
  onCancel
}: CreateComprehensiveUserFormProps) => {
  const {
    toast
  } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [userType, setUserType] = useState<UserType>('USER');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  // Basic user data
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    gender: '',
    dateOfBirth: '',
    nic: '',
    birthCertificateNo: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    district: '',
    province: '',
    postalCode: '',
    country: 'Sri Lanka',
    idUrl: '',
    isActive: true
  });

  // Student data
  const [studentData, setStudentData] = useState({
    studentId: '',
    emergencyContact: '',
    medicalConditions: '',
    allergies: '',
    bloodGroup: '' as BloodGroup | '',
    fatherId: '',
    fatherPhoneNumber: '',
    motherId: '',
    motherPhoneNumber: '',
    guardianId: '',
    guardianPhoneNumber: ''
  });

  // Parent data
  const [parentData, setParentData] = useState({
    occupation: '',
    workplace: '',
    workPhone: '',
    educationLevel: ''
  });
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const handleStudentDataChange = (field: string, value: any) => {
    setStudentData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const handleParentDataChange = (field: string, value: any) => {
    setParentData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode
        }
      });
      streamRef.current = stream;
      setIsCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (error) {
      console.error('Error accessing camera:', error);
      sonnerToast.error('Failed to access camera. Please check permissions.');
    }
  };
  const switchCamera = async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);

    // Close current stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    // Open with new facing mode
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: newFacingMode
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      sonnerToast.success(`Switched to ${newFacingMode === 'user' ? 'front' : 'back'} camera`);
    } catch (error) {
      console.error('Error switching camera:', error);
      sonnerToast.error('Failed to switch camera.');
    }
  };
  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
          if (blob) {
            const file = new File([blob], 'camera-photo.jpg', {
              type: 'image/jpeg'
            });
            setImageFile(file);
            setImagePreview(canvas.toDataURL('image/jpeg'));
            closeCamera();
            sonnerToast.success('Photo captured successfully');
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      let profileImageRelativePath = '';
      let idDocumentRelativePath = '';

      // Upload profile image if selected
      if (imageFile) {
        sonnerToast.info('Uploading profile image...');
        const folder = detectFolder(imageFile, 'profile');
        const signedUrlData = await getSignedUrl(
          folder,
          imageFile.name,
          imageFile.type,
          imageFile.size
        );
        
        await uploadToSignedUrl(
          signedUrlData.uploadUrl,
          imageFile,
          signedUrlData.fields
        );
        
        profileImageRelativePath = signedUrlData.relativePath;
        sonnerToast.success('Profile image uploaded');
      }

      // Upload ID document if selected
      if (idFile) {
        sonnerToast.info('Uploading ID document...');
        const folder = detectFolder(idFile, 'id-document');
        const signedUrlData = await getSignedUrl(
          folder,
          idFile.name,
          idFile.type,
          idFile.size
        );
        
        await uploadToSignedUrl(
          signedUrlData.uploadUrl,
          idFile,
          signedUrlData.fields
        );
        
        idDocumentRelativePath = signedUrlData.relativePath;
        sonnerToast.success('ID document uploaded');
      }

      // Build JSON payload
      const payload: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        phone: formData.phoneNumber,
        userType,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth,
        isActive: formData.isActive
      };

      // Add optional fields
      if (formData.nic) payload.nic = formData.nic;
      if (formData.birthCertificateNo) payload.birthCertificateNo = formData.birthCertificateNo;
      if (formData.addressLine1) payload.addressLine1 = formData.addressLine1;
      if (formData.addressLine2) payload.addressLine2 = formData.addressLine2;
      if (formData.city) payload.city = formData.city;
      if (formData.district) payload.district = formData.district;
      if (formData.province) payload.province = formData.province;
      if (formData.postalCode) payload.postalCode = formData.postalCode;
      if (formData.country) payload.country = formData.country;
      
      // Add uploaded file paths
      if (profileImageRelativePath) payload.imageUrl = profileImageRelativePath;
      if (idDocumentRelativePath) payload.idUrl = idDocumentRelativePath;

      // Add student data if applicable
      if (userType === 'USER' || userType === 'USER_WITHOUT_PARENT') {
        payload.studentData = {
          studentId: studentData.studentId || undefined,
          emergencyContact: studentData.emergencyContact || undefined,
          medicalConditions: studentData.medicalConditions || undefined,
          allergies: studentData.allergies || undefined,
          bloodGroup: studentData.bloodGroup || undefined,
          fatherId: studentData.fatherId ? Number(String(studentData.fatherId)) : undefined,
          fatherPhoneNumber: studentData.fatherPhoneNumber || undefined,
          motherId: studentData.motherId ? Number(String(studentData.motherId)) : undefined,
          motherPhoneNumber: studentData.motherPhoneNumber || undefined,
          guardianId: studentData.guardianId ? Number(String(studentData.guardianId)) : undefined,
          guardianPhoneNumber: studentData.guardianPhoneNumber || undefined
        };
      }

      // Add parent data if applicable
      if (userType === 'USER' || userType === 'USER_WITHOUT_STUDENT') {
        payload.parentData = {
          occupation: parentData.occupation || undefined,
          workplace: parentData.workplace || undefined,
          workPhone: parentData.workPhone || undefined,
          educationLevel: parentData.educationLevel || undefined
        };
      }

      const response = await apiClient.post('/users/comprehensive', payload);
      toast({
        title: "Success",
        description: response.message || "User created successfully!"
      });
      onSubmit(response);
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || 'Failed to create user',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const showStudentData = userType === 'USER' || userType === 'USER_WITHOUT_PARENT';
  const showParentData = userType === 'USER' || userType === 'USER_WITHOUT_STUDENT';
  const [occupationOpen, setOccupationOpen] = useState(false);
  const [districtOpen, setDistrictOpen] = useState(false);
  const [provinceOpen, setProvinceOpen] = useState(false);
  const occupationOptions = useMemo(() => Object.values(Occupation).map(value => ({
    value,
    label: value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  })), []);
  const districtOptions = useMemo(() => Object.values(District).map(value => ({
    value,
    label: value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  })), []);
  const provinceOptions = useMemo(() => Object.values(Province).map(value => ({
    value,
    label: value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  })), []);
  return <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-6xl max-h-[98vh] overflow-y-auto p-6 sm:p-8">
        
        <DialogHeader className="pb-6 border-b">
          <DialogTitle className="text-3xl sm:text-4xl font-bold text-center bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Create Comprehensive User
          </DialogTitle>
          <p className="text-muted-foreground text-center mt-2">Create a user with complete profile information</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="max-w-4xl mx-auto">
            <div className="space-y-8">
              {/* User Type Selection */}
              <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-6 rounded-lg border">
                <h3 className="text-2xl font-semibold flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  User Type
                </h3>
                
                <div>
                  <Label htmlFor="userType" className="text-base font-semibold text-foreground">Select User Type *</Label>
                  <Select value={userType} onValueChange={value => setUserType(value as UserType)}>
                    <SelectTrigger className="mt-2 h-12 text-base">
                      <SelectValue placeholder="Select user type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER">USER (Can be both student and parent)</SelectItem>
                      <SelectItem value="USER_WITHOUT_PARENT">USER WITHOUT PARENT (Cannot be assigned as parent)</SelectItem>
                      <SelectItem value="USER_WITHOUT_STUDENT">USER WITHOUT STUDENT (Cannot be assigned as student)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-2">
                    {userType === 'USER' && 'This user can play any institute role and can be assigned as both student and parent'}
                    {userType === 'USER_WITHOUT_PARENT' && 'This user can play any institute role but CANNOT be assigned as parent'}
                    {userType === 'USER_WITHOUT_STUDENT' && 'This user can play any institute role but CANNOT be assigned as student'}
                  </p>
                </div>
              </div>

              {/* Image Upload Section */}
              <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-6 rounded-lg border">
                <h3 className="text-2xl font-semibold flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                    <ImageIcon className="h-4 w-4 text-primary" />
                  </div>
                  Profile Image
                </h3>
                
                <div className="space-y-4">
                  {imagePreview && <div className="flex flex-col items-center gap-4">
                      <div className="relative">
                        <img src={imagePreview} alt="Preview" className="w-32 h-32 rounded-full object-cover border-4 border-primary/20" />
                        <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-8 w-8 rounded-full" onClick={() => {
                      setImagePreview(null);
                      setImageFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>}
                  
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                    <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 w-full sm:w-auto">
                      <ImageIcon className="h-4 w-4" />
                      Choose Image
                    </Button>
                    <Button type="button" variant="outline" onClick={openCamera} className="flex items-center gap-2 w-full sm:w-auto">
                      <Camera className="h-4 w-4" />
                      Take Photo
                    </Button>
                  </div>
                </div>
              </div>

              {/* Personal Information Section */}
              <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-6 rounded-lg border">
                <h3 className="text-2xl font-semibold flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                    <span className="text-primary font-bold">1</span>
                  </div>
                  Personal Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="firstName" className="text-base font-semibold">First Name *</Label>
                    <Input id="firstName" value={formData.firstName} onChange={e => handleInputChange('firstName', e.target.value)} className="mt-2 h-12 text-base" placeholder="Enter first name" required />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-base font-semibold">Last Name *</Label>
                    <Input id="lastName" value={formData.lastName} onChange={e => handleInputChange('lastName', e.target.value)} className="mt-2 h-12 text-base" placeholder="Enter last name" required />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-base font-semibold">Email Address *</Label>
                    <Input id="email" type="email" value={formData.email} onChange={e => handleInputChange('email', e.target.value)} className="mt-2 h-12 text-base" placeholder="Enter email address" required />
                  </div>
                  <div>
                    <Label htmlFor="phoneNumber" className="text-base font-semibold">Phone Number *</Label>
                    <Input id="phoneNumber" value={formData.phoneNumber} onChange={e => handleInputChange('phoneNumber', e.target.value)} className="mt-2 h-12 text-base" placeholder="+94XXXXXXXXX" required />
                  </div>
                  <div>
                    <Label htmlFor="gender" className="text-base font-semibold">Gender *</Label>
                    <Select value={formData.gender} onValueChange={value => handleInputChange('gender', value)}>
                      <SelectTrigger className="mt-2 h-12 text-base">
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
                    <Label htmlFor="dateOfBirth" className="text-base font-semibold">Date of Birth *</Label>
                    <div className="relative mt-2">
                      <Input id="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={e => handleInputChange('dateOfBirth', e.target.value)} className="h-12 text-base" required />
                      <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="nic" className="text-base font-semibold">NIC</Label>
                    <Input id="nic" value={formData.nic} onChange={e => handleInputChange('nic', e.target.value)} className="mt-2 h-12 text-base" placeholder="Enter NIC number" />
                  </div>
                  <div>
                    <Label htmlFor="birthCertificateNo" className="text-base font-semibold">Birth Certificate No</Label>
                    <Input id="birthCertificateNo" value={formData.birthCertificateNo} onChange={e => handleInputChange('birthCertificateNo', e.target.value)} className="mt-2 h-12 text-base" placeholder="BC-XXXXXXXXX" />
                  </div>
                </div>
              </div>

              {/* Address Information Section */}
              <div className="bg-gradient-to-r from-secondary/5 to-secondary/10 p-6 rounded-lg border">
                <h3 className="text-2xl font-semibold flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 bg-secondary/20 rounded-full flex items-center justify-center">
                    <span className="text-secondary-foreground font-bold">2</span>
                  </div>
                  Address Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="addressLine1" className="text-base font-semibold">Address Line 1</Label>
                    <Input id="addressLine1" value={formData.addressLine1} onChange={e => handleInputChange('addressLine1', e.target.value)} className="mt-2 h-12 text-base" placeholder="Street address" />
                  </div>
                  <div>
                    <Label htmlFor="addressLine2" className="text-base font-semibold">Address Line 2</Label>
                    <Input id="addressLine2" value={formData.addressLine2} onChange={e => handleInputChange('addressLine2', e.target.value)} className="mt-2 h-12 text-base" placeholder="Apartment, building" />
                  </div>
                  <div>
                    <Label htmlFor="city" className="text-base font-semibold">City</Label>
                    <Input id="city" value={formData.city} onChange={e => handleInputChange('city', e.target.value)} className="mt-2 h-12 text-base" placeholder="Enter city" />
                  </div>
                  <div>
                    <Label htmlFor="district" className="text-base font-semibold">District</Label>
                    <Popover open={districtOpen} onOpenChange={setDistrictOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" aria-expanded={districtOpen} className="w-full justify-between mt-2 h-12 text-base font-normal">
                          {formData.district ? districtOptions.find(district => district.value === formData.district)?.label : "Select district"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search district..." />
                          <CommandList>
                            <CommandEmpty>No district found.</CommandEmpty>
                            <CommandGroup>
                              {districtOptions.map(district => <CommandItem key={district.value} value={district.label} onSelect={() => {
                              handleInputChange('district', district.value);
                              setDistrictOpen(false);
                            }}>
                                  <Check className={cn("mr-2 h-4 w-4", formData.district === district.value ? "opacity-100" : "opacity-0")} />
                                  {district.label}
                                </CommandItem>)}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label htmlFor="province" className="text-base font-semibold">Province</Label>
                    <Popover open={provinceOpen} onOpenChange={setProvinceOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" aria-expanded={provinceOpen} className="w-full justify-between mt-2 h-12 text-base font-normal">
                          {formData.province ? provinceOptions.find(province => province.value === formData.province)?.label : "Select province"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search province..." />
                          <CommandList>
                            <CommandEmpty>No province found.</CommandEmpty>
                            <CommandGroup>
                              {provinceOptions.map(province => <CommandItem key={province.value} value={province.label} onSelect={() => {
                              handleInputChange('province', province.value);
                              setProvinceOpen(false);
                            }}>
                                  <Check className={cn("mr-2 h-4 w-4", formData.province === province.value ? "opacity-100" : "opacity-0")} />
                                  {province.label}
                                </CommandItem>)}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label htmlFor="postalCode" className="text-base font-semibold">Postal Code</Label>
                    <Input id="postalCode" value={formData.postalCode} onChange={e => handleInputChange('postalCode', e.target.value)} className="mt-2 h-12 text-base" placeholder="Enter postal code" />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="country" className="text-base font-semibold">Country</Label>
                    <Input id="country" value={formData.country} onChange={e => handleInputChange('country', e.target.value)} className="mt-2 h-12 text-base" placeholder="Sri Lanka" />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="idUrl" className="text-base font-semibold">ID Document URL</Label>
                    <Input id="idUrl" value={formData.idUrl} onChange={e => handleInputChange('idUrl', e.target.value)} className="mt-2 h-12 text-base" placeholder="https://example.com/id-document.pdf" />
                  </div>
                </div>
              </div>

              {/* Student Data Section */}
              {showStudentData && <div className="bg-gradient-to-r from-blue-500/5 to-blue-500/10 p-6 rounded-lg border border-blue-500/20">
                  <h3 className="text-2xl font-semibold flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                      <GraduationCap className="h-4 w-4 text-blue-600" />
                    </div>
                    Student Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="studentId" className="text-base font-semibold">Student ID</Label>
                      <Input id="studentId" value={studentData.studentId} onChange={e => handleStudentDataChange('studentId', e.target.value)} className="mt-2 h-12 text-base" placeholder="STU-2025-XXX" />
                    </div>
                    <div>
                      <Label htmlFor="emergencyContact" className="text-base font-semibold">Emergency Contact</Label>
                      <Input id="emergencyContact" value={studentData.emergencyContact} onChange={e => handleStudentDataChange('emergencyContact', e.target.value)} className="mt-2 h-12 text-base" placeholder="+94XXXXXXXXX" />
                    </div>
                    <div>
                      <Label htmlFor="medicalConditions" className="text-base font-semibold">Medical Conditions</Label>
                      <Input id="medicalConditions" value={studentData.medicalConditions} onChange={e => handleStudentDataChange('medicalConditions', e.target.value)} className="mt-2 h-12 text-base" placeholder="None or specify conditions" />
                    </div>
                    <div>
                      <Label htmlFor="allergies" className="text-base font-semibold">Allergies</Label>
                      <Input id="allergies" value={studentData.allergies} onChange={e => handleStudentDataChange('allergies', e.target.value)} className="mt-2 h-12 text-base" placeholder="None or specify allergies" />
                    </div>
                    <div>
                      <Label htmlFor="bloodGroup" className="text-base font-semibold">Blood Group</Label>
                      <Select value={studentData.bloodGroup} onValueChange={value => handleStudentDataChange('bloodGroup', value)}>
                        <SelectTrigger className="mt-2 h-12 text-base">
                          <SelectValue placeholder="Select blood group" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A_POSITIVE">A+</SelectItem>
                          <SelectItem value="A_NEGATIVE">A-</SelectItem>
                          <SelectItem value="B_POSITIVE">B+</SelectItem>
                          <SelectItem value="B_NEGATIVE">B-</SelectItem>
                          <SelectItem value="O_POSITIVE">O+</SelectItem>
                          <SelectItem value="O_NEGATIVE">O-</SelectItem>
                          <SelectItem value="AB_POSITIVE">AB+</SelectItem>
                          <SelectItem value="AB_NEGATIVE">AB-</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="fatherId" className="text-base font-semibold">Father ID</Label>
                      <Input id="fatherId" value={studentData.fatherId} onChange={e => handleStudentDataChange('fatherId', e.target.value)} className="mt-2 h-12 text-base" placeholder="User ID" />
                    </div>
                    <div>
                      <Label htmlFor="fatherPhoneNumber" className="text-base font-semibold">Father Phone Number</Label>
                      <Input id="fatherPhoneNumber" value={studentData.fatherPhoneNumber} onChange={e => handleStudentDataChange('fatherPhoneNumber', e.target.value)} className="mt-2 h-12 text-base" placeholder="+94XXXXXXXXX" />
                    </div>
                    <div>
                      <Label htmlFor="motherId" className="text-base font-semibold">Mother ID</Label>
                      <Input id="motherId" value={studentData.motherId} onChange={e => handleStudentDataChange('motherId', e.target.value)} className="mt-2 h-12 text-base" placeholder="User ID" />
                    </div>
                    <div>
                      <Label htmlFor="motherPhoneNumber" className="text-base font-semibold">Mother Phone Number</Label>
                      <Input id="motherPhoneNumber" value={studentData.motherPhoneNumber} onChange={e => handleStudentDataChange('motherPhoneNumber', e.target.value)} className="mt-2 h-12 text-base" placeholder="+94XXXXXXXXX" />
                    </div>
                    <div>
                      <Label htmlFor="guardianId" className="text-base font-semibold">Guardian ID</Label>
                      <Input id="guardianId" value={studentData.guardianId} onChange={e => handleStudentDataChange('guardianId', e.target.value)} className="mt-2 h-12 text-base" placeholder="User ID" />
                    </div>
                    <div>
                      <Label htmlFor="guardianPhoneNumber" className="text-base font-semibold">Guardian Phone Number</Label>
                      <Input id="guardianPhoneNumber" value={studentData.guardianPhoneNumber} onChange={e => handleStudentDataChange('guardianPhoneNumber', e.target.value)} className="mt-2 h-12 text-base" placeholder="+94XXXXXXXXX" />
                    </div>
                  </div>
                </div>}

              {/* Parent Data Section */}
              {showParentData && <div className="bg-gradient-to-r from-purple-500/5 to-purple-500/10 p-6 rounded-lg border border-purple-500/20">
                  <h3 className="text-2xl font-semibold flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                      <Users className="h-4 w-4 text-purple-600" />
                    </div>
                    Parent Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="occupation" className="text-base font-semibold">Occupation</Label>
                    <Popover open={occupationOpen} onOpenChange={setOccupationOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" aria-expanded={occupationOpen} className="w-full justify-between mt-2 h-12 text-base font-normal">
                          {parentData.occupation ? occupationOptions.find(occ => occ.value === parentData.occupation)?.label : "Select occupation"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search occupation..." />
                          <CommandList>
                            <CommandEmpty>No occupation found.</CommandEmpty>
                            <CommandGroup>
                              {occupationOptions.map(occupation => <CommandItem key={occupation.value} value={occupation.label} onSelect={() => {
                              handleParentDataChange('occupation', occupation.value);
                              setOccupationOpen(false);
                            }}>
                                  <Check className={cn("mr-2 h-4 w-4", parentData.occupation === occupation.value ? "opacity-100" : "opacity-0")} />
                                  {occupation.label}
                                </CommandItem>)}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                    <div>
                      <Label htmlFor="workplace" className="text-base font-semibold">Workplace</Label>
                      <Input id="workplace" value={parentData.workplace} onChange={e => handleParentDataChange('workplace', e.target.value)} className="mt-2 h-12 text-base" placeholder="Enter workplace" />
                    </div>
                    <div>
                      <Label htmlFor="workPhone" className="text-base font-semibold">Work Phone</Label>
                      <Input id="workPhone" value={parentData.workPhone} onChange={e => handleParentDataChange('workPhone', e.target.value)} className="mt-2 h-12 text-base" placeholder="+94XXXXXXXXX" />
                    </div>
                    <div>
                      <Label htmlFor="educationLevel" className="text-base font-semibold">Education Level</Label>
                      <Input id="educationLevel" value={parentData.educationLevel} onChange={e => handleParentDataChange('educationLevel', e.target.value)} className="mt-2 h-12 text-base" placeholder="Enter education level" />
                    </div>
                  </div>
                </div>}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-4 pt-8 border-t">
            <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto h-12 px-8 text-base">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto h-12 px-8 text-base bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary">
              {isLoading ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Camera Modal */}
      <Dialog open={isCameraOpen} onOpenChange={open => !open && closeCamera()}>
        <DialogContent className="max-w-[95vw] sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Take Photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <AspectRatio ratio={3 / 4} className="bg-black rounded-lg overflow-hidden">
              <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />
            </AspectRatio>
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={switchCamera} className="w-full sm:flex-1">
                <Camera className="h-4 w-4 mr-2" />
                Switch to {facingMode === 'user' ? 'Back' : 'Front'} Camera
              </Button>
              <Button type="button" onClick={capturePhoto} className="w-full sm:flex-1">
                <Camera className="h-4 w-4 mr-2" />
                Capture Photo
              </Button>
              <Button type="button" variant="outline" onClick={closeCamera} className="w-full sm:w-auto">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>;
};
export default CreateComprehensiveUserForm;