
import { useEffect } from "react";
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner, ErrorToaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import QRAttendance from '@/components/QRAttendance';
import RfidAttendance from '@/pages/RFIDAttendance';
import InstituteMarkAttendance from '@/pages/InstituteMarkAttendance';

import NotFound from "./pages/NotFound";
import Payments from "./pages/Payments";
import CreatePayment from "./pages/CreatePayment";
import PaymentSubmissions from "./pages/PaymentSubmissions";
import MySubmissions from "./pages/MySubmissions";
import InstitutePayments from "./pages/InstitutePayments";
import SubjectPayments from "./pages/SubjectPayments";
import SubjectSubmissions from "./pages/SubjectSubmissions";
import SubjectPaymentSubmissions from "./pages/SubjectPaymentSubmissions";
import PaymentSubmissionsPage from "./pages/PaymentSubmissionsPage";
import HomeworkSubmissions from "./pages/HomeworkSubmissions";
import HomeworkSubmissionDetails from "./pages/HomeworkSubmissionDetails";
import { AuthProvider } from "@/contexts/AuthContext";
import UpdateHomework from '@/pages/UpdateHomework';
import UpdateLecture from '@/pages/UpdateLecture';
import CardDemo from '@/pages/CardDemo';
import ExamResults from '@/pages/ExamResults';
import CreateExamResults from '@/pages/CreateExamResults';
import ErrorBoundary from '@/components/ErrorBoundary';
import Transport from '@/pages/Transport';
import TransportAttendance from '@/pages/TransportAttendance';
import MyChildren from '@/pages/MyChildren';
import ChildDashboard from '@/pages/ChildDashboard';
import ChildResultsPage from '@/pages/ChildResultsPage';
import ChildAttendancePage from '@/pages/ChildAttendancePage';
import ChildTransportPage from '@/pages/ChildTransportPage';

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Force light mode
    const root = document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
    localStorage.setItem('theme', 'light');
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <ErrorToaster />
            <Routes>
              {/* Main Routes - All handled by Index/AppContent */}
              <Route path="/" element={<Index />} />
              
              {/* Hierarchical Routes with Context */}
              <Route path="/institute/:instituteId/*" element={<Index />} />
              <Route path="/organization/:organizationId/*" element={<Index />} />
              <Route path="/child/:childId/*" element={<Index />} />
              <Route path="/transport/:transportId/*" element={<Index />} />
              
              {/* Dedicated Page Routes */}
              <Route path="/my-children" element={<MyChildren />} />
              <Route path="/transport" element={<Transport />} />
              <Route path="/system-payment" element={<Payments />} />
              <Route path="/system-payments/create" element={<CreatePayment />} />
              <Route path="/payment-submissions/:paymentId" element={<PaymentSubmissions />} />
              <Route path="/payment-submissions" element={<PaymentSubmissionsPage />} />
              <Route path="/my-submissions" element={<MySubmissions />} />
              <Route path="/card-demo" element={<CardDemo />} />
              
              {/* Catch-all - Everything else goes to Index/AppContent */}
              <Route path="*" element={<Index />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
