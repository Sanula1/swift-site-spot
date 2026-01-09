import ModernNavigation from "@/components/ModernNavigation";
import { env } from "@/config/env";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ValidatedInput } from "@/components/ValidatedInput";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookOpen, Mail, Phone, MapPin, FileText, Upload, Heart, AlertCircle, User, Users, Baby, Edit2, CheckCircle2, Loader2, Globe, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import { PhoneInput } from "@/components/ui/phone-input";
import { ParentExistsForm, saveRegisteredParent, getRegisteredParent, type ParentSelectionData } from "@/components/ParentExistsForm";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { uploadFile, createComprehensiveUser, ComprehensiveUserRequest, generateSignedUrl, uploadFileToSignedUrl, updateProfileImage, requestPhoneOTP, verifyPhoneOTP, requestEmailOTP, verifyEmailOTP } from "@/lib/api";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { OccupationSelect } from "@/components/OccupationSelect";
import { SimpleLocationSelector } from "@/components/SimpleLocationSelector";
import { EmailHelpSection } from "@/components/EmailHelpSection";
import { 
  validateMinAge, 
  validateNotFutureDate, 
  validateRequired, 
  validateEmail, 
  validatePhone,
  validateBirthCertificate,
  LANGUAGE_OPTIONS,
  type LanguageCode
} from "@/utils/formValidations";
// Storage keys for form persistence
const STORAGE_KEY_REGISTRATION_STATE = "suraksha_student_registration_state";
const STORAGE_KEY_FORM_DATA = "suraksha_student_form_data";

