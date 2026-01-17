import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Send, Users, DollarSign, RefreshCw, Eye, Plus, Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTableData } from '@/hooks/useTableData';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import { format } from 'date-fns';
import { enhancedCachedClient } from '@/api/enhancedCachedClient';
import { CACHE_TTL } from '@/config/cacheTTL';
import { apiClient } from '@/api/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import ClassMultiSelectDialog, { SmsClassOption } from '@/components/sms/ClassMultiSelectDialog';
import SubjectMultiSelectDialog from '@/components/sms/SubjectMultiSelectDialog';

interface SenderMask {
  maskId: string;
  isActive: boolean;
  displayName: string;
  phoneNumber: string;
}

interface SMSCredentials {
  verificationStage: string;
  availableCredits: number;
  totalCreditsGranted: number;
  totalCreditsUsed: number;
  maskIds: string[];
  senderMasks: SenderMask[];
  isActive: boolean;
}

interface PaymentSubmission {
  id: string;
  instituteId: string;
  submittedBy: string;
  requestedCredits: number;
  paymentAmount: string;
  paymentMethod: string;
  paymentReference: string;
  paymentSlipUrl: string | null;
  paymentSlipFilename: string;
  status: string;
  creditsGranted: number;
  costPerCredit: string | null;
  verifiedBy: string;
  verifiedAt: string;
  rejectionReason: string | null;
  adminNotes: string;
  submissionNotes: string;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

const SMS = () => {
  const { currentInstituteId } = useAuth();
  const instituteRole = useInstituteRole();
  const { toast } = useToast();

  // SMS Credentials state
  const [credentials, setCredentials] = useState<SMSCredentials | null>(null);
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  const [selectedMaskId, setSelectedMaskId] = useState<string>('');

  // Bulk SMS state
  const [bulkMessage, setBulkMessage] = useState('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedClassItems, setSelectedClassItems] = useState<SmsClassOption[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedRecipientTypes, setSelectedRecipientTypes] = useState<string[]>([]);
  const [bulkScheduledAt, setBulkScheduledAt] = useState('');
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [isBulkNow, setIsBulkNow] = useState(true);

  // Payment submissions state
  const [paymentSubmissions, setPaymentSubmissions] = useState<PaymentSubmission[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentsPage, setPaymentsPage] = useState(0);
  const [paymentsRowsPerPage, setPaymentsRowsPerPage] = useState(10);
  const [paymentsTotal, setPaymentsTotal] = useState(0);
  const [selectedPayment, setSelectedPayment] = useState<PaymentSubmission | null>(null);
  const [viewPaymentDialogOpen, setViewPaymentDialogOpen] = useState(false);
  // New payment submission state
  const [newPaymentOpen, setNewPaymentOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    requestedCredits: '',
    paymentAmount: '',
    paymentMethod: 'Bank Transfer',
    paymentReference: '',
    submissionNotes: '',
    paymentSlip: null as File | null,
  });

  // Custom SMS state
  const [customMessage, setCustomMessage] = useState('');
  const [customRecipients, setCustomRecipients] = useState<Array<{ name: string; phoneNumber: string }>>([]);
  const [customName, setCustomName] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [isCustomSending, setIsCustomSending] = useState(false);
  const [isCustomNow, setIsCustomNow] = useState(true);
  const [customScheduledAt, setCustomScheduledAt] = useState('');

  // Selection is handled via searchable pickers (no manual ID entry).

  // Auto-set scheduled time when component mounts and live update every second when "Send Now" is checked
  useEffect(() => {
    const getSriLankaTime = () => {
      const now = new Date();
      // Convert to Sri Lanka time (UTC+5:30)
      const sriLankaTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
      return sriLankaTime.toISOString().slice(0, 16);
    };
    const sriLankaTime = getSriLankaTime();
    setBulkScheduledAt(sriLankaTime);
    setCustomScheduledAt(sriLankaTime);

    // Live update when "Send Now" is checked
    const interval = setInterval(() => {
      if (isBulkNow) {
        setBulkScheduledAt(getSriLankaTime());
      }
      if (isCustomNow) {
        setCustomScheduledAt(getSriLankaTime());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isBulkNow, isCustomNow]);

  // Load credentials from cache only on mount (no automatic refresh)
  useEffect(() => {
    if (currentInstituteId) {
      // Silent cache load only - no loading indicator
      const loadFromCache = async () => {
        try {
          const response = await enhancedCachedClient.get(
            `/sms/credentials/status`,
            { instituteId: currentInstituteId },
            {
              ttl: CACHE_TTL.SMS_CREDENTIALS,
              forceRefresh: false, // Only load from cache
              userId: currentInstituteId
            }
          );
          setCredentials(response as SMSCredentials);
        } catch (error) {
          // Silently fail - user can click refresh if needed
          console.log('📦 No cached SMS credentials available');
        }
      };
      loadFromCache();
    }
  }, [currentInstituteId]);

  const fetchPaymentSubmissions = async () => {
    if (!currentInstituteId) return;
    
    setLoadingPayments(true);
    try {
      const response: any = await enhancedCachedClient.get(
        `/sms/payment-submissions/institute/${currentInstituteId}`,
        {
          page: paymentsPage + 1,
          limit: paymentsRowsPerPage
        },
        {
          ttl: CACHE_TTL.SMS_HISTORY,
          forceRefresh: false,
          userId: currentInstituteId
        }
      );
      
      // Handle new API response format
      if (response.submissions && Array.isArray(response.submissions)) {
        setPaymentSubmissions(response.submissions);
        setPaymentsTotal(response.total || 0);
      } else if (Array.isArray(response)) {
        setPaymentSubmissions(response);
        setPaymentsTotal(response.length);
      } else {
        // Single object response (fallback)
        setPaymentSubmissions([response]);
        setPaymentsTotal(1);
      }
    } catch (error) {
      console.error('Failed to fetch payment submissions:', error);
      setPaymentSubmissions([]);
      setPaymentsTotal(0);
    } finally {
      setLoadingPayments(false);
    }
  };

  // Only refetch when pagination changes if data is already loaded
  useEffect(() => {
    if (paymentsPage >= 0 && paymentSubmissions.length > 0) {
      fetchPaymentSubmissions();
    }
  }, [paymentsPage, paymentsRowsPerPage]);

  // Open slip by filename using API base URL
  const handleViewSlip = (filename: string | null) => {
    if (!filename) {
      toast({ title: 'No slip available', description: 'This payment has no slip uploaded', variant: 'destructive' });
    
      return;
    }
    const baseUrl = (localStorage.getItem('api_base_url') || (apiClient as any)?.defaults?.baseURL || '');
    const slipUrl = `${baseUrl}/sms/payment-slip/${filename}`;
    window.open(slipUrl, '_blank');
  };

  // Submit new payment for SMS credits
  const handlePaymentSubmit = async () => {
    if (!currentInstituteId) return;
    if (!paymentForm.requestedCredits || !paymentForm.paymentAmount || !paymentForm.paymentReference || !paymentForm.paymentSlip) {
      toast({ title: 'Error', description: 'Please fill in all required fields and upload payment slip', variant: 'destructive' });
      return;
    }
    try {
      setSubmitting(true);
      
      // Step 1: Upload payment slip using signed URL
      const { uploadWithSignedUrl } = await import('@/utils/signedUploadHelper');
      const paymentSlipPath = await uploadWithSignedUrl(
        paymentForm.paymentSlip,
        'institute-payment-receipts'
      );
      
      // Step 2: Submit payment with relativePath
      const paymentData = {
        requestedCredits: paymentForm.requestedCredits,
        paymentAmount: paymentForm.paymentAmount,
        paymentMethod: paymentForm.paymentMethod,
        paymentReference: paymentForm.paymentReference,
        submissionNotes: paymentForm.submissionNotes,
        paymentSlipUrl: paymentSlipPath
      };

      const response: any = await apiClient.post(`/sms/payment/submit?instituteId=${currentInstituteId}`, paymentData);

      toast({ title: 'Success', description: response?.message || 'Payment submission created successfully.' });
      setNewPaymentOpen(false);
      setPaymentForm({ requestedCredits: '', paymentAmount: '', paymentMethod: 'Bank Transfer', paymentReference: '', submissionNotes: '', paymentSlip: null });
      fetchPaymentSubmissions();
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to submit payment', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const fetchCredentials = async () => {
    if (!currentInstituteId) {
      console.log('❌ No currentInstituteId, skipping fetch');
      return;
    }
    
    console.log('🔄 Fetching SMS credentials for institute:', currentInstituteId);
    setLoadingCredentials(true);
    try {
      const response = await enhancedCachedClient.get(
        `/sms/credentials/status`,
        { instituteId: currentInstituteId },
        {
          ttl: CACHE_TTL.SMS_CREDENTIALS,
          forceRefresh: false,
          userId: currentInstituteId
        }
      );
      console.log('✅ SMS credentials response:', response);
      setCredentials(response as SMSCredentials);
      console.log('✅ Credentials set successfully:', response);
    } catch (error) {
      console.error('❌ Failed to fetch SMS credentials:', error);
      toast({
        title: 'Warning',
        description: 'Could not load SMS credits information',
        variant: 'destructive',
      });
    } finally {
      setLoadingCredentials(false);
    }
  };

  // Check if user has permission
  const allowedRoles = new Set(['InstituteAdmin', 'INSTITUTE_ADMIN']);
  if (!allowedRoles.has(String(instituteRole))) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Only Institute Admins can access SMS features.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentInstituteId) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>No Institute Selected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Please select an institute to send SMS.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleBulkSMS = async () => {
    if (!bulkMessage.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a message',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedMaskId) {
      toast({
        title: 'Error',
        description: 'Please select a mask ID',
        variant: 'destructive',
      });
      return;
    }

    if (selectedRecipientTypes.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one recipient type',
        variant: 'destructive',
      });
      return;
    }

    setIsBulkSending(true);
    try {
      const response: any = await apiClient.post(
        `/sms/send-bulk?instituteId=${currentInstituteId}`,
        {
          messageTemplate: bulkMessage,
          recipientTypes: selectedRecipientTypes,
          classIds: selectedClasses,
          subjectIds: selectedSubjects,
          maskId: selectedMaskId,
          isNow: isBulkNow,
        }
      );

      toast({
        title: 'Success',
        description: `${response.message || 'SMS created successfully'}. Message ID: ${response.messageId || 'N/A'}. Recipients: ${response.totalRecipients || 0}. Status: ${response.status || 'Unknown'}. Estimated Credits: ${response.estimatedCredits || 0}. Processing Time: ${response.processingTime || 'N/A'}`,
      });

      // Reset form
      setBulkMessage('');
      setSelectedClasses([]);
      setSelectedClassItems([]);
      setSelectedSubjects([]);
      setSelectedRecipientTypes([]);
      const now = new Date();
      const sriLankaTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
      setBulkScheduledAt(sriLankaTime.toISOString().slice(0, 16));
      setIsBulkNow(true);
      
      // Refresh credentials
      fetchCredentials();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to send bulk SMS',
        variant: 'destructive',
      });
    } finally {
      setIsBulkSending(false);
    }
  };


