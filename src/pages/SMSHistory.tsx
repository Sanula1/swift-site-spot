import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTableData } from '@/hooks/useTableData';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import { format } from 'date-fns';
import { RefreshCw, Filter, X, Eye, Plus, FileText } from 'lucide-react';
import { apiClient } from '@/api/client';
import { toast } from '@/hooks/use-toast';
interface SMSMessage {
  id: string;
  instituteId: string;
  sentBy: string;
  messageType: string;
  recipientFilterType: string;
  messageTemplate: string;
  processedMessageSample: string;
  totalRecipients: number;
  successfulSends: number;
  failedSends: number;
  creditsUsed: number;
  status: string;
  maskIdUsed: string | null;
  senderName: string | null;
  filterCriteria: any;
  scheduledAt: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  sentAt: string | null;
  completedAt: string | null;
  rejectionReason: string | null;
  errorMessage: string | null;
  deliveryReport: any;
  notificationLogged: boolean;
  createdAt: string;
  updatedAt: string;
}
export default function SMSHistory() {
  const {
    selectedInstitute
  } = useAuth();
  const [selectedMessage, setSelectedMessage] = useState<SMSMessage | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [recipientFilter, setRecipientFilter] = useState<string>('');
  const [messageTypeFilter, setMessageTypeFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [newPaymentOpen, setNewPaymentOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    requestedCredits: '',
    paymentAmount: '',
    paymentMethod: 'Bank Transfer',
    paymentReference: '',
    submissionNotes: '',
    paymentSlip: null as File | null
  });
  const {
    state: {
      data: messages,
      loading
    },
    pagination: {
      page,
      limit,
      totalCount
    },
    actions: {
      setPage,
      setLimit,
      refresh,
      updateFilters
    }
  } = useTableData<SMSMessage>({
    endpoint: selectedInstitute ? `/sms/message-history/${selectedInstitute.id}` : '',
    autoLoad: true, // Enable auto-loading from cache
    defaultParams: {
      recipientFilterType: recipientFilter || undefined,
      messageType: messageTypeFilter || undefined,
      search: searchQuery || undefined
    },
    pagination: {
      defaultLimit: 10,
      availableLimits: [10, 25, 50, 100]
    }
  });

  // Filters will be applied when you click "Load Data"
  const clearFilters = () => {
    setRecipientFilter('');
    setMessageTypeFilter('');
    setSearchQuery('');
  };
  const handleView = (message: SMSMessage) => {
    setSelectedMessage(message);
    setViewDialogOpen(true);
  };
  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      QUEUED: 'bg-yellow-500',
      PENDING: 'bg-blue-500',
      SENT: 'bg-green-500',
      FAILED: 'bg-red-500',
      APPROVED: 'bg-green-600',
      REJECTED: 'bg-red-600'
    };
    return <Badge className={statusColors[status] || 'bg-gray-500'}>
        {status}
      </Badge>;
  };
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const handleChangePage = (event: unknown, newPage: number) => {
    setCurrentPage(newPage);
    setPage(newPage);
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setLimit(+event.target.value);
    setCurrentPage(0);
    setPage(0);
  };
  const handlePaymentSubmit = async () => {
    if (!selectedInstitute) return;
    if (!paymentForm.requestedCredits || !paymentForm.paymentAmount || !paymentForm.paymentReference || !paymentForm.paymentSlip) {
      toast({
        title: "Error",
        description: "Please fill in all required fields and upload payment slip",
        variant: "destructive"
      });
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('requestedCredits', paymentForm.requestedCredits);
      formData.append('paymentAmount', paymentForm.paymentAmount);
      formData.append('paymentMethod', paymentForm.paymentMethod);
      formData.append('paymentReference', paymentForm.paymentReference);
      formData.append('submissionNotes', paymentForm.submissionNotes);
      formData.append('paymentSlip', paymentForm.paymentSlip);
      const response = await apiClient.post(`/sms/payment/submit?instituteId=${selectedInstitute.id}`, formData);
      toast({
        title: "Success",
        description: response.data.message || "Payment submission created successfully"
      });
      setNewPaymentOpen(false);
      setPaymentForm({
        requestedCredits: '',
        paymentAmount: '',
        paymentMethod: 'Bank Transfer',
        paymentReference: '',
        submissionNotes: '',
        paymentSlip: null
      });
      refresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to submit payment",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };
  const handleViewSlip = (filename: string | null) => {
    if (!filename) {
      toast({
        title: "No slip available",
        description: "This payment has no slip uploaded",
        variant: "destructive"
      });
      return;
    }
    // Open the slip - use configured backend URL
    const baseUrl = import.meta.env.VITE_LMS_BASE_URL || 'http://localhost:8080';
    const slipUrl = `${baseUrl}/sms/payment-slip/${filename}`;
    window.open(slipUrl, '_blank');
  };
  const columns = [{
    id: 'id',
    label: 'ID',
    minWidth: 80
  }, {
    id: 'messageType',
    label: 'Message Type',
    minWidth: 150
  }, {
    id: 'recipientFilterType',
    label: 'Recipient Filter',
    minWidth: 150
  }, {
    id: 'status',
    label: 'Status',
    minWidth: 120
  }, {
    id: 'maskIdUsed',
    label: 'Mask ID',
    minWidth: 150
  }, {
    id: 'totalRecipients',
    label: 'Total Recipients',
    minWidth: 120
  }, {
    id: 'successfulSends',
    label: 'Successful',
    minWidth: 100
  }, {
    id: 'failedSends',
    label: 'Failed',
    minWidth: 100
  }, {
    id: 'slip',
    label: 'Slip',
    minWidth: 100
  }, {
    id: 'actions',
    label: 'Actions',
    minWidth: 100
  }];
  if (!selectedInstitute) {
    return <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Please select an institute to view SMS history</p>
      </div>;
  }
  return <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">SMS Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">View all sent SMS messages</p>
        </div>
        <div className="flex flex-wrap gap-2">
          
          <Button onClick={() => setShowFilters(!showFilters)} variant="outline" className="flex items-center gap-2" size="sm">
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
          </Button>
          <Button onClick={refresh} disabled={loading || !selectedInstitute} variant="outline" className="flex items-center gap-2" size="sm">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{loading ? 'Loading...' : 'Load Data'}</span>
          </Button>
        </div>
      </div>

      {showFilters && <div className="bg-muted/50 p-4 rounded-lg space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold">Filters</h3>
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2">
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search (ID / Sent By)</label>
              <Input placeholder="Search by ID or Sent By..." value={searchQuery} onChange={e => { const v = e.target.value; setSearchQuery(v); updateFilters({ recipientFilterType: recipientFilter || undefined, messageType: messageTypeFilter || undefined, search: v || undefined }); }} className="w-full" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Recipient Filter</label>
              <Select value={recipientFilter || "all"} onValueChange={value => { const val = value === "all" ? '' : value; setRecipientFilter(val); updateFilters({ recipientFilterType: val || undefined, messageType: messageTypeFilter || undefined, search: searchQuery || undefined }); }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="CUSTOM">Custom</SelectItem>
                  <SelectItem value="STUDENTS">Students</SelectItem>
                  <SelectItem value="TEACHERS">Teachers</SelectItem>
                  <SelectItem value="PARENTS">Parents</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Message Type</label>
              <Select value={messageTypeFilter || "all"} onValueChange={value => { const val = value === "all" ? '' : value; setMessageTypeFilter(val); updateFilters({ recipientFilterType: recipientFilter || undefined, messageType: val || undefined, search: searchQuery || undefined }); }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Message Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Message Types</SelectItem>
                  <SelectItem value="CUSTOM_NUMBERS">Custom Numbers</SelectItem>
                  <SelectItem value="BULK_INSTITUTE_USERS">Bulk Institute Users</SelectItem>
                  <SelectItem value="CLASS_BASED">Class Based</SelectItem>
                  <SelectItem value="SUBJECT_BASED">Subject Based</SelectItem>
                  <SelectItem value="USER_TYPE_BASED">User Type Based</SelectItem>
                  <SelectItem value="SPECIFIC_USERS">Specific Users</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>}

      <Paper sx={{
      width: '100%',
      overflow: 'hidden',
      height: showFilters ? 'calc(100vh - 350px)' : 'calc(100vh - 200px)'
    }}>
        <TableContainer sx={{
        height: 'calc(100% - 56px)'
      }}>
          <Table stickyHeader aria-label="sms messages table">
            <TableHead>
              <TableRow>
                {columns.map(column => <TableCell key={column.id} style={{
                minWidth: column.minWidth
              }}>
                    {column.label}
                  </TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {messages.map(message => <TableRow hover role="checkbox" tabIndex={-1} key={message.id}>
                  <TableCell>{message.id}</TableCell>
                  <TableCell>{message.messageType.replace(/_/g, ' ')}</TableCell>
                  <TableCell>{message.recipientFilterType.replace(/_/g, ' ')}</TableCell>
                  <TableCell>{getStatusBadge(message.status)}</TableCell>
                  <TableCell>{message.maskIdUsed || '-'}</TableCell>
                  <TableCell>{message.totalRecipients}</TableCell>
                  <TableCell>
                    <span className="text-green-600 font-medium">{message.successfulSends}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-red-600 font-medium">{message.failedSends}</span>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleViewSlip((message as any).paymentSlipFilename)} disabled={!(message as any).paymentSlipFilename}>
                      <FileText className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => handleView(message)}>
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>)}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination rowsPerPageOptions={[10, 25, 50, 100]} component="div" count={totalCount} rowsPerPage={rowsPerPage} page={currentPage} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage} />
      </Paper>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>SMS Message Details</DialogTitle>
          </DialogHeader>
          
          {selectedMessage && <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Message ID</label>
                  <p className="text-base">{selectedMessage.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedMessage.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Sent By</label>
                  <p className="text-base">{selectedMessage.sentBy}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Message Type</label>
                  <p className="text-base">{selectedMessage.messageType.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Recipient Filter</label>
                  <p className="text-base">{selectedMessage.recipientFilterType.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Total Recipients</label>
                  <p className="text-base">{selectedMessage.totalRecipients}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Successful Sends</label>
                  <p className="text-base text-green-600">{selectedMessage.successfulSends}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Failed Sends</label>
                  <p className="text-base text-red-600">{selectedMessage.failedSends}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Credits Used</label>
                  <p className="text-base">{selectedMessage.creditsUsed}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Sender Name</label>
                  <p className="text-base">{selectedMessage.senderName || 'N/A'}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Message Template</label>
                <p className="text-base bg-gray-50 dark:bg-gray-800 p-3 rounded mt-1">
                  {selectedMessage.messageTemplate}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Processed Message Sample</label>
                <p className="text-base bg-gray-50 dark:bg-gray-800 p-3 rounded mt-1">
                  {selectedMessage.processedMessageSample}
                </p>
              </div>

              {selectedMessage.filterCriteria && <div>
                  <label className="text-sm font-medium text-gray-500">Filter Criteria</label>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    {Object.entries(selectedMessage.filterCriteria).map(([key, val]) => <div key={key}>
                        <div className="text-xs text-gray-500">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                        </div>
                        <div className="text-base">
                          {Array.isArray(val) ? (val as any[]).join(', ') : String(val)}
                        </div>
                      </div>)}
                  </div>
                </div>}

              <div className="grid grid-cols-2 gap-4">
                {selectedMessage.scheduledAt && new Date(selectedMessage.scheduledAt).toString() !== 'Invalid Date' && <div>
                    <label className="text-sm font-medium text-gray-500">Scheduled At</label>
                    <p className="text-base">{format(new Date(selectedMessage.scheduledAt), 'PPpp')}</p>
                  </div>}
                {selectedMessage.sentAt && new Date(selectedMessage.sentAt).toString() !== 'Invalid Date' && <div>
                    <label className="text-sm font-medium text-gray-500">Sent At</label>
                    <p className="text-base">{format(new Date(selectedMessage.sentAt), 'PPpp')}</p>
                  </div>}
                {selectedMessage.approvedAt && new Date(selectedMessage.approvedAt).toString() !== 'Invalid Date' && <div>
                    <label className="text-sm font-medium text-gray-500">Approved At</label>
                    <p className="text-base">{format(new Date(selectedMessage.approvedAt), 'PPpp')}</p>
                  </div>}
                {selectedMessage.completedAt && new Date(selectedMessage.completedAt).toString() !== 'Invalid Date' && <div>
                    <label className="text-sm font-medium text-gray-500">Completed At</label>
                    <p className="text-base">{format(new Date(selectedMessage.completedAt), 'PPpp')}</p>
                  </div>}
              </div>

              {selectedMessage.rejectionReason && <div>
                  <label className="text-sm font-medium text-red-500">Rejection Reason</label>
                  <p className="text-base text-red-600">{selectedMessage.rejectionReason}</p>
                </div>}

              {selectedMessage.errorMessage && <div>
                  <label className="text-sm font-medium text-red-500">Error Message</label>
                  <p className="text-base text-red-600">{selectedMessage.errorMessage}</p>
                </div>}

              <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                <div>
                  <label className="font-medium">Created At</label>
                  <p>{selectedMessage.createdAt ? format(new Date(selectedMessage.createdAt), 'PPpp') : 'N/A'}</p>
                </div>
                <div>
                  <label className="font-medium">Updated At</label>
                  <p>{selectedMessage.updatedAt ? format(new Date(selectedMessage.updatedAt), 'PPpp') : 'N/A'}</p>
                </div>
              </div>
            </div>}
        </DialogContent>
      </Dialog>

      {/* New Payment Dialog */}
      <Dialog open={newPaymentOpen} onOpenChange={setNewPaymentOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Submit Payment for SMS Credits</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="requestedCredits">Requested Credits *</Label>
                <Input id="requestedCredits" type="number" placeholder="1000" value={paymentForm.requestedCredits} onChange={e => setPaymentForm({
                ...paymentForm,
                requestedCredits: e.target.value
              })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentAmount">Payment Amount *</Label>
                <Input id="paymentAmount" type="number" step="0.01" placeholder="1000.00" value={paymentForm.paymentAmount} onChange={e => setPaymentForm({
                ...paymentForm,
                paymentAmount: e.target.value
              })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method *</Label>
              <Select value={paymentForm.paymentMethod} onValueChange={value => setPaymentForm({
              ...paymentForm,
              paymentMethod: value
            })}>
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
              <Input id="paymentReference" placeholder="TXN12345" value={paymentForm.paymentReference} onChange={e => setPaymentForm({
              ...paymentForm,
              paymentReference: e.target.value
            })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="submissionNotes">Submission Notes</Label>
              <Textarea id="submissionNotes" placeholder="Payment made on 2024-10-07 via online banking" value={paymentForm.submissionNotes} onChange={e => setPaymentForm({
              ...paymentForm,
              submissionNotes: e.target.value
            })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentSlip">Payment Slip *</Label>
              <Input id="paymentSlip" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => {
              const file = e.target.files?.[0];
              if (file) {
                setPaymentForm({
                  ...paymentForm,
                  paymentSlip: file
                });
              }
            }} />
              {paymentForm.paymentSlip && <p className="text-sm text-muted-foreground">
                  Selected: {paymentForm.paymentSlip.name}
                </p>}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setNewPaymentOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handlePaymentSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Payment'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
}