const RegisterStudent = () => {
  const {
    toast
  } = useToast();
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState("father");

  // Form states
  const [showFatherForm, setShowFatherForm] = useState(true);
  const [showMotherForm, setShowMotherForm] = useState(false);
  const [showGuardianForm, setShowGuardianForm] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // Edit mode states
  const [fatherEditMode, setFatherEditMode] = useState(false);
  const [motherEditMode, setMotherEditMode] = useState(false);
  const [guardianEditMode, setGuardianEditMode] = useState(false);

  // Existing parent states
  const [fatherExists, setFatherExists] = useState(false);
  const [motherExists, setMotherExists] = useState(false);
  const [guardianExists, setGuardianExists] = useState(false);

  // Tab completion states
  const [fatherCompleted, setFatherCompleted] = useState(false);
  const [motherCompleted, setMotherCompleted] = useState(false);
  const [guardianCompleted, setGuardianCompleted] = useState(false);
  const [skipFather, setSkipFather] = useState(false);
  const [skipMother, setSkipMother] = useState(false);
  const [skipGuardian, setSkipGuardian] = useState(false);
  
  // Skip reason states
  const [fatherSkipReason, setFatherSkipReason] = useState("");
  const [motherSkipReason, setMotherSkipReason] = useState("");
  const [guardianSkipReason, setGuardianSkipReason] = useState("");

  // Image crop states
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string>("");
  const [currentImageSetter, setCurrentImageSetter] = useState<any>(null);

  // State for student submission
  const [studentSubmitted, setStudentSubmitted] = useState(false);

  // Loading states
  const [isSubmittingFather, setIsSubmittingFather] = useState(false);
  const [isSubmittingMother, setIsSubmittingMother] = useState(false);
  const [isSubmittingGuardian, setIsSubmittingGuardian] = useState(false);
  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);

  // Store created parent IDs
  const [createdFatherId, setCreatedFatherId] = useState<string>("");
  const [createdMotherId, setCreatedMotherId] = useState<string>("");
  const [createdGuardianId, setCreatedGuardianId] = useState<string>("");

  // Student verification states
  const [studentPhoneVerified, setStudentPhoneVerified] = useState(false);
  const [studentEmailVerified, setStudentEmailVerified] = useState(false);
  const [showStudentForm, setShowStudentForm] = useState(false); // Only show form after clicking Next
  const [studentPhoneForVerification, setStudentPhoneForVerification] = useState("+94");
  const [studentEmailForVerification, setStudentEmailForVerification] = useState("");
  const [phoneOTP, setPhoneOTP] = useState("");
  const [emailOTP, setEmailOTP] = useState("");
  const [isRequestingPhoneOTP, setIsRequestingPhoneOTP] = useState(false);
  const [isVerifyingPhoneOTP, setIsVerifyingPhoneOTP] = useState(false);
  const [isRequestingEmailOTP, setIsRequestingEmailOTP] = useState(false);
  const [isVerifyingEmailOTP, setIsVerifyingEmailOTP] = useState(false);
  const [phoneOTPSent, setPhoneOTPSent] = useState(false);
  const [emailOTPSent, setEmailOTPSent] = useState(false);

  // Parent verification states
  const [fatherPhoneVerified, setFatherPhoneVerified] = useState(false);
  const [fatherEmailVerified, setFatherEmailVerified] = useState(false);
  const [motherPhoneVerified, setMotherPhoneVerified] = useState(false);
  const [motherEmailVerified, setMotherEmailVerified] = useState(false);
  const [guardianPhoneVerified, setGuardianPhoneVerified] = useState(false);
  const [guardianEmailVerified, setGuardianEmailVerified] = useState(false);

  // State for clear data confirmation dialog
  const [showClearDataDialog, setShowClearDataDialog] = useState(false);

  // Check if any cached data exists
  const hasCachedData = () => {
    try {
      const savedState = sessionStorage.getItem(STORAGE_KEY_REGISTRATION_STATE);
      const savedFormData = sessionStorage.getItem(STORAGE_KEY_FORM_DATA);
      return !!(savedState || savedFormData);
    } catch {
      return false;
    }
  };

  // Clear all registration data from sessionStorage (more secure than localStorage)
  const handleClearAllData = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY_REGISTRATION_STATE);
      sessionStorage.removeItem(STORAGE_KEY_FORM_DATA);
      
      // Reset all form states to initial values
      setActiveTab("father");
      setShowFatherForm(true);
      setShowMotherForm(false);
      setShowGuardianForm(false);
      setFatherEditMode(false);
      setMotherEditMode(false);
      setGuardianEditMode(false);
      setFatherExists(false);
      setMotherExists(false);
      setGuardianExists(false);
      setFatherCompleted(false);
      setMotherCompleted(false);
      setGuardianCompleted(false);
      setSkipFather(false);
      setSkipMother(false);
      setSkipGuardian(false);
      setFatherSkipReason("");
      setMotherSkipReason("");
      setGuardianSkipReason("");
      setStudentSubmitted(false);
      setCreatedFatherId("");
      setCreatedMotherId("");
      setCreatedGuardianId("");
      setFatherPhoneVerified(false);
      setFatherEmailVerified(false);
      setMotherPhoneVerified(false);
      setMotherEmailVerified(false);
      setGuardianPhoneVerified(false);
      setGuardianEmailVerified(false);
      setStudentPhoneVerified(false);
      setStudentEmailVerified(false);
      setShowStudentForm(false);
      
      // Reset form data
      setFatherData({
        firstName: "",
        lastName: "",
        nameWithInitials: "",
        email: "",
        phoneNumber: "",
        userType: "USER_WITHOUT_STUDENT",
        gender: "MALE",
        dateOfBirth: "",
        birthCertificateNo: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        district: "",
        province: "",
        postalCode: "",
        country: "Sri Lanka",
        language: "E" as LanguageCode,
        image: null,
        additionalInfo: {
          occupation: "",
          workplace: "",
          workPhone: "",
          educationLevel: ""
        }
      });
      
      setMotherData({
        firstName: "",
        lastName: "",
        nameWithInitials: "",
        email: "",
        phoneNumber: "",
        userType: "USER_WITHOUT_STUDENT",
        gender: "FEMALE",
        dateOfBirth: "",
        birthCertificateNo: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        district: "",
        province: "",
        postalCode: "",
        country: "Sri Lanka",
        language: "E" as LanguageCode,
        image: null,
        additionalInfo: {
          occupation: "",
          workplace: "",
          workPhone: "",
          educationLevel: ""
        }
      });
      
      setGuardianData({
        firstName: "",
        lastName: "",
        nameWithInitials: "",
        email: "",
        phoneNumber: "",
        userType: "USER_WITHOUT_STUDENT",
        gender: "MALE",
        dateOfBirth: "",
        birthCertificateNo: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        district: "",
        province: "",
        postalCode: "",
        country: "Sri Lanka",
        language: "E" as LanguageCode,
        image: null,
        additionalInfo: {
          occupation: "",
          workplace: "",
          workPhone: "",
          educationLevel: ""
        }
      });
      
      setShowClearDataDialog(false);
      
      toast({
        title: "Data Cleared",
        description: "All saved registration data has been cleared successfully."
      });
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to clear saved data. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Calculate progress percentage - 25% per section
  const calculateProgress = () => {
    let progress = 0;
    // Father section completed (skip, exists, or form filled)
    if (fatherCompleted || fatherExists || skipFather) progress = 25;
    // Mother section completed
    if (motherCompleted || motherExists || skipMother) progress = 50;
    // Guardian section completed
    if (guardianCompleted || guardianExists || skipGuardian) progress = 75;
    // Student submitted
    if (studentSubmitted) progress = 100;
    return progress;
  };
  // Form validation error states
  const [fatherErrors, setFatherErrors] = useState<Record<string, string>>({});
  const [motherErrors, setMotherErrors] = useState<Record<string, string>>({});
  const [guardianErrors, setGuardianErrors] = useState<Record<string, string>>({});
  const [studentErrors, setStudentErrors] = useState<Record<string, string>>({});

  const [fatherData, setFatherData] = useState({
    firstName: "",
    lastName: "",
    nameWithInitials: "",
    email: "",
    phoneNumber: "",
    userType: "USER_WITHOUT_STUDENT",
    gender: "MALE", // Father must be MALE
    dateOfBirth: "",
    birthCertificateNo: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    district: "",
    province: "",
    postalCode: "",
    country: "Sri Lanka",
    language: "E" as LanguageCode,
    image: null as File | null,
    additionalInfo: {
      occupation: "",
      workplace: "",
      workPhone: "",
      educationLevel: ""
    }
  });
  const [motherData, setMotherData] = useState({
    firstName: "",
    lastName: "",
    nameWithInitials: "",
    email: "",
    phoneNumber: "",
    userType: "USER_WITHOUT_STUDENT",
    gender: "FEMALE", // Mother must be FEMALE (default)
    dateOfBirth: "",
    birthCertificateNo: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    district: "",
    province: "",
    postalCode: "",
    country: "Sri Lanka",
    language: "E" as LanguageCode,
    image: null as File | null,
    additionalInfo: {
      occupation: "",
      workplace: "",
      workPhone: "",
      educationLevel: ""
    }
  });
  const [guardianData, setGuardianData] = useState({
    firstName: "",
    lastName: "",
    nameWithInitials: "",
    email: "",
    phoneNumber: "",
    userType: "USER_WITHOUT_STUDENT",
    gender: "", // Guardian can select
    dateOfBirth: "",
    birthCertificateNo: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    district: "",
    province: "",
    postalCode: "",
    country: "Sri Lanka",
    language: "E" as LanguageCode,
    image: null as File | null,
    additionalInfo: {
      occupation: "",
      workplace: "",
      workPhone: "",
      educationLevel: ""
    }
  });
  const [studentData, setStudentData] = useState({
    firstName: "",
    lastName: "",
    nameWithInitials: "",
    email: "",
    phoneNumber: "",
    userType: "USER_WITHOUT_PARENT",
    gender: "", // Student can select
    dateOfBirth: "",
    birthCertificateNo: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    district: "",
    province: "",
    postalCode: "",
    country: "Sri Lanka",
    language: "E" as LanguageCode,
    image: null as File | null,
    studentData: {
      studentId: null,
      emergencyContact: "+94",
      medicalConditions: "",
      allergies: "",
      bloodGroup: "",
      fatherId: "",
      motherId: "",
      guardianId: ""
    }
  });

  // Load saved form data and state from sessionStorage on mount (more secure than localStorage)
  useEffect(() => {
    try {
      // Load registration state
      const savedState = sessionStorage.getItem(STORAGE_KEY_REGISTRATION_STATE);
      if (savedState) {
        const state = JSON.parse(savedState);
        setActiveTab(state.activeTab || "father");
        setFatherCompleted(state.fatherCompleted || false);
        setMotherCompleted(state.motherCompleted || false);
        setGuardianCompleted(state.guardianCompleted || false);
        setFatherExists(state.fatherExists || false);
        setMotherExists(state.motherExists || false);
        setGuardianExists(state.guardianExists || false);
        setSkipFather(state.skipFather || false);
        setSkipMother(state.skipMother || false);
        setSkipGuardian(state.skipGuardian || false);
        setFatherSkipReason(state.fatherSkipReason || "");
        setMotherSkipReason(state.motherSkipReason || "");
        setGuardianSkipReason(state.guardianSkipReason || "");
        setCreatedFatherId(state.createdFatherId || "");
        setCreatedMotherId(state.createdMotherId || "");
        setCreatedGuardianId(state.createdGuardianId || "");
        setShowFatherForm(state.showFatherForm ?? true);
        setShowMotherForm(state.showMotherForm || false);
        setShowGuardianForm(state.showGuardianForm || false);
        setFatherEditMode(state.fatherEditMode || false);
        setMotherEditMode(state.motherEditMode || false);
        setGuardianEditMode(state.guardianEditMode || false);
        setFatherPhoneVerified(state.fatherPhoneVerified || false);
        setFatherEmailVerified(state.fatherEmailVerified || false);
        setMotherPhoneVerified(state.motherPhoneVerified || false);
        setMotherEmailVerified(state.motherEmailVerified || false);
        setGuardianPhoneVerified(state.guardianPhoneVerified || false);
        setGuardianEmailVerified(state.guardianEmailVerified || false);

        // Restore selected parent IDs (existing or created)
        if (state.fatherId) {
          setStudentData((prev) => ({
            ...prev,
            studentData: { ...prev.studentData, fatherId: state.fatherId }
          }));
        }
        if (state.motherId) {
          setStudentData((prev) => ({
            ...prev,
            studentData: { ...prev.studentData, motherId: state.motherId }
          }));
        }
        if (state.guardianId) {
          setStudentData((prev) => ({
            ...prev,
            studentData: { ...prev.studentData, guardianId: state.guardianId }
          }));
        }
      }

      // Check for previously registered parents and auto-set their IDs
      const savedFather = getRegisteredParent("Father");
      const savedMother = getRegisteredParent("Mother");
      const savedGuardian = getRegisteredParent("Guardian");
      
      if (savedFather && !createdFatherId) {
        setCreatedFatherId(savedFather.id);
        setStudentData(prev => ({
          ...prev,
          studentData: { ...prev.studentData, fatherId: savedFather.id }
        }));
      }
      if (savedMother && !createdMotherId) {
        setCreatedMotherId(savedMother.id);
        setStudentData(prev => ({
          ...prev,
          studentData: { ...prev.studentData, motherId: savedMother.id }
        }));
      }
      if (savedGuardian && !createdGuardianId) {
        setCreatedGuardianId(savedGuardian.id);
        setStudentData(prev => ({
          ...prev,
          studentData: { ...prev.studentData, guardianId: savedGuardian.id }
        }));
      }
    } catch (e) {
      // Error loading saved registration data
    }
    setIsInitialized(true);
  }, []);

  // Save registration state to sessionStorage when it changes (more secure than localStorage)
  useEffect(() => {
    if (!isInitialized) return;
    try {
      const state = {
        activeTab,
        fatherCompleted,
        motherCompleted,
        guardianCompleted,
        fatherExists,
        motherExists,
        guardianExists,
        skipFather,
        skipMother,
        skipGuardian,
        fatherSkipReason,
        motherSkipReason,
        guardianSkipReason,
        fatherId: studentData.studentData.fatherId,
        motherId: studentData.studentData.motherId,
        guardianId: studentData.studentData.guardianId,
        createdFatherId,
        createdMotherId,
        createdGuardianId,
        showFatherForm,
        showMotherForm,
        showGuardianForm,
        fatherEditMode,
        motherEditMode,
        guardianEditMode,
        fatherPhoneVerified,
        fatherEmailVerified,
        motherPhoneVerified,
        motherEmailVerified,
        guardianPhoneVerified,
        guardianEmailVerified
      };
      sessionStorage.setItem(STORAGE_KEY_REGISTRATION_STATE, JSON.stringify(state));
    } catch (e) {
      // Error saving registration state
    }
  }, [isInitialized, activeTab, fatherCompleted, motherCompleted, guardianCompleted, fatherExists, motherExists, guardianExists, skipFather, skipMother, skipGuardian, fatherSkipReason, motherSkipReason, guardianSkipReason, createdFatherId, createdMotherId, createdGuardianId, showFatherForm, showMotherForm, showGuardianForm, fatherEditMode, motherEditMode, guardianEditMode, fatherPhoneVerified, fatherEmailVerified, motherPhoneVerified, motherEmailVerified, guardianPhoneVerified, guardianEmailVerified]);

  // Clear saved data after successful registration completion
  const clearSavedRegistrationData = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY_REGISTRATION_STATE);
    } catch (e) {
      // Error clearing saved data
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<any>>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type and size
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      const maxSize = 5 * 1024 * 1024; // 5MB
      
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Only PNG, JPEG, and JPG files are allowed",
          variant: "destructive"
        });
        e.target.value = '';
        return;
      }
      
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: "File size must be less than 5MB",
          variant: "destructive"
        });
        e.target.value = '';
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        setImageToCrop(reader.result as string);
        setCurrentImageSetter(() => setter);
        setCropDialogOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };
  const handleCropComplete = (croppedImage: Blob) => {
    if (currentImageSetter) {
      const file = new File([croppedImage], "cropped-image.jpg", {
        type: "image/jpeg"
      });
      currentImageSetter((prev: any) => ({
        ...prev,
        image: file
      }));
    }
  };
  
  // Scroll to top helper
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExistingFather = (id: string, phoneNumber: string) => {
    setFatherExists(true);
    setFatherCompleted(true);
    setShowFatherForm(false);
    setFatherEditMode(false);
    setStudentData(prev => ({
      ...prev,
      studentData: {
        ...prev.studentData,
        fatherId: id
      }
    }));
    setActiveTab("mother");
    setShowMotherForm(true);
    scrollToTop();
  };
  const handleNewFather = (phoneNumber: string, email: string) => {
    setFatherExists(false);
    setFatherEditMode(true);
    setShowFatherForm(false);
    setFatherCompleted(false);
    setFatherData({
      ...fatherData,
      phoneNumber,
      email
    });
    // Mark as verified since they came from ParentExistsForm verification
    if (phoneNumber && phoneNumber !== "+94") {
      setFatherPhoneVerified(true);
    }
    if (email) {
      setFatherEmailVerified(true);
    }
    scrollToTop();
  };
  const handleExistingMother = (id: string, phoneNumber: string) => {
    setMotherExists(true);
    setMotherCompleted(true);
    setShowMotherForm(false);
    setMotherEditMode(false);
    setStudentData(prev => ({
      ...prev,
      studentData: {
        ...prev.studentData,
        motherId: id
      }
    }));
    setActiveTab("guardian");
    setShowGuardianForm(true);
    scrollToTop();
  };
  const handleNewMother = (phoneNumber: string, email: string) => {
    setMotherExists(false);
    setMotherEditMode(true);
    setShowMotherForm(false);
    setMotherCompleted(false);
    setMotherData({
      ...motherData,
      phoneNumber,
      email
    });
    // Mark as verified since they came from ParentExistsForm verification
    if (phoneNumber && phoneNumber !== "+94") {
      setMotherPhoneVerified(true);
    }
    if (email) {
      setMotherEmailVerified(true);
    }
    scrollToTop();
  };
  const handleExistingGuardian = (id: string, phoneNumber: string) => {
    setGuardianExists(true);
    setGuardianCompleted(true);
    setShowGuardianForm(false);
    setGuardianEditMode(false);
    setStudentData(prev => ({
      ...prev,
      studentData: {
        ...prev.studentData,
        guardianId: id
      }
    }));
    setActiveTab("student");
    scrollToTop();
  };
  const handleNewGuardian = (phoneNumber: string, email: string) => {
    setGuardianExists(false);
    setGuardianEditMode(true);
    setShowGuardianForm(false);
    setGuardianCompleted(false);
    setGuardianData({
      ...guardianData,
      phoneNumber,
      email
    });
    // Mark as verified since they came from ParentExistsForm verification
    if (phoneNumber && phoneNumber !== "+94") {
      setGuardianPhoneVerified(true);
    }
    if (email) {
      setGuardianEmailVerified(true);
    }
    scrollToTop();
  };

  const handleSkipFather = (reason?: string) => {
    setSkipFather(true);
    setFatherSkipReason(reason || "");
    setShowFatherForm(false);
    // If skip father, mother cannot be skipped
    setActiveTab("mother");
    setShowMotherForm(true);
    scrollToTop();
  };
  const handleSkipMother = (reason?: string) => {
    // Allow skipping mother - mother can always be skipped
    setSkipMother(true);
    setMotherSkipReason(reason || "");
    setMotherCompleted(true);
    setShowMotherForm(false);
    setActiveTab("guardian");
    setShowGuardianForm(true);
    scrollToTop();
  };
  const handleSkipGuardian = (reason?: string) => {
    // Guardian can be skipped if at least one parent (father or mother) is provided
    const hasAnyParent = fatherCompleted || fatherExists || motherCompleted || motherExists;
    if (hasAnyParent) {
      setSkipGuardian(true);
      setGuardianSkipReason(reason || "");
      setGuardianCompleted(true);
      setActiveTab("student");
      scrollToTop();
    } else {
      toast({
        title: "Guardian Required",
        description: "Guardian details are required when no Father or Mother information is provided.",
        variant: "destructive"
      });
    }
  };
  
  // Reset selection handlers
  const handleResetFatherSelection = () => {
    setFatherExists(false);
    setFatherCompleted(false);
    setSkipFather(false);
    setFatherSkipReason("");
    setCreatedFatherId("");
    setFatherEditMode(false);
    setShowFatherForm(true);
    setFatherPhoneVerified(false);
    setFatherEmailVerified(false);
    setStudentData(prev => ({
      ...prev,
      studentData: { ...prev.studentData, fatherId: "" }
    }));
  };
  
  const handleResetMotherSelection = () => {
    setMotherExists(false);
    setMotherCompleted(false);
    setSkipMother(false);
    setMotherSkipReason("");
    setCreatedMotherId("");
    setMotherEditMode(false);
    setShowMotherForm(true);
    setMotherPhoneVerified(false);
    setMotherEmailVerified(false);
    setStudentData(prev => ({
      ...prev,
      studentData: { ...prev.studentData, motherId: "" }
    }));
  };
  
  const handleResetGuardianSelection = () => {
    setGuardianExists(false);
    setGuardianCompleted(false);
    setSkipGuardian(false);
    setGuardianSkipReason("");
    setCreatedGuardianId("");
    setGuardianEditMode(false);
    setShowGuardianForm(true);
    setGuardianPhoneVerified(false);
    setGuardianEmailVerified(false);
    setStudentData(prev => ({
      ...prev,
      studentData: { ...prev.studentData, guardianId: "" }
    }));
  };
  
  // Helper to get selection data for each parent type
  const getFatherSelectionData = () => {
    if (skipFather) {
      return { type: "skipped" as const, skipReason: fatherSkipReason };
    }
    if (fatherExists && studentData.studentData.fatherId) {
      return { type: "existing" as const, id: studentData.studentData.fatherId };
    }
    if (createdFatherId) {
      const savedFather = getRegisteredParent("Father");
      return { 
        type: "created" as const, 
        id: createdFatherId, 
        name: savedFather?.name,
        imageUrl: savedFather?.imageUrl 
      };
    }
    return undefined;
  };
  
  const getMotherSelectionData = () => {
    if (skipMother) {
      return { type: "skipped" as const, skipReason: motherSkipReason };
    }
    if (motherExists && studentData.studentData.motherId) {
      return { type: "existing" as const, id: studentData.studentData.motherId };
    }
    if (createdMotherId) {
      const savedMother = getRegisteredParent("Mother");
      return { 
        type: "created" as const, 
        id: createdMotherId, 
        name: savedMother?.name,
        imageUrl: savedMother?.imageUrl 
      };
    }
    return undefined;
  };
  
  const getGuardianSelectionData = () => {
    if (skipGuardian) {
      return { type: "skipped" as const, skipReason: guardianSkipReason };
    }
    if (guardianExists && studentData.studentData.guardianId) {
      return { type: "existing" as const, id: studentData.studentData.guardianId };
    }
    if (createdGuardianId) {
      const savedGuardian = getRegisteredParent("Guardian");
      return { 
        type: "created" as const, 
        id: createdGuardianId, 
        name: savedGuardian?.name,
        imageUrl: savedGuardian?.imageUrl 
      };
    }
    return undefined;
  };

  // Student phone verification handlers
  const handleRequestPhoneOTP = async () => {
    if (!studentPhoneForVerification || studentPhoneForVerification === "+94") {
      toast({
        title: "Validation Error",
        description: "Please enter a valid phone number",
        variant: "destructive"
      });
      return;
    }
    setIsRequestingPhoneOTP(true);
    try {
      await requestPhoneOTP(studentPhoneForVerification);
      setPhoneOTPSent(true);
      toast({
        title: "OTP Sent",
        description: "Verification code sent to your phone number"
      });
    } catch (error: any) {
      const errorMessage = error.message || "Failed to send OTP";
      const userId = error.userId || "";
      const statusCode = error.statusCode || "";
      
      toast({
        title: "Error",
        description: userId 
          ? `${errorMessage} (User ID: ${userId}, Status: ${statusCode})`
          : errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsRequestingPhoneOTP(false);
    }
  };
  const handleVerifyPhoneOTP = async () => {
    if (!phoneOTP || phoneOTP.length !== 6) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid 6-digit OTP",
        variant: "destructive"
      });
      return;
    }
    setIsVerifyingPhoneOTP(true);
    try {
      await verifyPhoneOTP(studentPhoneForVerification, phoneOTP);
      setStudentPhoneVerified(true);
      setStudentData(prev => ({
        ...prev,
        phoneNumber: studentPhoneForVerification
      }));
      toast({
        title: "Phone Verified",
        description: "Your phone number has been verified successfully"
      });
    } catch (error: any) {
      const errorMessage = error.message || "Invalid OTP code";
      const userId = error.userId || "";
      const statusCode = error.statusCode || "";
      
      toast({
        title: "Verification Failed",
        description: userId 
          ? `${errorMessage} (User ID: ${userId}, Status: ${statusCode})`
          : errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsVerifyingPhoneOTP(false);
    }
  };

  // Student email verification handlers
  const handleRequestEmailOTP = async () => {
    if (!studentEmailForVerification || !studentEmailForVerification.includes("@")) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }
    setIsRequestingEmailOTP(true);
    try {
      await requestEmailOTP(studentEmailForVerification);
      setEmailOTPSent(true);
      toast({
        title: "OTP Sent",
        description: "Verification code sent to your email"
      });
    } catch (error: any) {
      const errorMessage = error.message || "Failed to send OTP";
      const userId = error.userId || "";
      const statusCode = error.statusCode || "";
      
      toast({
        title: "Error",
        description: userId 
          ? `${errorMessage} (User ID: ${userId}, Status: ${statusCode})`
          : errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsRequestingEmailOTP(false);
    }
  };
  const handleVerifyEmailOTP = async () => {
    if (!emailOTP || emailOTP.length !== 6) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid 6-digit OTP",
        variant: "destructive"
      });
      return;
    }
    setIsVerifyingEmailOTP(true);
    try {
      await verifyEmailOTP(studentEmailForVerification, emailOTP);
      setStudentEmailVerified(true);
      setStudentData(prev => ({
        ...prev,
        email: studentEmailForVerification
      }));
      toast({
        title: "Email Verified",
        description: "Your email has been verified successfully"
      });
    } catch (error: any) {
      const errorMessage = error.message || "Invalid OTP code";
      const userId = error.userId || "";
      const statusCode = error.statusCode || "";
      
      toast({
        title: "Verification Failed",
        description: userId 
          ? `${errorMessage} (User ID: ${userId}, Status: ${statusCode})`
          : errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsVerifyingEmailOTP(false);
    }
  };

  // Comprehensive validation for parent/guardian (must be 16+ years old)
  const validateParentData = (data: typeof fatherData | typeof motherData | typeof guardianData, type: string) => {
    const errors: Record<string, string> = {};

    // Required field validations
    const firstNameResult = validateRequired(data.firstName, 'First name');
    if (!firstNameResult.isValid) errors.firstName = firstNameResult.error!;

    const lastNameResult = validateRequired(data.lastName, 'Last name');
    if (!lastNameResult.isValid) errors.lastName = lastNameResult.error!;

    // Name with initials is required
    const nameWithInitialsResult = validateRequired(data.nameWithInitials, 'Name with initials');
    if (!nameWithInitialsResult.isValid) errors.nameWithInitials = nameWithInitialsResult.error!;

    const emailResult = validateEmail(data.email);
    if (!emailResult.isValid) errors.email = emailResult.error!;

    const phoneResult = validatePhone(data.phoneNumber);
    if (!phoneResult.isValid) errors.phoneNumber = phoneResult.error!;

    const genderResult = validateRequired(data.gender, 'Gender');
    if (!genderResult.isValid) errors.gender = genderResult.error!;

    // Date of birth - must be at least 16 years old
    const dobResult = validateMinAge(data.dateOfBirth, 16);
    if (!dobResult.isValid) errors.dateOfBirth = dobResult.error!;

    // Birth certificate is required
    const bcResult = validateBirthCertificate(data.birthCertificateNo);
    if (!bcResult.isValid) errors.birthCertificateNo = bcResult.error!;

    // District and Province are required
    const districtResult = validateRequired(data.district, 'District');
    if (!districtResult.isValid) errors.district = districtResult.error!;

    const provinceResult = validateRequired(data.province, 'Province');
    if (!provinceResult.isValid) errors.province = provinceResult.error!;

    return { isValid: Object.keys(errors).length === 0, errors };
  };

  // Validation for student (no age restriction, but not future date)
  const validateStudentFormData = (data: typeof studentData) => {
    const errors: Record<string, string> = {};

    // Required field validations
    const firstNameResult = validateRequired(data.firstName, 'First name');
    if (!firstNameResult.isValid) errors.firstName = firstNameResult.error!;

    const lastNameResult = validateRequired(data.lastName, 'Last name');
    if (!lastNameResult.isValid) errors.lastName = lastNameResult.error!;

    // Name with initials is required
    const nameWithInitialsResult = validateRequired(data.nameWithInitials, 'Name with initials');
    if (!nameWithInitialsResult.isValid) errors.nameWithInitials = nameWithInitialsResult.error!;

    const emailResult = validateEmail(data.email);
    if (!emailResult.isValid) errors.email = emailResult.error!;

    const genderResult = validateRequired(data.gender, 'Gender');
    if (!genderResult.isValid) errors.gender = genderResult.error!;

    // Date of birth - cannot be future date
    const dobResult = validateNotFutureDate(data.dateOfBirth);
    if (!dobResult.isValid) errors.dateOfBirth = dobResult.error!;

    // Birth certificate is required
    const bcResult = validateBirthCertificate(data.birthCertificateNo);
    if (!bcResult.isValid) errors.birthCertificateNo = bcResult.error!;

    // District and Province are required
    const districtResult = validateRequired(data.district, 'District');
    if (!districtResult.isValid) errors.district = districtResult.error!;

    const provinceResult = validateRequired(data.province, 'Province');
    if (!provinceResult.isValid) errors.province = provinceResult.error!;

    // Profile image is required for student
    if (!data.image) {
      errors.image = 'Profile image is required';
    }

    return { isValid: Object.keys(errors).length === 0, errors };
  };

  const validateFatherData = () => {
    const result = validateParentData(fatherData, 'Father');
    setFatherErrors(result.errors);
    return result.isValid;
  };
  const validateMotherData = () => {
    const result = validateParentData(motherData, 'Mother');
    setMotherErrors(result.errors);
    return result.isValid;
  };
  const validateGuardianData = () => {
    const result = validateParentData(guardianData, 'Guardian');
    setGuardianErrors(result.errors);
    return result.isValid;
  };
  const validateStudentData = () => {
    const result = validateStudentFormData(studentData);
    setStudentErrors(result.errors);
    return result.isValid;
  };
  const handleNextToMother = async () => {
    // If edit mode, validate and submit
    if (fatherEditMode && !fatherExists) {
      if (!validateFatherData()) {
        toast({
          title: "Validation Error",
          description: "Please fill all required Father details",
          variant: "destructive"
        });
        return;
      }
    }
    if (fatherEditMode && !fatherExists) {
      setIsSubmittingFather(true);
      try {
        // Upload image if present
        let imageUrl = "";
        if (fatherData.image) {
          imageUrl = await uploadFile(fatherData.image, 'profile');
        }

        // Create father user
        const requestBody: ComprehensiveUserRequest = {
          firstName: fatherData.firstName,
          lastName: fatherData.lastName,
          email: fatherData.email,
          phoneNumber: fatherData.phoneNumber,
          userType: "USER_WITHOUT_STUDENT",
          gender: fatherData.gender,
          dateOfBirth: fatherData.dateOfBirth,
          birthCertificateNo: fatherData.birthCertificateNo,
          language: fatherData.language,
          addressLine1: fatherData.addressLine1,
          addressLine2: fatherData.addressLine2,
          city: fatherData.city,
          district: fatherData.district,
          province: fatherData.province,
          postalCode: fatherData.postalCode,
          country: fatherData.country,
          imageUrl: imageUrl,
          isActive: true,
          parentData: {
            occupation: fatherData.additionalInfo.occupation,
            workplace: fatherData.additionalInfo.workplace,
            workPhone: fatherData.additionalInfo.workPhone,
            educationLevel: fatherData.additionalInfo.educationLevel
          }
        };
        const response = await createComprehensiveUser(requestBody);
        if (response.success) {
          setCreatedFatherId(response.userId);
          setFatherCompleted(true);
          setFatherEditMode(false);

          // Auto-populate father ID in student form
          setStudentData(prev => ({
            ...prev,
            studentData: {
            ...prev.studentData,
              fatherId: response.userId
            }
          }));
          
          // Save to local storage for cross-tab/session access (use form data, not response)
          saveRegisteredParent({
            id: response.userId,
            type: "Father",
            name: `${fatherData.firstName} ${fatherData.lastName}`,
            imageUrl: imageUrl // Use the uploaded imageUrl from form, not response
          });
          
          toast({
            title: "Success",
            description: "Father details created successfully"
          });

          // Continue to mother tab
          setActiveTab("mother");
          setShowMotherForm(true);
        }
      } catch (error: any) {
        const errorMessage = error?.message || "Failed to create father user";
        const userId = error?.userId || "";
        const statusCode = error?.statusCode || "";
        let description = errorMessage;
        if (userId) {
          description += `\nUser ID: ${userId}`;
        }
        if (statusCode) {
          description += `\nStatus Code: ${statusCode}`;
        }
        toast({
          title: "Error",
          description: description,
          variant: "destructive"
        });
      } finally {
        setIsSubmittingFather(false);
      }
    } else {
      setActiveTab("mother");
      setShowMotherForm(true);
    }
  };
  const handleNextToGuardian = async () => {
    // If edit mode, validate and submit
    if (motherEditMode && !motherExists) {
      if (!validateMotherData()) {
        toast({
          title: "Validation Error",
          description: "Please fill all required Mother details",
          variant: "destructive"
        });
        return;
      }
    }
    if (motherEditMode && !motherExists) {
      setIsSubmittingMother(true);
      try {
        // Upload image if present
        let imageUrl = "";
        if (motherData.image) {
          imageUrl = await uploadFile(motherData.image, 'profile');
        }

        // Create mother user
        const requestBody: ComprehensiveUserRequest = {
          firstName: motherData.firstName,
          lastName: motherData.lastName,
          email: motherData.email,
          phoneNumber: motherData.phoneNumber,
          userType: "USER_WITHOUT_STUDENT",
          gender: motherData.gender,
          dateOfBirth: motherData.dateOfBirth,
          birthCertificateNo: motherData.birthCertificateNo,
          language: motherData.language,
          addressLine1: motherData.addressLine1,
          addressLine2: motherData.addressLine2,
          city: motherData.city,
          district: motherData.district,
          province: motherData.province,
          postalCode: motherData.postalCode,
          country: motherData.country,
          imageUrl: imageUrl,
          isActive: true,
          parentData: {
            occupation: motherData.additionalInfo.occupation,
            workplace: motherData.additionalInfo.workplace,
            workPhone: motherData.additionalInfo.workPhone,
            educationLevel: motherData.additionalInfo.educationLevel
          }
        };
        const response = await createComprehensiveUser(requestBody);
        if (response.success) {
          setCreatedMotherId(response.userId);
          setMotherCompleted(true);
          setMotherEditMode(false);

          // Auto-populate mother ID in student form
          setStudentData(prev => ({
            ...prev,
            studentData: {
              ...prev.studentData,
              motherId: response.userId
            }
          }));
          
          // Save to local storage for cross-tab/session access (use form data, not response)
          saveRegisteredParent({
            id: response.userId,
            type: "Mother",
            name: `${motherData.firstName} ${motherData.lastName}`,
            imageUrl: imageUrl // Use the uploaded imageUrl from form, not response
          });
          
          toast({
            title: "Success",
            description: "Mother details created successfully"
          });

          // Continue to guardian tab
          setActiveTab("guardian");
          setShowGuardianForm(true);
        }
      } catch (error: any) {
        const errorMessage = error?.message || "Failed to create mother user";
        const userId = error?.userId || "";
        const statusCode = error?.statusCode || "";
        let description = errorMessage;
        if (userId) {
          description += `\nUser ID: ${userId}`;
        }
        if (statusCode) {
          description += `\nStatus Code: ${statusCode}`;
        }
        toast({
          title: "Error",
          description: description,
          variant: "destructive"
        });
      } finally {
        setIsSubmittingMother(false);
      }
    } else {
      setActiveTab("guardian");
      setShowGuardianForm(true);
    }
  };
  const handleNextToStudent = async () => {
    // Validate parent information based on what was filled
    const hasFather = studentData.studentData.fatherId || fatherCompleted;
    const hasMother = studentData.studentData.motherId || motherCompleted;
    const hasGuardian = studentData.studentData.guardianId || guardianCompleted || guardianExists;

    // Guardian is optional if either father or mother details are provided
    // Guardian is required only if both father and mother are skipped
    if (!hasFather && !hasMother && !hasGuardian && !skipGuardian) {
      toast({
        title: "Validation Error",
        description: "Please provide at least one parent/guardian information (Father, Mother, or Guardian)",
        variant: "destructive"
      });
      return;
    }
    if (skipGuardian) {
      setGuardianCompleted(true);
      setActiveTab("student");
      return;
    }

    // If edit mode, validate and submit
    if (guardianEditMode && !guardianExists) {
      if (!validateGuardianData()) {
        toast({
          title: "Validation Error",
          description: "Please fill all required Guardian details or skip Guardian",
          variant: "destructive"
        });
        return;
      }
    }
    if (guardianEditMode && !guardianExists) {
      setIsSubmittingGuardian(true);
      try {
        // Upload image if present
        let imageUrl = "";
        if (guardianData.image) {
          imageUrl = await uploadFile(guardianData.image, 'profile');
        }

        // Create guardian user
        const requestBody: ComprehensiveUserRequest = {
          firstName: guardianData.firstName,
          lastName: guardianData.lastName,
          email: guardianData.email,
          phoneNumber: guardianData.phoneNumber,
          userType: "USER_WITHOUT_STUDENT",
          gender: guardianData.gender,
          dateOfBirth: guardianData.dateOfBirth,
          birthCertificateNo: guardianData.birthCertificateNo,
          language: guardianData.language,
          addressLine1: guardianData.addressLine1,
          addressLine2: guardianData.addressLine2,
          city: guardianData.city,
          district: guardianData.district,
          province: guardianData.province,
          postalCode: guardianData.postalCode,
          country: guardianData.country,
          imageUrl: imageUrl,
          isActive: true,
          parentData: {
            occupation: guardianData.additionalInfo.occupation,
            workplace: guardianData.additionalInfo.workplace,
            workPhone: guardianData.additionalInfo.workPhone,
            educationLevel: guardianData.additionalInfo.educationLevel
          }
        };
        const response = await createComprehensiveUser(requestBody);
        if (response.success) {
          setCreatedGuardianId(response.userId);
          setGuardianCompleted(true);
          setGuardianEditMode(false);

          // Auto-populate guardian ID in student form
          setStudentData(prev => ({
            ...prev,
            studentData: {
              ...prev.studentData,
              guardianId: response.userId
            }
          }));
          
          // Save to local storage for cross-tab/session access (use form data, not response)
          saveRegisteredParent({
            id: response.userId,
            type: "Guardian",
            name: `${guardianData.firstName} ${guardianData.lastName}`,
            imageUrl: imageUrl // Use the uploaded imageUrl from form, not response
          });
          
          toast({
            title: "Success",
            description: "Guardian details created successfully"
          });

          // Continue to student tab
          setActiveTab("student");
        }
      } catch (error: any) {
        const errorMessage = error?.message || "Failed to create guardian user";
        const userId = error?.userId || "";
        const statusCode = error?.statusCode || "";
        let description = errorMessage;
        if (userId) {
          description += `\nUser ID: ${userId}`;
        }
        if (statusCode) {
          description += `\nStatus Code: ${statusCode}`;
        }
        toast({
          title: "Error",
          description: description,
          variant: "destructive"
        });
      } finally {
        setIsSubmittingGuardian(false);
      }
    } else if (guardianExists || validateGuardianData()) {
      if (guardianExists) {
        setGuardianCompleted(true);
      } else if (validateGuardianData()) {
        setGuardianCompleted(true);
      }
      setActiveTab("student");
    }
  };
  const handleSubmit = async () => {
    if (!validateStudentData()) {
      toast({
        title: "Validation Error",
        description: "Please fill all required Student details",
        variant: "destructive"
      });
      return;
    }
    setIsSubmittingStudent(true);
    try {
      // Upload image if present
      let imageUrl = "";
      if (studentData.image) {
        imageUrl = await uploadFile(studentData.image, 'profile');
      }

      // Create student user
      const requestBody: ComprehensiveUserRequest = {
        firstName: studentData.firstName,
        lastName: studentData.lastName,
        email: studentData.email,
        phoneNumber: studentData.phoneNumber,
        userType: "USER_WITHOUT_PARENT",
        gender: studentData.gender,
        dateOfBirth: studentData.dateOfBirth,
        birthCertificateNo: studentData.birthCertificateNo,
        language: studentData.language,
        addressLine1: studentData.addressLine1,
        addressLine2: studentData.addressLine2,
        city: studentData.city,
        district: studentData.district,
        province: studentData.province,
        postalCode: studentData.postalCode,
        country: studentData.country,
        imageUrl: imageUrl,
        isActive: true,
        studentData: {
          studentId: studentData.studentData.studentId,
          emergencyContact: studentData.studentData.emergencyContact,
          medicalConditions: studentData.studentData.medicalConditions,
          allergies: studentData.studentData.allergies,
          bloodGroup: studentData.studentData.bloodGroup,
          fatherId: studentData.studentData.fatherId || createdFatherId,
          motherId: studentData.studentData.motherId || createdMotherId,
          guardianId: studentData.studentData.guardianId || createdGuardianId
        }
      };
      const response = await createComprehensiveUser(requestBody);
      if (response.success) {
        setStudentSubmitted(true);
        toast({
          title: "Success",
          description: "Student registered successfully!"
        });
        setShowSuccessDialog(true);
      }
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to create student user";
      const userId = error?.userId || "";
      const statusCode = error?.statusCode || "";
      let description = errorMessage;
      if (userId) {
        description += `\nUser ID: ${userId}`;
      }
      if (statusCode) {
        description += `\nStatus Code: ${statusCode}`;
      }
      toast({
        title: "Error",
        description: description,
        variant: "destructive"
      });
    } finally {
      setIsSubmittingStudent(false);
    }
  };
  return <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{
        animationDelay: '2s'
      }}></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-secondary/5 rounded-full blur-3xl animate-pulse" style={{
        animationDelay: '1s'
      }}></div>
      </div>
      
      <ModernNavigation />
      
      <div className="pt-24 pb-12 px-4 max-w-4xl mx-auto relative z-10">
        {/* Official Notice Alert */}
        

        <Card className="backdrop-blur-xl bg-card/95 border-2 border-border/50 shadow-2xl opacity-75 relative overflow-hidden hover:shadow-3xl transition-all duration-500 animate-fade-in">
          {/* Card header gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-primary animate-[shimmer_2s_ease-in-out_infinite]"></div>
          
          <CardHeader className="text-center space-y-4 pb-6">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-background flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300 animate-scale-in p-2">
              <img src={env.logoUrl} alt="SurakshaLMS Logo" className="w-full h-full object-contain" />
            </div>
            <CardTitle className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-fade-in">
              Registration
            </CardTitle>
            <CardDescription className="text-base sm:text-lg text-muted-foreground animate-fade-in" style={{
            animationDelay: '0.1s'
          }}>
              Begin your educational journey with us
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8 animate-fade-in" style={{
          animationDelay: '0.2s'
        }}>
            {/* Progress Bar with Clear Data Button */}
            <div className="space-y-3 p-4 bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl border border-primary/10 hover:border-primary/20 transition-all duration-300">
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-muted-foreground flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                  Registration Progress
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-primary font-bold text-lg">{calculateProgress()}%</span>
                  {hasCachedData() && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowClearDataDialog(true)}
                      className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50 flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear All
                    </Button>
                  )}
                </div>
              </div>
              <Progress value={calculateProgress()} className="h-3 [&>div]:bg-gradient-primary [&>div]:transition-all [&>div]:duration-500 shadow-inner" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Start</span>
                <span className="font-semibold text-primary">Step {activeTab === 'father' ? '1' : activeTab === 'mother' ? '2' : activeTab === 'guardian' ? '3' : '4'} of 4</span>
                <span>Complete</span>
              </div>
            </div>

            {/* Clear Data Confirmation Dialog */}
            <AlertDialog open={showClearDataDialog} onOpenChange={setShowClearDataDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                    <Trash2 className="w-5 h-5" />
                    Clear All Registration Data?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all saved form data including Father, Mother, Guardian, and Student information. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <Button variant="outline" onClick={() => setShowClearDataDialog(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleClearAllData} className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Clear All Data
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            {/* User ID Bar - Shows created IDs for reference */}
            {(createdFatherId || createdMotherId || createdGuardianId) && (
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-xl border border-green-200 dark:border-green-800/30 animate-fade-in">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="font-semibold text-green-800 dark:text-green-300">Registered User IDs</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  {createdFatherId && (
                    <div className="flex items-center gap-2 p-2 bg-background/80 rounded-lg border border-border/50">
                      <User className="w-4 h-4 text-blue-600" />
                      <span className="text-muted-foreground">Father:</span>
                      <span className="font-mono text-xs text-foreground truncate">{createdFatherId}</span>
                    </div>
                  )}
                  {createdMotherId && (
                    <div className="flex items-center gap-2 p-2 bg-background/80 rounded-lg border border-border/50">
                      <User className="w-4 h-4 text-pink-600" />
                      <span className="text-muted-foreground">Mother:</span>
                      <span className="font-mono text-xs text-foreground truncate">{createdMotherId}</span>
                    </div>
                  )}
                  {createdGuardianId && (
                    <div className="flex items-center gap-2 p-2 bg-background/80 rounded-lg border border-border/50">
                      <Users className="w-4 h-4 text-purple-600" />
                      <span className="text-muted-foreground">Guardian:</span>
                      <span className="font-mono text-xs text-foreground truncate">{createdGuardianId}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <Tabs value={activeTab} onValueChange={newTab => {
            // Check if user has reached Student tab (can now navigate freely to completed sections)
            const hasReachedStudent = activeTab === "student" || studentSubmitted;
            
            // If user is at Student tab, they can go back to any completed section to view/change selection
            if (hasReachedStudent && (newTab === "father" || newTab === "mother" || newTab === "guardian")) {
              if (newTab === "father" && (fatherCompleted || fatherExists || skipFather)) {
                setShowFatherForm(true);
                setFatherEditMode(false);
                setActiveTab(newTab);
                return;
              }
              if (newTab === "mother" && (motherCompleted || motherExists || skipMother)) {
                setShowMotherForm(true);
                setMotherEditMode(false);
                setActiveTab(newTab);
                return;
              }
              if (newTab === "guardian" && (guardianCompleted || guardianExists || skipGuardian)) {
                setShowGuardianForm(true);
                setGuardianEditMode(false);
                setActiveTab(newTab);
                return;
              }
              return;
            }
            
            // Prevent navigation to locked tabs (forward direction only if not completed)
            if (newTab === "mother" && !fatherCompleted && !fatherExists && !skipFather) return;
            if (newTab === "guardian" && !motherCompleted && !motherExists && !skipMother) return;
            if (newTab === "student" && !guardianCompleted && !guardianExists && !skipGuardian) return;

            // Show ParentExistsForm when navigating to parent/guardian tabs (so selection summary is visible)
            if (newTab === "father") {
              setShowFatherForm(true);
              setActiveTab(newTab);
            } else if (newTab === "mother") {
              setShowMotherForm(true);
              setActiveTab(newTab);
            } else if (newTab === "guardian") {
              setShowGuardianForm(true);
              setActiveTab(newTab);
            } else {
              setActiveTab(newTab);
            }
          }} className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 p-1.5 rounded-xl shadow-inner border border-border/30">
                <TabsTrigger 
                  value="father" 
                  className="flex items-center gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground rounded-lg transition-all duration-300 data-[state=active]:shadow-lg hover:scale-105"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden data-[state=active]:inline sm:inline font-semibold">Father</span>
                  {(fatherCompleted || fatherExists) && <CheckCircle2 className="w-4 h-4 text-green-500 data-[state=active]:text-primary-foreground" />}
                  {skipFather && !fatherCompleted && !fatherExists && (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-yellow-500 data-[state=active]:text-primary-foreground" />
                      <span className="text-xs text-yellow-600">(Skipped)</span>
                    </>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="mother" 
                  className="flex items-center gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground rounded-lg transition-all duration-300 data-[state=active]:shadow-lg hover:scale-105"
                  disabled={!fatherCompleted && !fatherExists && !skipFather}
                >
                  <User className="w-4 h-4" />
                  <span className="hidden data-[state=active]:inline sm:inline font-semibold">Mother</span>
                  {(motherCompleted || motherExists) && <CheckCircle2 className="w-4 h-4 text-green-500 data-[state=active]:text-primary-foreground" />}
                  {skipMother && !motherCompleted && !motherExists && (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-yellow-500 data-[state=active]:text-primary-foreground" />
                      <span className="text-xs text-yellow-600">(Skipped)</span>
                    </>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="guardian" 
                  className="flex items-center gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground rounded-lg transition-all duration-300 data-[state=active]:shadow-lg hover:scale-105" 
                  disabled={!motherCompleted && !motherExists && !skipMother}
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden data-[state=active]:inline sm:inline font-semibold">Guardian</span>
                  {(guardianCompleted || guardianExists) && <CheckCircle2 className="w-4 h-4 text-green-500 data-[state=active]:text-primary-foreground" />}
                  {skipGuardian && !guardianCompleted && !guardianExists && (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-yellow-500 data-[state=active]:text-primary-foreground" />
                      <span className="text-xs text-yellow-600">(Skipped)</span>
                    </>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="student" 
                  className="flex items-center gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground rounded-lg transition-all duration-300 data-[state=active]:shadow-lg hover:scale-105" 
                  disabled={!guardianCompleted && !guardianExists && !skipGuardian}
                >
                  <Baby className="w-4 h-4" />
                  <span className="hidden data-[state=active]:inline sm:inline font-semibold">Student</span>
                  {studentSubmitted && <CheckCircle2 className="w-4 h-4 text-green-500 data-[state=active]:text-primary-foreground" />}
                </TabsTrigger>
              </TabsList>

              {/* Father Details Tab */}
              <TabsContent value="father" className="space-y-6 mt-6">
                {showFatherForm && !fatherEditMode ? <ParentExistsForm parentType="Father" onExistingParent={handleExistingFather} onNewParent={handleNewFather} onSkip={handleSkipFather} selectionData={getFatherSelectionData()} onResetSelection={handleResetFatherSelection} /> : <>
                    <div className="space-y-6 animate-fade-in">
                      <div className="flex items-center gap-3 pb-4 border-b border-border/50">
                        <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg animate-pulse">
                          <User className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-foreground">Father Information</h3>
                          <p className="text-sm text-muted-foreground">Fill in your father's details</p>
                        </div>
                      </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 group">
                      <Label htmlFor="father-firstName" className="text-sm font-semibold">First Name *</Label>
                      <ValidatedInput id="father-firstName" value={fatherData.firstName} onChange={e => {
                        const value = e.target.value.toUpperCase().replace(/[^A-Z ]/g, '').replace(/  +/g, ' ');
                        setFatherData({
                          ...fatherData,
                          firstName: value
                        });
                      }} maxLength={50} className={`bg-background/50 hover:border-primary/50 focus:border-primary transition-all duration-200 h-11 ${fatherErrors.firstName ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/50'}`} placeholder="e.g., HEWAGE MUDIYANSELAGE" />
                      {fatherErrors.firstName && <p className="text-xs text-destructive">{fatherErrors.firstName}</p>}
                    </div>
                    
                    <div className="space-y-2 group">
                      <Label htmlFor="father-lastName" className="text-sm font-semibold">Last Name *</Label>
                      <ValidatedInput id="father-lastName" value={fatherData.lastName} onChange={e => {
                        const value = e.target.value.toUpperCase().replace(/[^A-Z ]/g, '').replace(/  +/g, ' ');
                        setFatherData({
                          ...fatherData,
                          lastName: value
                        });
                      }} maxLength={50} className={`bg-background/50 hover:border-primary/50 focus:border-primary transition-all duration-200 h-11 ${fatherErrors.lastName ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/50'}`} placeholder="e.g., DON GAMAGE" />
                      {fatherErrors.lastName && <p className="text-xs text-destructive">{fatherErrors.lastName}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="father-nameWithInitials" className="text-sm font-semibold">Name with Initials *</Label>
                    <Input id="father-nameWithInitials" value={fatherData.nameWithInitials} onChange={e => {
                      const value = e.target.value.toUpperCase().replace(/[^A-Z. ]/g, '').replace(/  +/g, ' ');
                      setFatherData({
                        ...fatherData,
                        nameWithInitials: value
                      });
                    }} maxLength={100} className={`bg-background/50 ${fatherErrors.nameWithInitials ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/50'}`} placeholder="e.g., H.M. DON GAMAGE" />
                    {fatherErrors.nameWithInitials && <p className="text-xs text-destructive">{fatherErrors.nameWithInitials}</p>}
                    <p className="text-xs text-muted-foreground">Enter name with initials (e.g., J. DOE)</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 group">
                      <Label htmlFor="father-email" className="flex items-center gap-2 text-sm font-semibold">
                        <Mail className="w-4 h-4 text-primary" />
                        Email Address *
                        {fatherEmailVerified && <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 animate-pulse" />}
                      </Label>
                      <Input id="father-email" type="email" value={fatherData.email} onChange={e => setFatherData({
                        ...fatherData,
                        email: e.target.value
                      })} disabled={fatherEmailVerified} className={fatherEmailVerified ? "bg-muted/50 border-green-200 dark:border-green-800 cursor-not-allowed h-11" : `bg-background/50 hover:border-primary/50 focus:border-primary transition-all duration-200 h-11 ${fatherErrors.email ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/50'}`} placeholder="email@example.com" />
                      {fatherEmailVerified && <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <CheckCircle2 className="w-3 h-3" />
                          Email verified and locked
                        </div>}
                      {fatherErrors.email && !fatherEmailVerified && <p className="text-xs text-destructive">{fatherErrors.email}</p>}
                      {!fatherEmailVerified && <EmailHelpSection />}
                    </div>
                    
                    <div className="space-y-2 group">
                      <Label htmlFor="father-phone" className="flex items-center gap-2 text-sm font-semibold">
                        <Phone className="w-4 h-4 text-primary" />
                        Phone Number *
                        {fatherPhoneVerified && <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 animate-pulse" />}
                      </Label>
                      <PhoneInput id="father-phone" value={fatherData.phoneNumber} onChange={value => setFatherData({
                        ...fatherData,
                        phoneNumber: value
                      })} disabled={fatherPhoneVerified} className={fatherPhoneVerified ? "bg-muted/50 border-green-200 dark:border-green-800 cursor-not-allowed" : `bg-background/50 hover:border-primary/50 focus:border-primary transition-all duration-200 ${fatherErrors.phoneNumber ? 'phone-input-error' : ''}`} />
                      {fatherPhoneVerified && <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <CheckCircle2 className="w-3 h-3" />
                          Phone verified and locked
                        </div>}
                      {fatherErrors.phoneNumber && !fatherPhoneVerified && <p className="text-xs text-destructive">{fatherErrors.phoneNumber}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="father-dob" className="text-sm font-semibold">Date of Birth *</Label>
                      <Input id="father-dob" type="date" value={fatherData.dateOfBirth} onChange={e => setFatherData({
                        ...fatherData,
                        dateOfBirth: e.target.value
                      })} className={`bg-background/50 ${fatherErrors.dateOfBirth ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/50'}`} />
                      {fatherErrors.dateOfBirth && <p className="text-xs text-destructive">{fatherErrors.dateOfBirth}</p>}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="father-gender" className="text-sm font-semibold">Gender *</Label>
                      <Input id="father-gender" value="Male" disabled className="bg-muted/50 border-border/50 cursor-not-allowed" />
                      <p className="text-xs text-muted-foreground">Father gender is automatically set to Male</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="father-language" className="flex items-center gap-2 text-sm font-semibold">
                        <Globe className="w-4 h-4 text-primary" />
                        Preferred Language
                      </Label>
                      <Select value={fatherData.language} onValueChange={(value: 'E' | 'S' | 'T') => setFatherData({ ...fatherData, language: value })}>
                        <SelectTrigger className="bg-background/50 border-border/50">
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGE_OPTIONS.map(lang => (
                            <SelectItem key={lang.value} value={lang.value}>{lang.label} ({lang.fullLabel})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Important messages and notifications will be sent in this language</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="father-bc" className="text-sm font-semibold">Birth Certificate No *</Label>
                      <Input id="father-bc" value={fatherData.birthCertificateNo} onChange={e => setFatherData({
                        ...fatherData,
                        birthCertificateNo: e.target.value
                      })} className={`bg-background/50 ${fatherErrors.birthCertificateNo ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/50'}`} placeholder="123456789" />
                      {fatherErrors.birthCertificateNo && <p className="text-xs text-destructive">{fatherErrors.birthCertificateNo}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="father-occupation">Occupation</Label>
                      <OccupationSelect value={fatherData.additionalInfo.occupation} onChange={value => setFatherData({
                        ...fatherData,
                        additionalInfo: {
                          ...fatherData.additionalInfo,
                          occupation: value
                        }
                      })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="father-workplace">Workplace</Label>
                      <Input id="father-workplace" value={fatherData.additionalInfo.workplace} onChange={e => setFatherData({
                        ...fatherData,
                        additionalInfo: {
                          ...fatherData.additionalInfo,
                          workplace: e.target.value
                        }
                      })} className="bg-background/50 border-border/50" placeholder="Company name" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="father-workPhone">Work Phone</Label>
                      <PhoneInput id="father-workPhone" value={fatherData.additionalInfo.workPhone} onChange={value => setFatherData({
                        ...fatherData,
                        additionalInfo: {
                          ...fatherData.additionalInfo,
                          workPhone: value
                        }
                      })} className="bg-background/50 border-border/50" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="father-education">Education Level</Label>
                    <Input id="father-education" value={fatherData.additionalInfo.educationLevel} onChange={e => setFatherData({
                      ...fatherData,
                      additionalInfo: {
                        ...fatherData.additionalInfo,
                        educationLevel: e.target.value
                      }
                    })} className="bg-background/50 border-border/50" placeholder="Highest education level" />
                  </div>

                    <div className="space-y-2">
                      <Label htmlFor="father-address1">Address Line 1</Label>
                      <Input id="father-address1" value={fatherData.addressLine1} onChange={e => setFatherData({
                        ...fatherData,
                        addressLine1: e.target.value
                      })} className="bg-background/50 border-border/50" placeholder="Enter address" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="father-address2">Address Line 2</Label>
                      <Input id="father-address2" value={fatherData.addressLine2} onChange={e => setFatherData({
                      ...fatherData,
                      addressLine2: e.target.value
                      })} className="bg-background/50 border-border/50" placeholder="Enter address line 2 (optional)" />
                  </div>

                  <SimpleLocationSelector
                    province={fatherData.province}
                    district={fatherData.district}
                    city={fatherData.city}
                    postalCode={fatherData.postalCode}
                    onProvinceChange={(value) => setFatherData({ ...fatherData, province: value })}
                    onDistrictChange={(value) => setFatherData({ ...fatherData, district: value })}
                    onCityChange={(value) => setFatherData({ ...fatherData, city: value })}
                    onPostalCodeChange={(value) => setFatherData({ ...fatherData, postalCode: value })}
                    errors={{
                      province: fatherErrors.province,
                      district: fatherErrors.district,
                      city: fatherErrors.city,
                      postalCode: fatherErrors.postalCode
                    }}
                  />

                  <div className="space-y-2">
                    <Label htmlFor="father-country">Country</Label>
                    <Input id="father-country" value={fatherData.country} onChange={e => setFatherData({
                      ...fatherData,
                      country: e.target.value
                    })} className="bg-background/50 border-border/50" disabled placeholder="Sri Lanka" />
                  </div>

                   <div className="space-y-2">
                    <Label>Profile Image (Optional)</Label>
                    <div className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                      <input type="file" accept="image/*" onChange={e => handleImageUpload(e, setFatherData)} className="hidden" id="father-image" />
                      <label htmlFor="father-image" className="cursor-pointer">
                        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {fatherData.image ? fatherData.image.name : "Click to upload profile image"}
                        </p>
                      </label>
                    </div>
                  </div>
                
                </div>

                  <div className="flex justify-end pt-8 border-t border-border/30">
                    <Button type="button" onClick={handleNextToMother} size="lg" className="w-full sm:w-auto px-8 bg-gradient-primary hover:opacity-90 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 font-semibold group" disabled={isSubmittingFather}>
                      {isSubmittingFather && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                      <span>{isSubmittingFather ? "Creating Father Profile..." : "Next: Mother Details"}</span>
                      {!isSubmittingFather && <span className="ml-2 group-hover:translate-x-1 transition-transform duration-300">→</span>}
                    </Button>
                    </div>
                  </>}
              </TabsContent>

              {/* Mother Details Tab */}
              <TabsContent value="mother" className="space-y-6 mt-6">
                {showMotherForm && !motherEditMode ? <ParentExistsForm parentType="Mother" onExistingParent={handleExistingMother} onNewParent={handleNewMother} onSkip={handleSkipMother} canSkip={true} selectionData={getMotherSelectionData()} onResetSelection={handleResetMotherSelection} /> : <>
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 pb-4 border-b border-border/50">
                        <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg">
                          <User className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <h3 className="text-2xl font-bold text-foreground">Mother Information</h3>
                      </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="mother-firstName" className="text-sm font-semibold">First Name *</Label>
                      <Input id="mother-firstName" value={motherData.firstName} onChange={e => {
                        const value = e.target.value.toUpperCase().replace(/[^A-Z ]/g, '').replace(/  +/g, ' ');
                        setMotherData({
                          ...motherData,
                          firstName: value
                        });
                      }} maxLength={50} className={`bg-background/50 ${motherErrors.firstName ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/50'}`} placeholder="e.g., HEWAGE MUDIYANSELAGE" />
                      {motherErrors.firstName && <p className="text-xs text-destructive">{motherErrors.firstName}</p>}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="mother-lastName" className="text-sm font-semibold">Last Name *</Label>
                      <Input id="mother-lastName" value={motherData.lastName} onChange={e => {
                        const value = e.target.value.toUpperCase().replace(/[^A-Z ]/g, '').replace(/  +/g, ' ');
                        setMotherData({
                          ...motherData,
                          lastName: value
                        });
                      }} maxLength={50} className={`bg-background/50 ${motherErrors.lastName ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/50'}`} placeholder="e.g., DON GAMAGE" />
                      {motherErrors.lastName && <p className="text-xs text-destructive">{motherErrors.lastName}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mother-nameWithInitials" className="text-sm font-semibold">Name with Initials *</Label>
                    <Input id="mother-nameWithInitials" value={motherData.nameWithInitials} onChange={e => {
                      const value = e.target.value.toUpperCase().replace(/[^A-Z. ]/g, '').replace(/  +/g, ' ');
                      setMotherData({
                        ...motherData,
                        nameWithInitials: value
                      });
                    }} maxLength={100} className={`bg-background/50 ${motherErrors.nameWithInitials ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/50'}`} placeholder="e.g., H.M. DON GAMAGE" />
                    {motherErrors.nameWithInitials && <p className="text-xs text-destructive">{motherErrors.nameWithInitials}</p>}
                    <p className="text-xs text-muted-foreground">Enter name with initials (e.g., J. DOE)</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="mother-email" className="flex items-center gap-2 text-sm font-semibold">
                        Email Address *
                        {motherEmailVerified && <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />}
                      </Label>
                      <Input id="mother-email" type="email" value={motherData.email} onChange={e => setMotherData({
                        ...motherData,
                        email: e.target.value
                      })} disabled={motherEmailVerified} className={motherEmailVerified ? "bg-muted/50 border-border/50 cursor-not-allowed opacity-75" : `bg-background/50 ${motherErrors.email ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/50'}`} placeholder="email@example.com" />
                      {motherEmailVerified && <p className="text-xs text-muted-foreground">Email verified and locked</p>}
                      {motherErrors.email && !motherEmailVerified && <p className="text-xs text-destructive">{motherErrors.email}</p>}
                      {!motherEmailVerified && <EmailHelpSection />}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="mother-phone" className="flex items-center gap-2 text-sm font-semibold">
                        Phone Number *
                        {motherPhoneVerified && <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />}
                      </Label>
                      <PhoneInput id="mother-phone" value={motherData.phoneNumber} onChange={value => setMotherData({
                        ...motherData,
                        phoneNumber: value
                      })} disabled={motherPhoneVerified} className={motherPhoneVerified ? "bg-muted/50 border-border/50 cursor-not-allowed opacity-75" : `bg-background/50 ${motherErrors.phoneNumber ? 'phone-input-error' : 'border-border/50'}`} />
                      {motherPhoneVerified && <p className="text-xs text-muted-foreground">Phone verified and locked</p>}
                      {motherErrors.phoneNumber && !motherPhoneVerified && <p className="text-xs text-destructive">{motherErrors.phoneNumber}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="mother-dob" className="text-sm font-semibold">Date of Birth *</Label>
                      <Input id="mother-dob" type="date" value={motherData.dateOfBirth} onChange={e => setMotherData({
                        ...motherData,
                        dateOfBirth: e.target.value
                      })} className={`bg-background/50 ${motherErrors.dateOfBirth ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/50'}`} />
                      {motherErrors.dateOfBirth && <p className="text-xs text-destructive">{motherErrors.dateOfBirth}</p>}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="mother-gender" className="text-sm font-semibold">Gender *</Label>
                      <Input id="mother-gender" value="Female" disabled className="bg-muted/50 border-border/50 cursor-not-allowed" />
                      <p className="text-xs text-muted-foreground">Mother gender is automatically set to Female</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mother-language" className="flex items-center gap-2 text-sm font-semibold">
                        <Globe className="w-4 h-4 text-primary" />
                        Preferred Language
                      </Label>
                      <Select value={motherData.language} onValueChange={(value: 'E' | 'S' | 'T') => setMotherData({ ...motherData, language: value })}>
                        <SelectTrigger className="bg-background/50 border-border/50">
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGE_OPTIONS.map(lang => (
                            <SelectItem key={lang.value} value={lang.value}>{lang.label} ({lang.fullLabel})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Important messages will be sent in this language</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="mother-bc" className="text-sm font-semibold">Birth Certificate No *</Label>
                      <Input id="mother-bc" value={motherData.birthCertificateNo} onChange={e => setMotherData({
                        ...motherData,
                        birthCertificateNo: e.target.value
                      })} className={`bg-background/50 ${motherErrors.birthCertificateNo ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/50'}`} placeholder="123456789" />
                      {motherErrors.birthCertificateNo && <p className="text-xs text-destructive">{motherErrors.birthCertificateNo}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mother-occupation">Occupation</Label>
                      <OccupationSelect value={motherData.additionalInfo.occupation} onChange={value => setMotherData({
                        ...motherData,
                        additionalInfo: {
                          ...motherData.additionalInfo,
                          occupation: value
                        }
                      })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="mother-workplace">Workplace</Label>
                      <Input id="mother-workplace" value={motherData.additionalInfo.workplace} onChange={e => setMotherData({
                        ...motherData,
                        additionalInfo: {
                          ...motherData.additionalInfo,
                          workplace: e.target.value
                        }
                      })} className="bg-background/50 border-border/50" placeholder="Company name" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mother-workPhone">Work Phone</Label>
                      <PhoneInput id="mother-workPhone" value={motherData.additionalInfo.workPhone} onChange={value => setMotherData({
                        ...motherData,
                        additionalInfo: {
                          ...motherData.additionalInfo,
                          workPhone: value
                        }
                      })} className="bg-background/50 border-border/50" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mother-education">Education Level</Label>
                    <Input id="mother-education" value={motherData.additionalInfo.educationLevel} onChange={e => setMotherData({
                      ...motherData,
                      additionalInfo: {
                        ...motherData.additionalInfo,
                        educationLevel: e.target.value
                      }
                    })} className="bg-background/50 border-border/50" placeholder="Highest education level" />
                  </div>

                    <div className="space-y-2">
                      <Label htmlFor="mother-address1">Address Line 1</Label>
                      <Input id="mother-address1" value={motherData.addressLine1} onChange={e => setMotherData({
                        ...motherData,
                        addressLine1: e.target.value
                      })} className="bg-background/50 border-border/50" placeholder="Enter address" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mother-address2">Address Line 2</Label>
                      <Input id="mother-address2" value={motherData.addressLine2} onChange={e => setMotherData({
                      ...motherData,
                      addressLine2: e.target.value
                      })} className="bg-background/50 border-border/50" placeholder="Enter address line 2 (optional)" />
                  </div>

                  <SimpleLocationSelector
                    province={motherData.province}
                    district={motherData.district}
                    city={motherData.city}
                    postalCode={motherData.postalCode}
                    onProvinceChange={(value) => setMotherData({ ...motherData, province: value })}
                    onDistrictChange={(value) => setMotherData({ ...motherData, district: value })}
                    onCityChange={(value) => setMotherData({ ...motherData, city: value })}
                    onPostalCodeChange={(value) => setMotherData({ ...motherData, postalCode: value })}
                    errors={{
                      province: motherErrors.province,
                      district: motherErrors.district,
                      city: motherErrors.city,
                      postalCode: motherErrors.postalCode
                    }}
                  />

                  <div className="space-y-2">
                    <Label htmlFor="mother-country">Country</Label>
                    <Input id="mother-country" value={motherData.country} onChange={e => setMotherData({
                      ...motherData,
                      country: e.target.value
                    })} className="bg-background/50 border-border/50" disabled placeholder="Sri Lanka" />
                  </div>

                   <div className="space-y-2">
                    <Label>Profile Image (Optional)</Label>
                    <div className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                      <input type="file" accept="image/*" onChange={e => handleImageUpload(e, setMotherData)} className="hidden" id="mother-image" />
                      <label htmlFor="mother-image" className="cursor-pointer">
                        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {motherData.image ? motherData.image.name : "Click to upload profile image"}
                        </p>
                      </label>
                    </div>
                  </div>
                  
                </div>

                  <div className="flex flex-col sm:flex-row gap-4 sm:justify-between pt-8">
                    <Button type="button" onClick={() => setActiveTab("father")} size="lg" variant="outline" className="w-full sm:w-auto px-10 order-2 sm:order-1 border-2 hover:border-primary">
                      Previous
                    </Button>
                    <Button type="button" onClick={handleNextToGuardian} size="lg" className="w-full sm:w-auto px-10 bg-gradient-primary hover:opacity-90 shadow-lg transition-all order-1 sm:order-2" disabled={isSubmittingMother}>
                      {isSubmittingMother && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isSubmittingMother ? "Creating Mother..." : "Next: Guardian Details"}
                    </Button>
                    </div>
                  </>}
              </TabsContent>

              {/* Guardian Details Tab */}
              <TabsContent value="guardian" className="space-y-6 mt-6">
                {showGuardianForm && !guardianEditMode ? <ParentExistsForm parentType="Guardian" onExistingParent={handleExistingGuardian} onNewParent={handleNewGuardian} onSkip={handleSkipGuardian} hasFather={fatherCompleted || fatherExists || !!studentData.studentData.fatherId} hasMother={motherCompleted || motherExists || !!studentData.studentData.motherId} selectionData={getGuardianSelectionData()} onResetSelection={handleResetGuardianSelection} /> : <>
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 pb-4 border-b border-border/50">
                        <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg">
                          <Users className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <h3 className="text-2xl font-bold text-foreground">Guardian Information (Optional)</h3>
                      </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="guardian-firstName" className="text-sm font-semibold">First Name *</Label>
                      <Input id="guardian-firstName" value={guardianData.firstName} onChange={e => {
                        const value = e.target.value.toUpperCase().replace(/[^A-Z ]/g, '').replace(/  +/g, ' ');
                        setGuardianData({
                          ...guardianData,
                          firstName: value
                        });
                      }} maxLength={50} className={`bg-background/50 ${guardianErrors.firstName ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/50'}`} placeholder="e.g., HEWAGE MUDIYANSELAGE" />
                      {guardianErrors.firstName && <p className="text-xs text-destructive">{guardianErrors.firstName}</p>}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="guardian-lastName" className="text-sm font-semibold">Last Name *</Label>
                      <Input id="guardian-lastName" value={guardianData.lastName} onChange={e => {
                        const value = e.target.value.toUpperCase().replace(/[^A-Z ]/g, '').replace(/  +/g, ' ');
                        setGuardianData({
                          ...guardianData,
                          lastName: value
                        });
                      }} maxLength={50} className={`bg-background/50 ${guardianErrors.lastName ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/50'}`} placeholder="e.g., DON GAMAGE" />
                      {guardianErrors.lastName && <p className="text-xs text-destructive">{guardianErrors.lastName}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="guardian-nameWithInitials" className="text-sm font-semibold">Name with Initials *</Label>
                    <Input id="guardian-nameWithInitials" value={guardianData.nameWithInitials} onChange={e => {
                      const value = e.target.value.toUpperCase().replace(/[^A-Z. ]/g, '').replace(/  +/g, ' ');
                      setGuardianData({
                        ...guardianData,
                        nameWithInitials: value
                      });
                    }} maxLength={100} className={`bg-background/50 ${guardianErrors.nameWithInitials ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/50'}`} placeholder="e.g., H.M. DON GAMAGE" />
                    {guardianErrors.nameWithInitials && <p className="text-xs text-destructive">{guardianErrors.nameWithInitials}</p>}
                    <p className="text-xs text-muted-foreground">Enter name with initials (e.g., J. DOE)</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="guardian-email" className="flex items-center gap-2 text-sm font-semibold">
                        Email Address *
                        {guardianEmailVerified && <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />}
                      </Label>
                      <Input id="guardian-email" type="email" value={guardianData.email} onChange={e => setGuardianData({
                        ...guardianData,
                        email: e.target.value
                      })} disabled={guardianEmailVerified} className={guardianEmailVerified ? "bg-muted/50 border-border/50 cursor-not-allowed opacity-75" : `bg-background/50 ${guardianErrors.email ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/50'}`} placeholder="email@example.com" />
                      {guardianEmailVerified && <p className="text-xs text-muted-foreground">Email verified and locked</p>}
                      {guardianErrors.email && !guardianEmailVerified && <p className="text-xs text-destructive">{guardianErrors.email}</p>}
                      {!guardianEmailVerified && <EmailHelpSection />}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="guardian-phone" className="flex items-center gap-2 text-sm font-semibold">
                        Phone Number *
                        {guardianPhoneVerified && <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />}
                      </Label>
                      <PhoneInput id="guardian-phone" value={guardianData.phoneNumber} onChange={value => setGuardianData({
                        ...guardianData,
                        phoneNumber: value
                      })} disabled={guardianPhoneVerified} className={guardianPhoneVerified ? "bg-muted/50 border-border/50 cursor-not-allowed opacity-75" : `bg-background/50 ${guardianErrors.phoneNumber ? 'phone-input-error' : 'border-border/50'}`} />
                      {guardianPhoneVerified && <p className="text-xs text-muted-foreground">Phone verified and locked</p>}
                      {guardianErrors.phoneNumber && !guardianPhoneVerified && <p className="text-xs text-destructive">{guardianErrors.phoneNumber}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="guardian-dob" className="text-sm font-semibold">Date of Birth *</Label>
                      <Input id="guardian-dob" type="date" value={guardianData.dateOfBirth} onChange={e => setGuardianData({
                        ...guardianData,
                        dateOfBirth: e.target.value
                      })} className={`bg-background/50 ${guardianErrors.dateOfBirth ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/50'}`} />
                      {guardianErrors.dateOfBirth && <p className="text-xs text-destructive">{guardianErrors.dateOfBirth}</p>}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="guardian-gender" className="text-sm font-semibold">Gender *</Label>
                      <Select onValueChange={value => setGuardianData({
                        ...guardianData,
                        gender: value
                      })}>
                        <SelectTrigger className={`bg-background/50 ${guardianErrors.gender ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/50'}`}>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MALE">Male</SelectItem>
                          <SelectItem value="FEMALE">Female</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {guardianErrors.gender && <p className="text-xs text-destructive">{guardianErrors.gender}</p>}
                    </div>

                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="guardian-bc" className="text-sm font-semibold">Birth Certificate No *</Label>
                      <Input id="guardian-bc" value={guardianData.birthCertificateNo} onChange={e => setGuardianData({
                        ...guardianData,
                        birthCertificateNo: e.target.value
                      })} className={`bg-background/50 ${guardianErrors.birthCertificateNo ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/50'}`} placeholder="123456789" />
                      {guardianErrors.birthCertificateNo && <p className="text-xs text-destructive">{guardianErrors.birthCertificateNo}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="guardian-occupation">Occupation</Label>
                      <OccupationSelect value={guardianData.additionalInfo.occupation} onChange={value => setGuardianData({
                        ...guardianData,
                        additionalInfo: {
                          ...guardianData.additionalInfo,
                          occupation: value
                        }
                      })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="guardian-workplace">Workplace</Label>
                      <Input id="guardian-workplace" value={guardianData.additionalInfo.workplace} onChange={e => setGuardianData({
                        ...guardianData,
                        additionalInfo: {
                          ...guardianData.additionalInfo,
                          workplace: e.target.value
                        }
                      })} className="bg-background/50 border-border/50" placeholder="Company name" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="guardian-workPhone">Work Phone</Label>
                      <PhoneInput id="guardian-workPhone" value={guardianData.additionalInfo.workPhone} onChange={value => setGuardianData({
                        ...guardianData,
                        additionalInfo: {
                          ...guardianData.additionalInfo,
                          workPhone: value
                        }
                      })} className="bg-background/50 border-border/50" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="guardian-education">Education Level</Label>
                    <Input id="guardian-education" value={guardianData.additionalInfo.educationLevel} onChange={e => setGuardianData({
                      ...guardianData,
                      additionalInfo: {
                        ...guardianData.additionalInfo,
                        educationLevel: e.target.value
                      }
                    })} className="bg-background/50 border-border/50" placeholder="Highest education level" />
                  </div>

                    <div className="space-y-2">
                      <Label htmlFor="guardian-address1">Address Line 1</Label>
                      <Input id="guardian-address1" value={guardianData.addressLine1} onChange={e => setGuardianData({
                        ...guardianData,
                        addressLine1: e.target.value
                      })} className="bg-background/50 border-border/50" placeholder="Enter address" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="guardian-address2">Address Line 2</Label>
                      <Input id="guardian-address2" value={guardianData.addressLine2} onChange={e => setGuardianData({
                      ...guardianData,
                      addressLine2: e.target.value
                      })} className="bg-background/50 border-border/50" placeholder="Enter address line 2 (optional)" />
                  </div>

                  <SimpleLocationSelector
                    province={guardianData.province}
                    district={guardianData.district}
                    city={guardianData.city}
                    postalCode={guardianData.postalCode}
                    onProvinceChange={(value) => setGuardianData({ ...guardianData, province: value })}
                    onDistrictChange={(value) => setGuardianData({ ...guardianData, district: value })}
                    onCityChange={(value) => setGuardianData({ ...guardianData, city: value })}
                    onPostalCodeChange={(value) => setGuardianData({ ...guardianData, postalCode: value })}
                    errors={{
                      province: guardianErrors.province,
                      district: guardianErrors.district,
                      city: guardianErrors.city,
                      postalCode: guardianErrors.postalCode
                    }}
                  />

                  <div className="space-y-2">
                    <Label htmlFor="guardian-country">Country</Label>
                    <Input id="guardian-country" value={guardianData.country} onChange={e => setGuardianData({
                      ...guardianData,
                      country: e.target.value
                    })} className="bg-background/50 border-border/50" disabled placeholder="Sri Lanka" />
                  </div>

                  <div className="space-y-2">
                    <Label>Profile Image</Label>
                    <div className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                      <input type="file" accept="image/*" onChange={e => handleImageUpload(e, setGuardianData)} className="hidden" id="guardian-image" />
                      <label htmlFor="guardian-image" className="cursor-pointer">
                        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {guardianData.image ? guardianData.image.name : "Click to upload profile image"}
                        </p>
                      </label>
                    </div>
                  </div>
                </div>

                  <div className="flex flex-col sm:flex-row gap-4 sm:justify-between pt-8">
                    <Button type="button" onClick={() => setActiveTab("mother")} size="lg" variant="outline" className="w-full sm:w-auto px-10 order-2 sm:order-1 border-2 hover:border-primary">
                      Previous
                    </Button>
                    <Button type="button" onClick={handleNextToStudent} size="lg" className="w-full sm:w-auto px-10 bg-gradient-primary hover:opacity-90 shadow-lg transition-all order-1 sm:order-2" disabled={isSubmittingGuardian}>
                      {isSubmittingGuardian && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isSubmittingGuardian ? "Creating Guardian..." : "Next: Student Details"}
                    </Button>
                    </div>
                  </>}
              </TabsContent>

              {/* Student Details Tab */}
              <TabsContent value="student" className="space-y-6 mt-6">
                {/* Show verification step if email not verified OR not clicked Next yet */}
                {(!studentEmailVerified || !showStudentForm) && <div className="space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-border/50">
                      <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg">
                        <CheckCircle2 className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <h3 className="text-2xl font-bold text-foreground">Verify Contact Information</h3>
                    </div>

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Email Verification Required</AlertTitle>
                      <AlertDescription>
                        Please verify your email address before proceeding with student registration. Phone number is optional.
                      </AlertDescription>
                    </Alert>

                    {/* Phone Number Verification - Optional */}
                    <Card className="border-2">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Phone className="w-5 h-5" />
                          Phone Number Verification (Optional)
                        </CardTitle>
                        <CardDescription>
                          Enter and verify your phone number if you have one
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="verify-phone">Phone Number</Label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <PhoneInput id="verify-phone" value={studentPhoneForVerification} onChange={setStudentPhoneForVerification} disabled={phoneOTPSent || studentPhoneVerified} className="bg-background/50 border-border/50 flex-1" />
                            <Button type="button" onClick={handleRequestPhoneOTP} disabled={isRequestingPhoneOTP || phoneOTPSent || studentPhoneVerified} className="w-full sm:w-auto shrink-0">
                              {isRequestingPhoneOTP && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              {studentPhoneVerified ? "Verified" : phoneOTPSent ? "OTP Sent" : "Send OTP"}
                            </Button>
                          </div>
                        </div>

                        {phoneOTPSent && !studentPhoneVerified && <div className="space-y-3">
                            <Label>Enter 6-Digit OTP</Label>
                            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                              <InputOTP maxLength={6} value={phoneOTP} onChange={setPhoneOTP} className="justify-center sm:justify-start">
                                <InputOTPGroup className="gap-1 sm:gap-2">
                                  <InputOTPSlot index={0} />
                                  <InputOTPSlot index={1} />
                                  <InputOTPSlot index={2} />
                                  <InputOTPSlot index={3} />
                                  <InputOTPSlot index={4} />
                                  <InputOTPSlot index={5} />
                                </InputOTPGroup>
                              </InputOTP>
                              <Button type="button" onClick={handleVerifyPhoneOTP} disabled={isVerifyingPhoneOTP || phoneOTP.length !== 6} className="w-full sm:w-auto">
                                {isVerifyingPhoneOTP && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Verify
                              </Button>
                            </div>
                          </div>}

                        {studentPhoneVerified && <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                            <AlertTitle className="text-green-600 dark:text-green-400">Phone Verified ✓</AlertTitle>
                            <AlertDescription className="text-green-600 dark:text-green-400">
                              Phone number verified: {studentPhoneForVerification}
                            </AlertDescription>
                          </Alert>}
                      </CardContent>
                    </Card>

                    {/* Email Verification - Required */}
                    <Card className="border-2 border-primary/30">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Mail className="w-5 h-5" />
                          Email Verification (Required)
                        </CardTitle>
                        <CardDescription>
                          Enter and verify your email address to continue
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="verify-email">Email Address</Label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Input id="verify-email" type="email" value={studentEmailForVerification} onChange={e => setStudentEmailForVerification(e.target.value)} disabled={emailOTPSent} className="bg-background/50 border-border/50 flex-1" placeholder="example@email.com" />
                            <Button type="button" onClick={handleRequestEmailOTP} disabled={isRequestingEmailOTP || emailOTPSent} className="w-full sm:w-auto shrink-0">
                              {isRequestingEmailOTP && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              {emailOTPSent ? "OTP Sent" : "Send OTP"}
                            </Button>
                          </div>
                          {!emailOTPSent && <EmailHelpSection />}
                        </div>

                        {emailOTPSent && !studentEmailVerified && <div className="space-y-3">
                            <Label>Enter 6-Digit OTP</Label>
                            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                              <InputOTP maxLength={6} value={emailOTP} onChange={setEmailOTP} className="justify-center sm:justify-start">
                                <InputOTPGroup className="gap-1 sm:gap-2">
                                  <InputOTPSlot index={0} />
                                  <InputOTPSlot index={1} />
                                  <InputOTPSlot index={2} />
                                  <InputOTPSlot index={3} />
                                  <InputOTPSlot index={4} />
                                  <InputOTPSlot index={5} />
                                </InputOTPGroup>
                              </InputOTP>
                              <Button type="button" onClick={handleVerifyEmailOTP} disabled={isVerifyingEmailOTP || emailOTP.length !== 6} className="w-full sm:w-auto">
                                {isVerifyingEmailOTP && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Verify
                              </Button>
                            </div>
                          </div>}
                        {studentEmailVerified && <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                            <AlertTitle className="text-green-600 dark:text-green-400">Email Verified ✓</AlertTitle>
                            <AlertDescription className="text-green-600 dark:text-green-400">
                              Email verified: {studentEmailForVerification}
                            </AlertDescription>
                          </Alert>}
                      </CardContent>
                    </Card>

                    <div className="flex flex-col sm:flex-row gap-3 sm:justify-between pt-6">
                      <Button type="button" onClick={() => setActiveTab("guardian")} size="lg" variant="outline" className="w-full sm:w-auto px-8 order-2 sm:order-1">
                        Previous
                      </Button>
                      {studentEmailVerified && (
                        <Button type="button" onClick={() => setShowStudentForm(true)} size="lg" className="w-full sm:w-auto px-8 order-1 sm:order-2 bg-gradient-primary hover:opacity-90">
                          Next: Student Details
                        </Button>
                      )}
                    </div>
                  </div>}

                {/* Show form after email verification AND clicking Next */}
                {studentEmailVerified && showStudentForm && <>
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 pb-4 border-b border-border/50">
                        <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg">
                          <Baby className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <h3 className="text-2xl font-bold text-foreground">Student Information</h3>
                      </div>

                      <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <AlertTitle className="text-green-600 dark:text-green-400">Your Contact Information</AlertTitle>
                        <AlertDescription className="text-green-600 dark:text-green-400">
                          <div className="flex flex-col gap-1">
                            <span>Email: {studentData.email}</span>
                            {studentPhoneVerified && <span>Phone: {studentData.phoneNumber}</span>}
                            {!studentPhoneVerified && <span className="text-muted-foreground text-xs">Phone number not provided</span>}
                          </div>
                        </AlertDescription>
                      </Alert>
                      

                      {/* Verified Email and Phone - Locked */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="student-email" className="flex items-center gap-2">
                            Email Address 
                            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                          </Label>
                          <Input id="student-email" type="email" value={studentData.email} disabled className="bg-muted/50 border-border/50 cursor-not-allowed opacity-75" />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="student-phone" className="flex items-center gap-2">
                            Phone Number 
                            {studentPhoneVerified && <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />}
                          </Label>
                          {studentPhoneVerified ? (
                            <Input id="student-phone" value={studentData.phoneNumber} disabled className="bg-muted/50 border-border/50 cursor-not-allowed opacity-75" />
                          ) : (
                            <Input id="student-phone" value="Not provided" disabled className="bg-muted/50 border-border/50 cursor-not-allowed opacity-75 text-muted-foreground" />
                          )}
                          <p className="text-xs text-muted-foreground">
                            {studentPhoneVerified 
                              ? "Your verified phone number" 
                              : "To add a phone number, verify it in the previous step"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="student-firstName" className="text-sm font-semibold">First Name *</Label>
                          <Input id="student-firstName" value={studentData.firstName} onChange={e => {
                            const value = e.target.value.toUpperCase().replace(/[^A-Z ]/g, '').replace(/  +/g, ' ');
                            setStudentData({
                              ...studentData,
                              firstName: value
                            });
                          }} maxLength={50} className={`bg-background/50 ${studentErrors.firstName ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/50'}`} placeholder="e.g., HEWAGE MUDIYANSELAGE" />
                          {studentErrors.firstName && <p className="text-xs text-destructive">{studentErrors.firstName}</p>}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="student-lastName" className="text-sm font-semibold">Last Name *</Label>
                          <Input id="student-lastName" value={studentData.lastName} onChange={e => {
                            const value = e.target.value.toUpperCase().replace(/[^A-Z ]/g, '').replace(/  +/g, ' ');
                            setStudentData({
                              ...studentData,
                              lastName: value
                            });
                          }} maxLength={50} className={`bg-background/50 ${studentErrors.lastName ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/50'}`} placeholder="e.g., DON GAMAGE" />
                          {studentErrors.lastName && <p className="text-xs text-destructive">{studentErrors.lastName}</p>}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="student-nameWithInitials" className="text-sm font-semibold">Name with Initials *</Label>
                        <Input id="student-nameWithInitials" value={studentData.nameWithInitials} onChange={e => {
                          const value = e.target.value.toUpperCase().replace(/[^A-Z. ]/g, '').replace(/  +/g, ' ');
                          setStudentData({
                            ...studentData,
                            nameWithInitials: value
                          });
                        }} maxLength={100} className={`bg-background/50 ${studentErrors.nameWithInitials ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/50'}`} placeholder="e.g., H.M. DON GAMAGE" />
                        {studentErrors.nameWithInitials && <p className="text-xs text-destructive">{studentErrors.nameWithInitials}</p>}
                        <p className="text-xs text-muted-foreground">Enter your name with initials (e.g., J. DOE, H.M.A. DON GAMAGE)</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="student-dob" className="text-sm font-semibold">Date of Birth *</Label>
                          <Input id="student-dob" type="date" value={studentData.dateOfBirth} onChange={e => setStudentData({
                        ...studentData,
                        dateOfBirth: e.target.value
                      })} className={`bg-background/50 ${studentErrors.dateOfBirth ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/50'}`} />
                          {studentErrors.dateOfBirth && <p className="text-xs text-destructive">{studentErrors.dateOfBirth}</p>}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="student-gender" className="text-sm font-semibold">Gender *</Label>
                          <Select onValueChange={value => setStudentData({
                        ...studentData,
                        gender: value
                      })}>
                            <SelectTrigger className={`bg-background/50 ${studentErrors.gender ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/50'}`}>
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MALE">Male</SelectItem>
                              <SelectItem value="FEMALE">Female</SelectItem>
                              <SelectItem value="OTHER">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          {studentErrors.gender && <p className="text-xs text-destructive">{studentErrors.gender}</p>}
                        </div>

                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="student-bc" className="text-sm font-semibold">Birth Certificate No *</Label>
                        <Input id="student-bc" value={studentData.birthCertificateNo} onChange={e => setStudentData({
                      ...studentData,
                      birthCertificateNo: e.target.value
                    })} className={`bg-background/50 ${studentErrors.birthCertificateNo ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/50'}`} placeholder="123456789" />
                        {studentErrors.birthCertificateNo && <p className="text-xs text-destructive">{studentErrors.birthCertificateNo}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="student-address1">Address Line 1</Label>
                        <Input id="student-address1" value={studentData.addressLine1} onChange={e => setStudentData({
                      ...studentData,
                      addressLine1: e.target.value
                    })} className="bg-background/50 border-border/50" placeholder="123 Main Street" />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="student-address2">Address Line 2</Label>
                        <Input id="student-address2" value={studentData.addressLine2} onChange={e => setStudentData({
                      ...studentData,
                      addressLine2: e.target.value
                    })} className="bg-background/50 border-border/50" placeholder="Apartment 4B (optional)" />
                      </div>

                      <SimpleLocationSelector
                        province={studentData.province}
                        district={studentData.district}
                        city={studentData.city}
                        postalCode={studentData.postalCode}
                        onProvinceChange={(value) => setStudentData({ ...studentData, province: value })}
                        onDistrictChange={(value) => setStudentData({ ...studentData, district: value })}
                        onCityChange={(value) => setStudentData({ ...studentData, city: value })}
                        onPostalCodeChange={(value) => setStudentData({ ...studentData, postalCode: value })}
                        errors={{
                          province: studentErrors.province,
                          district: studentErrors.district,
                          city: studentErrors.city,
                          postalCode: studentErrors.postalCode
                        }}
                      />

                      <div className="space-y-2">
                        <Label htmlFor="student-country">Country</Label>
                        <Input id="student-country" value={studentData.country} onChange={e => setStudentData({
                      ...studentData,
                      country: e.target.value
                    })} className="bg-background/50 border-border/50" disabled placeholder="Sri Lanka" />
                      </div>

                      <div className="flex items-center gap-3 pb-4 border-b border-border/50 mt-8">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center shadow-lg">
                          <Heart className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-foreground">Medical & Emergency Information</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="student-emergency">Emergency Contact (Optional)</Label>
                          <PhoneInput id="student-emergency" value={studentData.studentData.emergencyContact} onChange={value => setStudentData({
                        ...studentData,
                        studentData: {
                          ...studentData.studentData,
                          emergencyContact: value
                        }
                      })} className="bg-background/50 border-border/50" />
                          <p className="text-xs text-muted-foreground">Leave blank if not applicable</p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="student-blood">Blood Group</Label>
                          <Select onValueChange={value => setStudentData({
                        ...studentData,
                        studentData: {
                          ...studentData.studentData,
                          bloodGroup: value
                        }
                      })}>
                            <SelectTrigger className="bg-background/50 border-border/50">
                              <SelectValue placeholder="Select blood group" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="A+">A+</SelectItem>
                              <SelectItem value="A-">A-</SelectItem>
                              <SelectItem value="B+">B+</SelectItem>
                              <SelectItem value="B-">B-</SelectItem>
                              <SelectItem value="O+">O+</SelectItem>
                              <SelectItem value="O-">O-</SelectItem>
                              <SelectItem value="AB+">AB+</SelectItem>
                              <SelectItem value="AB-">AB-</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="student-medical">Medical Conditions</Label>
                        <Textarea id="student-medical" value={studentData.studentData.medicalConditions} onChange={e => setStudentData({
                      ...studentData,
                      studentData: {
                        ...studentData.studentData,
                        medicalConditions: e.target.value
                      }
                    })} className="bg-background/50 border-border/50 min-h-[100px]" placeholder="Any medical conditions or special needs" />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="student-allergies">Allergies</Label>
                        <Textarea id="student-allergies" value={studentData.studentData.allergies} onChange={e => setStudentData({
                      ...studentData,
                      studentData: {
                        ...studentData.studentData,
                        allergies: e.target.value
                      }
                    })} className="bg-background/50 border-border/50 min-h-[100px]" placeholder="Any known allergies" />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Father Information */}
                        <div className="space-y-2">
                          <Label htmlFor="student-fatherId">Father ID (Optional)</Label>
                          <div className="flex gap-2">
                            <Input 
                              id="student-fatherId" 
                              value={studentData.studentData.fatherId} 
                              readOnly
                              disabled
                              className="bg-muted/50 border-border/50 cursor-not-allowed opacity-75" 
                              placeholder="Auto-filled from parent form" 
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {fatherCompleted || fatherExists ? "Locked - filled from Father section" : "Will be auto-filled from Father section"}
                          </p>
                          {/* Father Skip Reason - Only show if father is skipped */}
                          {skipFather && fatherSkipReason && (
                            <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded-md border border-amber-200 dark:border-amber-800">
                              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Skip Reason:</p>
                              <p className="text-xs text-amber-600 dark:text-amber-500">{fatherSkipReason}</p>
                            </div>
                          )}
                        </div>

                        {/* Mother Information */}
                        <div className="space-y-2">
                          <Label htmlFor="student-motherId">Mother ID {skipMother && "(Optional)"}</Label>
                          <div className="flex gap-2">
                            <Input 
                              id="student-motherId" 
                              value={studentData.studentData.motherId} 
                              onChange={(e) => {
                                // Allow typing only if skipped and no existing ID from form
                                if (skipMother && !motherCompleted && !motherExists) {
                                  setStudentData({
                                    ...studentData,
                                    studentData: {
                                      ...studentData.studentData,
                                      motherId: e.target.value
                                    }
                                  });
                                }
                              }}
                              disabled={motherCompleted || motherExists}
                              className={(motherCompleted || motherExists) ? "bg-muted/50 border-border/50 cursor-not-allowed opacity-75" : "bg-background/50 border-border/50"} 
                              placeholder={skipMother ? "Enter Mother ID (optional)" : "Auto-filled from parent form"} 
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {motherCompleted || motherExists ? "Locked - filled from Mother section" : skipMother ? "You can enter Mother ID manually" : "Will be auto-filled from Mother section"}
                          </p>
                          {/* Mother Skip Reason - Only show if mother is skipped */}
                          {skipMother && motherSkipReason && (
                            <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded-md border border-amber-200 dark:border-amber-800">
                              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Skip Reason:</p>
                              <p className="text-xs text-amber-600 dark:text-amber-500">{motherSkipReason}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Guardian Information - Full width row */}
                      <div className="space-y-2">
                        <Label htmlFor="student-guardianId">Guardian ID {skipGuardian && "(Optional)"}</Label>
                        <div className="flex gap-2">
                          <Input 
                            id="student-guardianId" 
                            value={studentData.studentData.guardianId} 
                            onChange={(e) => {
                              // Allow typing only if skipped and no existing ID from form
                              if (skipGuardian && !guardianCompleted && !guardianExists) {
                                setStudentData({
                                  ...studentData,
                                  studentData: {
                                    ...studentData.studentData,
                                    guardianId: e.target.value
                                  }
                                });
                              }
                            }}
                            disabled={guardianCompleted || guardianExists}
                            className={(guardianCompleted || guardianExists) ? "bg-muted/50 border-border/50 cursor-not-allowed opacity-75 max-w-md" : "bg-background/50 border-border/50 max-w-md"} 
                            placeholder={skipGuardian ? "Enter Guardian ID (optional)" : "Auto-filled from parent form"} 
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {guardianCompleted || guardianExists ? "Locked - filled from Guardian section" : skipGuardian ? "You can enter Guardian ID manually" : "Will be auto-filled from Guardian section"}
                        </p>
                      </div>

                      <div className="space-y-3">
                        <Label className={studentErrors.image ? "text-destructive" : ""}>Profile Image *</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Upload Area */}
                          <div className={`border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors ${studentErrors.image ? 'border-destructive bg-destructive/5' : 'border-border/50'}`}>
                            <input type="file" accept="image/*" onChange={e => handleImageUpload(e, setStudentData)} className="hidden" id="student-image" />
                            <label htmlFor="student-image" className="cursor-pointer">
                              <Upload className={`w-8 h-8 mx-auto mb-2 ${studentErrors.image ? 'text-destructive' : 'text-muted-foreground'}`} />
                              <p className={`text-sm ${studentErrors.image ? 'text-destructive' : 'text-muted-foreground'}`}>
                                {studentData.image ? studentData.image.name : "Click to upload profile image"}
                              </p>
                              {studentErrors.image && <p className="text-xs text-destructive mt-1">{studentErrors.image}</p>}
                            </label>
                          </div>
                          
                          {/* Example Photo */}
                          <div className="flex flex-col items-center gap-2 p-4 bg-muted/30 rounded-lg border border-border/50">
                            <p className="text-xs font-medium text-muted-foreground">Example Photo Format:</p>
                            <img 
                              src="/assets/example-profile-photo.jpg" 
                              alt="Example profile photo format" 
                              className="w-24 h-32 object-cover rounded-md border-2 border-primary/30 shadow-sm"
                              onError={(e) => {
                                // Fallback if image doesn't load
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            <p className="text-xs text-muted-foreground text-center">
                              Passport-style photo<br/>
                              Clear face, neutral background
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 sm:justify-between pt-6">
                      <Button type="button" onClick={() => setActiveTab("guardian")} size="lg" variant="outline" className="w-full sm:w-auto px-8 order-2 sm:order-1">
                        Previous
                      </Button>
                      <Button type="button" onClick={handleSubmit} size="lg" className="w-full sm:w-auto px-8 order-1 sm:order-2" disabled={isSubmittingStudent}>
                        {isSubmittingStudent && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSubmittingStudent ? "Creating Student..." : "Submit Registration"}
                      </Button>
                    </div>
                  </>}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Image Crop Dialog */}
      <ImageCropDialog open={cropDialogOpen} onOpenChange={setCropDialogOpen} imageSrc={imageToCrop} onCropComplete={handleCropComplete} />
      
      {/* Success Dialog - Ask about siblings */}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <AlertDialogTitle className="text-center text-2xl">Student Created Successfully!</AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-4">
              <p>The student registration has been completed successfully.</p>
              <p className="font-medium text-foreground">Do you have siblings (sisters/brothers) to register?</p>
              <p className="text-sm">If yes, you can register another student under the same parents without filling parent details again.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                setShowSuccessDialog(false);
                // Clear all saved registration data when finishing
                clearSavedRegistrationData();
                // Redirect to suraksha.lk with thank you
                window.location.href = "https://suraksha.lk?message=thank-you-for-registration";
              }}
            >
              <span className="mr-2">No</span> - Finish Registration
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                setShowSuccessDialog(false);
                // Preserve parent IDs from multiple sources
                const fatherId = createdFatherId || studentData.studentData.fatherId || getRegisteredParent("Father")?.id || "";
                const motherId = createdMotherId || studentData.studentData.motherId || getRegisteredParent("Mother")?.id || "";
                const guardianId = createdGuardianId || studentData.studentData.guardianId || getRegisteredParent("Guardian")?.id || "";
                
                // Reset only student data, keep parent IDs
                setStudentData({
                  firstName: "",
                  lastName: "",
                  nameWithInitials: "",
                  email: "",
                  phoneNumber: "",
                  userType: "USER_WITHOUT_PARENT",
                  gender: "",
                  dateOfBirth: "",
                  birthCertificateNo: "",
                  addressLine1: "",
                  addressLine2: "",
                  city: "",
                  district: "",
                  province: "",
                  postalCode: "",
                  country: "Sri Lanka",
                  language: "E" as LanguageCode,
                  image: null,
                  studentData: {
                    studentId: null,
                    emergencyContact: "+94",
                    medicalConditions: "",
                    allergies: "",
                    bloodGroup: "",
                    fatherId: fatherId,
                    motherId: motherId,
                    guardianId: guardianId
                  }
                });
                
                // Reset student verification states
                setStudentPhoneVerified(false);
                setStudentEmailVerified(false);
                setStudentPhoneForVerification("+94");
                setStudentEmailForVerification("");
                setPhoneOTP("");
                setEmailOTP("");
                setPhoneOTPSent(false);
                setEmailOTPSent(false);
                setShowStudentForm(false);
                setStudentSubmitted(false);
                
                // Stay on student tab for sibling registration
                setActiveTab("student");
                
                toast({
                  title: "Register Sibling",
                  description: "Please fill in the sibling's details. Parent information has been preserved."
                });
              }}
            >
              <Users className="w-4 h-4 mr-2" />
              <span>Yes</span> - Register Sibling
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
};
export default RegisterStudent;