  const toggleRecipientType = (recipientType: string) => {
    setSelectedRecipientTypes((prev) =>
      prev.includes(recipientType) ? prev.filter((t) => t !== recipientType) : [...prev, recipientType]
    );
  };

  const removeClassId = (id: string) => {
    setSelectedClasses(selectedClasses.filter((c) => c !== id));
    setSelectedClassItems(selectedClassItems.filter((c) => c.id !== id));
  };

  const removeSubjectId = (id: string) => {
    setSelectedSubjects(selectedSubjects.filter((s) => s !== id));
  };


  const addCustomRecipient = () => {
    if (!customName.trim() || !customPhone.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter both name and phone number',
        variant: 'destructive',
      });
      return;
    }

    const phoneRegex = /^\+94\d{9}$/;
    if (!phoneRegex.test(customPhone.trim())) {
      toast({
        title: 'Error',
        description: 'Phone number must be in format +94XXXXXXXXX',
        variant: 'destructive',
      });
      return;
    }

    setCustomRecipients([...customRecipients, { name: customName.trim(), phoneNumber: customPhone.trim() }]);
    setCustomName('');
    setCustomPhone('');
  };

  const removeCustomRecipient = (index: number) => {
    setCustomRecipients(customRecipients.filter((_, i) => i !== index));
  };

  const handleCustomSMS = async () => {
    if (!customMessage.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a message',
        variant: 'destructive',
      });
      return;
    }

    if (customRecipients.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one recipient',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedMaskId) {
      toast({
        title: 'Error',
        description: 'Please select a mask ID',
        variant: 'destructive',
      });
      return;
    }

    setIsCustomSending(true);
    try {
      const response: any = await apiClient.post('/sms/send-custom', {
        messageTemplate: customMessage,
        customRecipients,
        maskId: selectedMaskId,
        isNow: isCustomNow,
        scheduledAt: isCustomNow ? new Date().toISOString() : customScheduledAt,
      });

      toast({
        title: 'Success',
        description: `${response.message || 'SMS scheduled successfully'}. Recipients: ${response.totalRecipients}. Status: ${response.status}`,
      });

      // Reset form
      setCustomMessage('');
      setCustomRecipients([]);
      setCustomName('');
      setCustomPhone('');
      const now = new Date();
      const sriLankaTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
      setCustomScheduledAt(sriLankaTime.toISOString().slice(0, 16));
      setIsCustomNow(true);
      
      // Refresh credentials
      fetchCredentials();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to send custom SMS',
        variant: 'destructive',
      });
    } finally {
      setIsCustomSending(false);
    }
  };

  console.log('🎨 Rendering SMS component, credentials:', credentials);
  console.log('🏢 Current Institute ID:', currentInstituteId);
  
  const [activeTab, setActiveTab] = useState('bulk');

  return (
    <div className="container mx-auto max-w-6xl p-3 sm:p-6 space-y-4 sm:space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">SMS</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Send bulk messages, manage sender masks, and track payments.
        </p>
      </header>

      {/* SMS Credits Display */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              SMS Credits Information
            </CardTitle>

            <div className="flex flex-wrap items-center gap-2">
              {credentials && (
                <Badge variant={credentials.isActive ? 'default' : 'destructive'}>
                  {credentials.isActive ? 'Active' : 'Inactive'}
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={fetchCredentials} disabled={loadingCredentials}>
                <RefreshCw className={`h-4 w-4 ${loadingCredentials ? 'animate-spin' : ''}`} />
                <span className="ml-2 hidden sm:inline">{loadingCredentials ? 'Loading...' : 'Load Data'}</span>
                <span className="ml-2 sm:hidden">{loadingCredentials ? 'Loading' : 'Load'}</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!credentials && !loadingCredentials ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg mb-2">Click "Load Data" to view SMS credits</p>
              <p className="text-muted-foreground text-sm">Credits information will appear here</p>
            </div>
          ) : loadingCredentials ? (
            <p className="text-muted-foreground">Loading SMS credentials...</p>
          ) : credentials ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Available Credits</p>
                <p className="text-2xl font-bold text-primary">{Math.floor(Number(credentials.availableCredits))}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Credits Used</p>
                <p className="text-2xl font-bold">{Number(credentials.totalCreditsUsed)}</p>
              </div>
              <div>
                <Label htmlFor="mask-id">Mask Name</Label>
                <Select value={selectedMaskId} onValueChange={setSelectedMaskId}>
                  <SelectTrigger id="mask-id" className="mt-1">
                    <SelectValue placeholder="Select a mask" />
                  </SelectTrigger>
                  <SelectContent>
                    {credentials.senderMasks && credentials.senderMasks.map((mask) => (
                      <SelectItem key={mask.maskId} value={mask.maskId}>
                        <div className="flex flex-col">
                          <span className="font-medium">{mask.displayName}</span>
                          <span className="text-xs text-muted-foreground">{mask.phoneNumber}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No credentials data available</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            SMS Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="bulk" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3">
                <Users className="h-4 w-4 shrink-0" />
                <span className={activeTab === "bulk" ? "" : "hidden sm:inline"}>
                  Bulk SMS
                </span>
              </TabsTrigger>
              <TabsTrigger value="custom" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3">
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className={activeTab === "custom" ? "" : "hidden sm:inline"}>
                  Custom SMS
                </span>
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3">
                <DollarSign className="h-4 w-4 shrink-0" />
                <span className={activeTab === "payments" ? "" : "hidden sm:inline"}>
                  Payments
                </span>
              </TabsTrigger>
            </TabsList>

            {/* Bulk SMS Tab */}
            <TabsContent value="bulk" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bulk-message">Message Template</Label>
                  <Textarea
                    id="bulk-message"
                    placeholder="Dear {{firstName}}, your class schedule has been updated..."
                    value={bulkMessage}
                    onChange={(e) => setBulkMessage(e.target.value)}
                    rows={4}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Recipient Types</Label>
                  <div className="flex flex-wrap gap-4 mt-2">
                    {['CUSTOM', 'STUDENTS', 'TEACHERS', 'PARENTS', 'ADMIN', 'ALL'].map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`recipienttype-${type}`}
                          checked={selectedRecipientTypes.includes(type)}
                          onCheckedChange={() => toggleRecipientType(type)}
                        />
                        <label htmlFor={`recipienttype-${type}`} className="text-sm cursor-pointer">
                          {type}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="class-ids">Classes</Label>
                  <div className="flex gap-2 mt-2">
                    <ClassMultiSelectDialog
                      instituteId={currentInstituteId}
                      userId={currentInstituteId}
                      role={String(instituteRole || 'User')}
                      selectedIds={selectedClasses}
                      onChange={(ids, items) => {
                        setSelectedClasses(ids);
                        if (items) setSelectedClassItems(items);
                      }}
                      triggerLabel={selectedClasses.length > 0 ? `${selectedClasses.length} Selected` : "Select Classes"}
                    />
                  </div>

                  {selectedClassItems.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedClassItems.map((cls) => (
                        <Badge key={cls.id} variant="secondary" className="cursor-pointer" onClick={() => removeClassId(cls.id)}>
                          {cls.name} • {cls.academicYear} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="subject-ids">Subjects</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="subject-ids"
                      value={selectedSubjects.join(', ')}
                      placeholder="Subject selection locked"
                      disabled
                      className="bg-muted/50"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      disabled 
                      className="opacity-60 cursor-not-allowed"
                    >
                      <Lock className="h-4 w-4 mr-1" />
                      Select
                    </Button>
                  </div>

                  {selectedSubjects.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedSubjects.map((id) => (
                        <Badge key={id} variant="secondary" className="cursor-pointer" onClick={() => removeSubjectId(id)}>
                          {id} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="bulk-scheduled">Scheduled At</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="bulk-is-now"
                        checked={true}
                        disabled
                        className="opacity-70"
                      />
                      <label htmlFor="bulk-is-now" className="text-sm text-muted-foreground cursor-not-allowed">
                        Send Now (locked)
                      </label>
                    </div>
                  </div>
                  <Input
                    id="bulk-scheduled"
                    type="datetime-local"
                    value={bulkScheduledAt}
                    onChange={(e) => setBulkScheduledAt(e.target.value)}
                    disabled={isBulkNow}
                    className="mt-2"
                  />
                </div>

                <Button onClick={handleBulkSMS} disabled={isBulkSending} className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  {isBulkSending ? 'Sending...' : 'Send Bulk SMS'}
                </Button>
              </div>
            </TabsContent>

            {/* Custom SMS Tab */}
            <TabsContent value="custom" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="custom-message">Message Template</Label>
                  <Textarea
                    id="custom-message"
                    placeholder="Hello {{name}}, welcome to our institute! Your admission is confirmed."
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    rows={4}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Add Recipients</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    <Input
                      placeholder="Recipient Name"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addCustomRecipient()}
                    />
                    <div className="flex gap-2">
                      <Input
                        placeholder="+94771234567"
                        value={customPhone}
                        onChange={(e) => setCustomPhone(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addCustomRecipient()}
                      />
                      <Button type="button" onClick={addCustomRecipient} size="icon" variant="outline">
                        +
                      </Button>
                    </div>
                  </div>
                  {customRecipients.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm font-medium">Recipients ({customRecipients.length}):</p>
                      <div className="flex flex-wrap gap-2">
                        {customRecipients.map((recipient, index) => (
                          <Badge 
                            key={index} 
                            variant="secondary" 
                            className="cursor-pointer px-3 py-1"
                            onClick={() => removeCustomRecipient(index)}
                          >
                            {recipient.name} - {recipient.phoneNumber} ×
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="custom-scheduled">Scheduled At</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="custom-is-now"
                        checked={true}
                        disabled
                        className="opacity-70"
                      />
                      <label htmlFor="custom-is-now" className="text-sm text-muted-foreground cursor-not-allowed">
                        Send Now (locked)
                      </label>
                    </div>
                  </div>
                  <Input
                    id="custom-scheduled"
                    type="datetime-local"
                    value={customScheduledAt}
                    onChange={(e) => setCustomScheduledAt(e.target.value)}
                    disabled={isCustomNow}
                    className="mt-2"
                  />
                </div>

                <Button onClick={handleCustomSMS} disabled={isCustomSending} className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  {isCustomSending ? 'Sending...' : 'Send Custom SMS'}
                </Button>
              </div>
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Payment Submissions</h3>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm"
                      className="flex items-center gap-2"
                      onClick={() => setNewPaymentOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">New Payment</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={fetchPaymentSubmissions}
                      disabled={loadingPayments}
                      className="gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${loadingPayments ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">{loadingPayments ? 'Loading...' : 'Load Data'}</span>
                      <span className="sm:hidden">{loadingPayments ? 'Loading' : 'Load'}</span>
                    </Button>
                  </div>
                </div>

                {loadingPayments ? (
                  <p className="text-muted-foreground">Loading payment submissions...</p>
                ) : (
                  <Paper sx={{ width: '100%', overflow: 'hidden', height: 'calc(100vh - 400px)' }}>
                    <TableContainer sx={{ height: 'calc(100% - 56px)' }}>
                      <Table stickyHeader aria-label="payment submissions table">
                        <TableHead>
                          <TableRow>
                            <TableCell style={{ minWidth: 80 }}>ID</TableCell>
                            <TableCell style={{ minWidth: 150 }}>Payment Ref</TableCell>
                            <TableCell style={{ minWidth: 120 }}>Amount</TableCell>
                            <TableCell style={{ minWidth: 120 }}>Method</TableCell>
                            <TableCell style={{ minWidth: 120 }}>Credits Requested</TableCell>
                            <TableCell style={{ minWidth: 120 }}>Credits Granted</TableCell>
                            <TableCell style={{ minWidth: 100 }}>Status</TableCell>
                            <TableCell style={{ minWidth: 150 }}>Submitted At</TableCell>
                            <TableCell style={{ minWidth: 120 }}>Slip</TableCell>
                            <TableCell style={{ minWidth: 80 }}>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {paymentSubmissions.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={10} align="center">
                                <span className="text-muted-foreground">No payment submissions found</span>
                              </TableCell>
                            </TableRow>
                          ) : (
                            paymentSubmissions.map((payment) => (
                              <TableRow hover role="checkbox" tabIndex={-1} key={payment.id}>
                                <TableCell>#{payment.id}</TableCell>
                                <TableCell>{payment.paymentReference}</TableCell>
                                <TableCell>Rs. {payment.paymentAmount}</TableCell>
                                <TableCell>{payment.paymentMethod}</TableCell>
                                <TableCell>{payment.requestedCredits}</TableCell>
                                <TableCell>{payment.creditsGranted}</TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={payment.status === 'REJECTED' ? 'destructive' : 'default'}
                                    className={
                                      payment.status === 'VERIFIED' ? 'bg-green-600 hover:bg-green-700' : 
                                      payment.status === 'PENDING' ? 'bg-yellow-500 hover:bg-yellow-600' : 
                                      ''
                                    }
                                  >
                                    {payment.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {payment.submittedAt && new Date(payment.submittedAt).toString() !== 'Invalid Date' 
                                    ? format(new Date(payment.submittedAt), 'MMM dd, yyyy HH:mm')
                                    : 'N/A'}
                                </TableCell>
                                <TableCell>
                                  {payment.paymentSlipUrl ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => window.open(payment.paymentSlipUrl, '_blank')}
                                    >
                                      <Eye className="h-4 w-4 mr-1" />
                                      View
                                    </Button>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">N/A</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => {
                                      setSelectedPayment(payment);
                                      setViewPaymentDialogOpen(true);
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <TablePagination
                      rowsPerPageOptions={[10, 25, 50, 100]}
                      component="div"
                      count={paymentsTotal}
                      rowsPerPage={paymentsRowsPerPage}
                      page={paymentsPage}
                      onPageChange={(event, newPage) => {
                        setPaymentsPage(newPage);
                      }}
                      onRowsPerPageChange={(event) => {
                        setPaymentsRowsPerPage(parseInt(event.target.value, 10));
                        setPaymentsPage(0);
                      }}
                    />
                  </Paper>
                )}
              </div>
            </TabsContent>


          </Tabs>
        </CardContent>
      </Card>

      {/* View Payment Details Dialog */}
      <Dialog open={viewPaymentDialogOpen} onOpenChange={setViewPaymentDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Submission Details</DialogTitle>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Payment ID</label>
                  <p className="text-base">#{selectedPayment.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Institute ID</label>
                  <p className="text-base">{selectedPayment.instituteId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Submitted By</label>
                  <p className="text-base">{selectedPayment.submittedBy}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    <Badge 
                      variant={selectedPayment.status === 'REJECTED' ? 'destructive' : 'default'}
                      className={
                        selectedPayment.status === 'VERIFIED' ? 'bg-green-600 hover:bg-green-700' : 
                        selectedPayment.status === 'PENDING' ? 'bg-yellow-500 hover:bg-yellow-600' : 
                        ''
                      }
                    >
                      {selectedPayment.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Payment Amount</label>
                  <p className="text-base font-semibold">Rs. {selectedPayment.paymentAmount}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Payment Method</label>
                  <p className="text-base">{selectedPayment.paymentMethod}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Payment Reference</label>
                  <p className="text-base">{selectedPayment.paymentReference}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Cost Per Credit</label>
                  <p className="text-base">{selectedPayment.costPerCredit || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Requested Credits</label>
                  <p className="text-base">{selectedPayment.requestedCredits}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Credits Granted</label>
                  <p className="text-base font-semibold text-green-600">{selectedPayment.creditsGranted}</p>
                </div>
              </div>

              {selectedPayment.paymentSlipFilename && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Payment Slip</label>
                  <p className="text-base">{selectedPayment.paymentSlipFilename}</p>
                  {selectedPayment.paymentSlipUrl && (
                    <a 
                      href={selectedPayment.paymentSlipUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      View Payment Slip
                    </a>
                  )}
                </div>
              )}

              {selectedPayment.submissionNotes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Submission Notes</label>
                  <p className="text-base bg-gray-50 dark:bg-gray-800 p-3 rounded mt-1">
                    {selectedPayment.submissionNotes}
                  </p>
                </div>
              )}

              {selectedPayment.adminNotes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Admin Notes</label>
                  <p className="text-base bg-gray-50 dark:bg-gray-800 p-3 rounded mt-1">
                    {selectedPayment.adminNotes}
                  </p>
                </div>
              )}

              {selectedPayment.rejectionReason && (
                <div>
                  <label className="text-sm font-medium text-red-500">Rejection Reason</label>
                  <p className="text-base text-red-600">{selectedPayment.rejectionReason}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {selectedPayment.verifiedBy && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Verified By</label>
                    <p className="text-base">{selectedPayment.verifiedBy}</p>
                  </div>
                )}
                {selectedPayment.verifiedAt && new Date(selectedPayment.verifiedAt).toString() !== 'Invalid Date' && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Verified At</label>
                    <p className="text-base">{format(new Date(selectedPayment.verifiedAt), 'PPpp')}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                <div>
                  <label className="font-medium">Submitted At</label>
                  <p>{selectedPayment.submittedAt && new Date(selectedPayment.submittedAt).toString() !== 'Invalid Date' ? format(new Date(selectedPayment.submittedAt), 'PPpp') : 'N/A'}</p>
                </div>
                <div>
                  <label className="font-medium">Created At</label>
                  <p>{selectedPayment.createdAt && new Date(selectedPayment.createdAt).toString() !== 'Invalid Date' ? format(new Date(selectedPayment.createdAt), 'PPpp') : 'N/A'}</p>
                </div>
                <div>
                  <label className="font-medium">Updated At</label>
                  <p>{selectedPayment.updatedAt && new Date(selectedPayment.updatedAt).toString() !== 'Invalid Date' ? format(new Date(selectedPayment.updatedAt), 'PPpp') : 'N/A'}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Payment Dialog */}
      <Dialog open={newPaymentOpen} onOpenChange={setNewPaymentOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submit Payment for SMS Credits</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="requestedCredits">Requested Credits *</Label>
                <Input
                  id="requestedCredits"
                  type="number"
                  placeholder="1000"
                  value={paymentForm.requestedCredits}
                  onChange={(e) => setPaymentForm({ ...paymentForm, requestedCredits: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentAmount">Payment Amount *</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  step="0.01"
                  placeholder="1000.00"
                  value={paymentForm.paymentAmount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentAmount: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method *</Label>
              <Select 
                value={paymentForm.paymentMethod} 
                onValueChange={(value) => setPaymentForm({ ...paymentForm, paymentMethod: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                  <SelectItem value="Online Payment">Online Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentReference">Payment Reference *</Label>
              <Input
                id="paymentReference"
                placeholder="TXN12345"
                value={paymentForm.paymentReference}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentReference: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="submissionNotes">Submission Notes</Label>
              <Textarea
                id="submissionNotes"
                placeholder="Payment made on 2024-10-07 via online banking"
                value={paymentForm.submissionNotes}
                onChange={(e) => setPaymentForm({ ...paymentForm, submissionNotes: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentSlip">Payment Slip *</Label>
              <Input
                id="paymentSlip"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setPaymentForm({ ...paymentForm, paymentSlip: file });
                  }
                }}
              />
              {paymentForm.paymentSlip && (
                <p className="text-sm text-muted-foreground">
                  Selected: {paymentForm.paymentSlip.name}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setNewPaymentOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePaymentSubmit}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Payment'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SMS;
