import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { type UserRole } from '@/contexts/AuthContext';
import { Eye, EyeOff, GraduationCap, Wifi, WifiOff, Settings, Mail, Key, UserCheck, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getBaseUrl, getBaseUrl2 } from '@/contexts/utils/auth.api';
import surakshaLogo from '@/assets/suraksha-logo.png';
import loginIllustration from '@/assets/login-illustration.png';

// Mock user credentials for different roles
const mockUsers = [{
  email: 'institute@cambridge.edu',
  password: 'institute123',
  role: 'InstituteAdmin' as UserRole,
  name: 'Cambridge Admin',
  institutes: [{
    id: '1',
    name: 'Cambridge International School',
    code: 'CIS001',
    description: 'Premier educational institution',
    isActive: true
  }]
}, {
  email: 'teacher@cambridge.edu',
  password: 'teacher123',
  role: 'Teacher' as UserRole,
  name: 'John Smith',
  institutes: [{
    id: '1',
    name: 'Cambridge International School',
    code: 'CIS001',
    description: 'Premier educational institution',
    isActive: true
  }, {
    id: '2',
    name: 'Oxford Academy',
    code: 'OXF002',
    description: 'Excellence in education',
    isActive: true
  }]
}, {
  email: 'marker@cambridge.edu',
  password: 'marker123',
  role: 'AttendanceMarker' as UserRole,
  name: 'Alice Johnson',
  institutes: [{
    id: '1',
    name: 'Cambridge International School',
    code: 'CIS001',
    description: 'Premier educational institution',
    isActive: true
  }, {
    id: '2',
    name: 'Oxford Academy',
    code: 'OXF002',
    description: 'Excellence in education',
    isActive: true
  }]
}, {
  email: 'student@cambridge.edu',
  password: 'student123',
  role: 'Student' as UserRole,
  name: 'Emma Wilson',
  institutes: [{
    id: '1',
    name: 'Cambridge International School',
    code: 'CIS001',
    description: 'Premier educational institution',
    isActive: true
  }, {
    id: '2',
    name: 'Oxford Academy',
    code: 'OXF002',
    description: 'Excellence in education',
    isActive: true
  }]
}, {
  email: 'parent@cambridge.edu',
  password: 'parent123',
  role: 'Parent' as UserRole,
  name: 'Michael Johnson',
  institutes: [{
    id: '1',
    name: 'Cambridge International School',
    code: 'CIS001',
    description: 'Premier educational institution',
    isActive: true
  }]
}, {
  email: 'orgmanager@company.com',
  password: 'orgmanager123',
  role: 'OrganizationManager' as UserRole,
  name: 'Organization Manager',
  institutes: [{
    id: 'org-1',
    name: 'Education Network International',
    code: 'ENI',
    description: 'Global education network',
    isActive: true
  }, {
    id: 'org-2',
    name: 'Academic Solutions Group',
    code: 'ASG',
    description: 'Educational technology solutions',
    isActive: true
  }, {
    id: 'org-3',
    name: 'Learning Excellence Corp',
    code: 'LEC',
    description: 'Excellence in learning management',
    isActive: true
  }]
}];
interface LoginProps {
  onLogin: (user: any) => void;
  loginFunction: (credentials: {
    identifier: string;
    password: string;
    rememberMe?: boolean;
  }) => Promise<void>;
}
type LoginStep = 'login' | 'first-login-email' | 'first-login-otp' | 'first-login-password' | 'forgot-password' | 'reset-password';
const Login = ({
  onLogin,
  loginFunction
}: LoginProps) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [baseUrl, setBaseUrl] = useState(() => {
    const stored = getBaseUrl();
    return stored || 'https://your-backend-url.com';
  });
  const [selectedRole, setSelectedRole] = useState<UserRole>('Student');
  const [showPassword, setShowPassword] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useApiLogin, setUseApiLogin] = useState(true);
  const [showFirstLogin, setShowFirstLogin] = useState(false);

  // First login and forgot password states
  const [loginStep, setLoginStep] = useState<LoginStep>('login');
  const [otp, setOtp] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [attendanceUrl, setAttendanceUrl] = useState(() => {
    const stored = getBaseUrl2();
    return stored || getBaseUrl() || 'https://your-attendance-backend-url.com';
  });
  const {
    toast
  } = useToast();

  // Store URL changes immediately to localStorage
  const handleBaseUrlChange = (newUrl: string) => {
    setBaseUrl(newUrl);
    if (newUrl.startsWith('http')) {
      localStorage.setItem('baseUrl', newUrl);
    }
  };
  const handleAttendanceUrlChange = (newUrl: string) => {
    setAttendanceUrl(newUrl);
    if (newUrl.startsWith('http')) {
      localStorage.setItem('attendanceUrl', newUrl);
    }
  };
  const getCurrentAttendanceUrl = () => {
    return localStorage.getItem('attendanceUrl') || attendanceUrl;
  };
  const getApiHeaders = () => ({
    'Content-Type': 'application/json'
  });

  // OTP Timer function
  const startOtpTimer = () => {
    setOtpTimer(60);
  };
  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  // Mock login handler
  const handleMockLogin = async (email: string, password: string, role: UserRole) => {
    const user = mockUsers.find(u => u.email === email && u.password === password && u.role === role);
    if (!user) {
      throw new Error('Invalid credentials');
    }
    return user;
  };

  // Test connection function
  const testConnection = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${baseUrl}/health`, {
        headers: getApiHeaders()
      });
      if (response.ok) {
        toast({
          title: "Connection Successful",
          description: "Backend is reachable"
        });
      } else {
        throw new Error(`Backend returned status: ${response.status}`);
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Cannot reach backend",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user requires first login
  const checkFirstLoginStatus = async (email: string) => {
    try {
      const response = await fetch(`${baseUrl}/auth/status?email=${email}`, {
        headers: getApiHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        return data.requiresFirstLogin || false;
      }
    } catch (error) {
      console.log('First login status check failed, proceeding with regular login');
    }
    return false;
  };

  // New First Login API Functions
  const initiateFirstLoginAPI = async (identifierValue: string) => {
    try {
      const response = await fetch(`${baseUrl}/auth/initiate`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          identifier: identifierValue
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast({
          title: "OTP Sent",
          description: "Please check your registered email for the verification code."
        });
        setLoginStep('first-login-otp');
        startOtpTimer();
        return true;
      } else {
        throw new Error(data.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Initiate first login error:', error);
      setError(error instanceof Error ? error.message : 'Failed to send OTP');
      return false;
    }
  };
  const verifyFirstLoginOTP = async (identifierValue: string, otpCode: string) => {
    try {
      const response = await fetch(`${baseUrl}/auth/verify-otp`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          identifier: identifierValue,
          otp: otpCode
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setVerificationToken(data.verificationToken);
        setLoginStep('first-login-password');
        toast({
          title: "OTP Verified",
          description: "Please set your new password."
        });
        return true;
      } else {
        throw new Error(data.message || 'Invalid OTP');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      setError(error instanceof Error ? error.message : 'OTP verification failed');
      return false;
    }
  };
  const setFirstLoginPassword = async () => {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    // Password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      setError('Password must be at least 8 characters with uppercase, lowercase, number, and special character (@$!%*?&)');
      return false;
    }
    try {
      const response = await fetch(`${baseUrl}/auth/set-password`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          identifier,
          verificationToken,
          password: newPassword,
          confirmPassword,
          phoneNumber: phoneNumber || undefined
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast({
          title: "Password Set Successfully",
          description: "You can now login with your credentials."
        });

        // Reset to login step and clear form
        setLoginStep('login');
        setPassword(newPassword);
        setNewPassword('');
        setConfirmPassword('');
        setVerificationToken('');
        setOtp('');
        setPhoneNumber('');
        return true;
      } else {
        throw new Error(data.message || 'Failed to set password');
      }
    } catch (error) {
      console.error('Set password error:', error);
      setError(error instanceof Error ? error.message : 'Failed to set password');
      return false;
    }
  };
  const resendFirstLoginOTP = async () => {
    try {
      const response = await fetch(`${baseUrl}/auth/resend-otp`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          identifier
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast({
          title: "OTP Resent",
          description: "Please check your registered email for the new verification code."
        });
        setOtp('');
        startOtpTimer();
        return true;
      } else {
        throw new Error(data.message || 'Failed to resend OTP');
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      setError(error instanceof Error ? error.message : 'Failed to resend OTP');
      return false;
    }
  };

  // Forgot password functions
  const startForgotPassword = () => {
    setLoginStep('forgot-password');
    setError('');
    setOtp('');
    setVerificationToken('');
    setNewPassword('');
    setConfirmPassword('');
  };
  const initiateForgotPassword = async (identifierValue: string) => {
    try {
      const response = await fetch(`${baseUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          identifier: identifierValue
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast({
          title: "Reset Code Sent",
          description: data.message || `Password reset code sent to your registered email. Expires in ${data.data?.expiresInMinutes || 15} minutes.`
        });
        setLoginStep('reset-password');
        startOtpTimer();
        return true;
      } else {
        throw new Error(data.message || 'Failed to send reset code');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setError(error instanceof Error ? error.message : 'Failed to send reset code');
      return false;
    }
  };
  const resetPassword = async () => {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    // Password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      setError('Password must be at least 8 characters with uppercase, lowercase, number, and special character (@$!%*?&)');
      return false;
    }
    try {
      const response = await fetch(`${baseUrl}/auth/reset-password`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          identifier,
          otp,
          newPassword,
          confirmPassword
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast({
          title: "Password Reset Successfully",
          description: data.message || "You can now login with your new password."
        });

        // Reset to login step and clear form
        setLoginStep('login');
        setPassword(newPassword);
        setNewPassword('');
        setConfirmPassword('');
        setVerificationToken('');
        setOtp('');
        return true;
      } else {
        throw new Error(data.message || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setError(error instanceof Error ? error.message : 'Failed to reset password');
      return false;
    }
  };
  const resendForgotPasswordOtp = async () => {
    try {
      const response = await fetch(`${baseUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          identifier
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast({
          title: "Reset Code Resent",
          description: "Please check your registered email for the new reset code."
        });
        setOtp('');
        startOtpTimer();
        return true;
      } else {
        throw new Error(data.message || 'Failed to resend reset code');
      }
    } catch (error) {
      console.error('Resend reset code error:', error);
      setError(error instanceof Error ? error.message : 'Failed to resend reset code');
      return false;
    }
  };
  const handleForgotPasswordFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (loginStep === 'forgot-password') {
        await initiateForgotPassword(identifier);
      } else if (loginStep === 'reset-password') {
        const success = await resetPassword();
        if (success) {
          toast({
            title: "Success!",
            description: "Your password has been reset successfully. Please login now."
          });
        }
      }
    } catch (error) {
      console.error('Forgot password flow error:', error);
      setError(error instanceof Error ? error.message : 'Process failed');
    } finally {
      setIsLoading(false);
    }
  };
  const handleQuickLogin = (role: UserRole) => {
    const user = mockUsers.find(u => u.role === role);
    if (user) {
      setIdentifier(user.email);
      setPassword(user.password);
      setSelectedRole(role);
    }
  };
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Validate base URL is configured for API login
    if (useApiLogin && !baseUrl.startsWith('http')) {
      setError('Please enter a valid Backend URL (starting with http:// or https://) in the settings above before attempting login.');
      setIsLoading(false);
      return;
    }
    try {
      if (useApiLogin) {
        console.log('Attempting API login with credentials:', {
          identifier,
          password: '***'
        });
        console.log('Using base URL:', baseUrl);

        // Use the passed login function from AuthContext
        await loginFunction({
          identifier,
          password,
          rememberMe
        });
        toast({
          title: "Success",
          description: "Logged in successfully"
        });
      } else {
        // Handle mock login - use identifier as email for mock login
        const user = await handleMockLogin(identifier, password, selectedRole);
        toast({
          title: "Success",
          description: `Logged in successfully as ${user.role}`
        });
        console.log('User logged in:', user);
        console.log('User role:', user.role);
        onLogin(user);
      }
    } catch (error) {
      console.error('Login failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setError(errorMessage);
      toast({
        title: "Error",
        description: `Login failed: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleFirstLoginAPIFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (loginStep === 'first-login-email') {
        await initiateFirstLoginAPI(identifier);
      } else if (loginStep === 'first-login-otp') {
        await verifyFirstLoginOTP(identifier, otp);
      } else if (loginStep === 'first-login-password') {
        const success = await setFirstLoginPassword();
        if (success) {
          toast({
            title: "Welcome!",
            description: "Your account has been set up successfully. Please login now."
          });
        }
      }
    } catch (error) {
      console.error('First login API flow error:', error);
      setError(error instanceof Error ? error.message : 'Process failed');
    } finally {
      setIsLoading(false);
    }
  };
  const resetToLogin = () => {
    setLoginStep('login');
    setError('');
    setOtp('');
    setVerificationToken('');
    setNewPassword('');
    setConfirmPassword('');
    setPhoneNumber('');
    setShowFirstLogin(false);
  };
  const startFirstLogin = () => {
    setLoginStep('first-login-email');
    setError('');
    setOtp('');
    setVerificationToken('');
    setNewPassword('');
    setConfirmPassword('');
    setShowFirstLogin(true);
  };
  return <div className="min-h-screen flex flex-col md:flex-row overflow-x-hidden">
      {/* Top Illustration - Mobile Only */}
      <div className="block md:hidden w-full relative h-32 sm:h-40">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5" />
        <img src={loginIllustration} alt="AI-powered education illustration" className="absolute inset-0 w-full h-full object-cover mix-blend-multiply" loading="lazy" onError={e => {
        (e.currentTarget as HTMLImageElement).style.display = 'none';
      }} />
      </div>

      {/* Left Side - Form */}
      <div className="w-full md:w-1/2 lg:w-2/5 flex items-start md:items-center justify-center px-4 py-4 sm:p-6 md:p-8 bg-background -mt-6 md:mt-0 rounded-t-[2rem] md:rounded-none relative z-10 min-h-0 md:min-h-screen">
        <div className="w-full max-w-md space-y-3 md:space-y-6">
          {/* Logo and Header */}
          <div className="space-y-0.5 text-center">
            <div className="flex flex-col items-center justify-center mb-2 md:mb-6">
              <div className="w-14 h-14 md:w-24 md:h-24 rounded-lg overflow-hidden bg-transparent mb-1">
                <img src={surakshaLogo} alt="SurakshaLMS logo" className="w-full h-full object-contain" loading="lazy" />
              </div>
              <span className="text-2xl md:text-4xl font-bold text-foreground">SurakshaLMS</span>
            </div>
            <h1 className="text-lg md:text-2xl font-bold text-foreground">Welcome back</h1>
            <p className="text-xs text-muted-foreground">Please enter your details</p>
          </div>

          {/* Main Login/First Login/Forgot Password Card */}
          <Card className="border-border shadow-sm">
            <CardContent className="pt-4 px-4 pb-4 md:pt-8 md:px-8 md:pb-8">
            {/* Regular Login Form */}
            {loginStep === 'login' && <form onSubmit={handleLogin} className="space-y-4 md:space-y-6">
                {/* Role Selection - Only show for mock login */}
                {!useApiLogin && <div className="space-y-1.5">
                    <Label htmlFor="role" className="text-sm">Role</Label>
                    <Select value={selectedRole} onValueChange={(value: UserRole) => setSelectedRole(value)}>
                      <SelectTrigger className="h-10 md:h-11">
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="InstituteAdmin">Institute Administrator</SelectItem>
                        <SelectItem value="Teacher">Teacher</SelectItem>
                        <SelectItem value="AttendanceMarker">Attendance Marker</SelectItem>
                        <SelectItem value="Student">Student</SelectItem>
                        <SelectItem value="Parent">Parent</SelectItem>
                        <SelectItem value="OrganizationManager">Organization Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>}

                {/* Identifier Input */}
                <div className="space-y-1.5">
                  <Label htmlFor="identifier" className="text-sm font-medium text-foreground">Email, Phone, ID or Birth Certificate</Label>
                  <Input id="identifier" type="text" placeholder="Enter email, phone, ID..." value={identifier} onChange={e => setIdentifier(e.target.value)} required className="h-10 md:h-11 text-base" autoComplete="username" autoCapitalize="none" autoCorrect="off" />
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} required className="h-10 md:h-11 text-base pr-12" autoComplete="current-password" />
                    <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent touch-manipulation" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-5 w-5 text-muted-foreground" /> : <Eye className="h-5 w-5 text-muted-foreground" />}
                    </Button>
                  </div>
                </div>

                {/* Remember me and Forgot Password */}
                {useApiLogin && <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="remember"
                      className="rounded border-border w-4 h-4"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <label htmlFor="remember" className="text-xs md:text-sm text-foreground cursor-pointer">
                      Remember me
                    </label>
                  </div>
                  <Button type="button" variant="link" onClick={startForgotPassword} className="text-xs md:text-sm text-primary hover:text-primary/80 p-0 h-auto">
                    Forgot password?
                  </Button>
                </div>}

                {/* Error Message */}
                {error && <div className="text-xs md:text-sm text-destructive bg-destructive/10 p-2.5 md:p-3 rounded-md">
                    {error}
                  </div>}

                {/* Login Button */}
                <Button type="submit" className="w-full h-10 md:h-11 text-base touch-manipulation active:scale-[0.98] transition-transform" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </Button>

                {/* First Time Login Link */}
                {useApiLogin && <div className="text-center pt-1">
                    <span className="text-xs md:text-sm text-muted-foreground">Don't have an account? </span>
                    <Button type="button" variant="link" onClick={startFirstLogin} className="text-xs md:text-sm text-primary hover:text-primary/80 p-0 h-auto">
                      Sign up
                    </Button>
                  </div>}
              </form>}

            {/* First Login Email Form */}
            {loginStep === 'first-login-email' && <form onSubmit={handleFirstLoginAPIFlow} className="space-y-3 md:space-y-4">
                <div className="space-y-3 md:space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstLoginIdentifier" className="text-sm">Email, Phone, ID or Birth Certificate</Label>
                    <Input id="firstLoginIdentifier" type="text" placeholder="Enter email, phone, ID..." value={identifier} onChange={e => setIdentifier(e.target.value)} required className="h-10 md:h-11 text-base" autoComplete="username" autoCapitalize="none" />
                  </div>

                  <div className="text-xs md:text-sm text-muted-foreground bg-primary/10 p-2.5 md:p-3 rounded-lg">
                    We'll send a 6-digit verification code to your registered email address.
                  </div>

                  {error && <div className="text-xs md:text-sm text-destructive bg-destructive/10 p-2.5 rounded-md">
                      {error}
                    </div>}

                  <Button type="submit" className="w-full h-10 md:h-11 text-base touch-manipulation" disabled={isLoading}>
                    {isLoading ? 'Sending Code...' : 'Send Verification Code'}
                  </Button>

                  <Button type="button" variant="ghost" onClick={resetToLogin} className="w-full h-9 md:h-10 touch-manipulation">
                    Back to Login
                  </Button>
                </div>
              </form>}

            {/* First Login OTP Verification */}
            {loginStep === 'first-login-otp' && <form onSubmit={handleFirstLoginAPIFlow} className="space-y-3 md:space-y-4">
                <div className="space-y-3 md:space-y-4">
                  <div className="text-center">
                    <p className="text-xs md:text-sm text-muted-foreground">
                      We sent a 6-digit code to your registered email address
                    </p>
                  </div>
                  
                  <div className="flex justify-center py-2">
                    <InputOTP maxLength={6} value={otp} onChange={setOtp} className="gap-1.5 md:gap-2">
                      <InputOTPGroup className="gap-1.5 md:gap-2">
                        <InputOTPSlot index={0} className="w-10 h-12 md:w-12 md:h-14 text-lg md:text-xl" />
                        <InputOTPSlot index={1} className="w-10 h-12 md:w-12 md:h-14 text-lg md:text-xl" />
                        <InputOTPSlot index={2} className="w-10 h-12 md:w-12 md:h-14 text-lg md:text-xl" />
                        <InputOTPSlot index={3} className="w-10 h-12 md:w-12 md:h-14 text-lg md:text-xl" />
                        <InputOTPSlot index={4} className="w-10 h-12 md:w-12 md:h-14 text-lg md:text-xl" />
                        <InputOTPSlot index={5} className="w-10 h-12 md:w-12 md:h-14 text-lg md:text-xl" />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  {error && <div className="text-xs md:text-sm text-destructive bg-destructive/10 p-2.5 rounded-md text-center">
                      {error}
                    </div>}

                  <Button type="submit" className="w-full h-10 md:h-11 text-base touch-manipulation" disabled={isLoading || otp.length !== 6}>
                    {isLoading ? 'Verifying...' : 'Verify Code'}
                  </Button>

                  <div className="text-center">
                    {otpTimer > 0 ? <p className="text-xs md:text-sm text-muted-foreground">
                        Resend code in {otpTimer}s
                      </p> : <Button type="button" variant="ghost" onClick={resendFirstLoginOTP} disabled={isLoading} className="h-9 touch-manipulation">
                        Resend Code
                      </Button>}
                  </div>

                  <Button type="button" variant="ghost" onClick={resetToLogin} className="w-full h-9 md:h-10 touch-manipulation">
                    Back to Login
                  </Button>
                </div>
              </form>}

            {/* First Login Password Setup */}
            {loginStep === 'first-login-password' && <form onSubmit={handleFirstLoginAPIFlow} className="space-y-3 md:space-y-4">
                <div className="space-y-3 md:space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="newFirstPassword" className="text-sm">New Password</Label>
                    <div className="relative">
                      <Input id="newFirstPassword" type={showNewPassword ? 'text' : 'password'} placeholder="Enter your new password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="h-10 md:h-11 text-base pr-12" autoComplete="new-password" />
                      <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent touch-manipulation" onClick={() => setShowNewPassword(!showNewPassword)}>
                        {showNewPassword ? <EyeOff className="h-5 w-5 text-muted-foreground" /> : <Eye className="h-5 w-5 text-muted-foreground" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirmFirstPassword" className="text-sm">Confirm Password</Label>
                    <div className="relative">
                      <Input id="confirmFirstPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm your new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="h-10 md:h-11 text-base pr-12" autoComplete="new-password" />
                      <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent touch-manipulation" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                        {showConfirmPassword ? <EyeOff className="h-5 w-5 text-muted-foreground" /> : <Eye className="h-5 w-5 text-muted-foreground" />}
                      </Button>
                    </div>
                  </div>

                  <div className="text-[10px] md:text-xs text-muted-foreground space-y-0.5 bg-muted/50 p-2 rounded-md">
                    <p className="font-medium">Password Requirements:</p>
                    <ul className="list-disc list-inside space-y-0.5 ml-1">
                      <li>8+ chars, uppercase, lowercase, number, special (@$!%*?&)</li>
                    </ul>
                  </div>

                  {error && <div className="text-xs md:text-sm text-destructive bg-destructive/10 p-2.5 rounded-md">
                      {error}
                    </div>}

                  <Button type="submit" className="w-full h-10 md:h-11 text-base touch-manipulation" disabled={isLoading || !newPassword || !confirmPassword}>
                    {isLoading ? 'Setting Password...' : 'Set Password'}
                  </Button>

                  <Button type="button" variant="ghost" onClick={resetToLogin} className="w-full h-9 md:h-10 touch-manipulation">
                    Back to Login
                  </Button>
                </div>
              </form>}

            {/* Forgot Password Form */}
            {loginStep === 'forgot-password' && <form onSubmit={handleForgotPasswordFlow} className="space-y-3 md:space-y-4">
                <div className="space-y-3 md:space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="resetIdentifier" className="text-sm">Email, Phone, ID or Birth Certificate</Label>
                    <Input id="resetIdentifier" type="text" placeholder="Enter email, phone, ID..." value={identifier} onChange={e => setIdentifier(e.target.value)} required className="h-10 md:h-11 text-base" autoComplete="username" autoCapitalize="none" />
                  </div>

                  <div className="text-xs md:text-sm text-muted-foreground bg-primary/10 p-2.5 md:p-3 rounded-lg">
                    We'll send a 6-digit reset code to your registered email.
                  </div>

                  {error && <div className="text-xs md:text-sm text-destructive bg-destructive/10 p-2.5 rounded-md">
                      {error}
                    </div>}

                  <Button type="submit" className="w-full h-10 md:h-11 text-base touch-manipulation" disabled={isLoading}>
                    {isLoading ? 'Sending Reset Code...' : 'Send Reset Code'}
                  </Button>

                  <Button type="button" variant="ghost" onClick={resetToLogin} className="w-full h-9 md:h-10 touch-manipulation">
                    Back to Login
                  </Button>
                </div>
              </form>}

            {/* Reset Password Form */}
            {loginStep === 'reset-password' && <form onSubmit={handleForgotPasswordFlow} className="space-y-3 md:space-y-4">
                <div className="space-y-3 md:space-y-4">
                  <div className="text-center">
                    <p className="text-xs md:text-sm text-muted-foreground">
                      We sent a 6-digit reset code to your registered email
                    </p>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="resetOtp" className="text-sm">Reset Code (OTP)</Label>
                    <div className="flex justify-center py-2">
                      <InputOTP maxLength={6} value={otp} onChange={setOtp} className="gap-1.5 md:gap-2">
                        <InputOTPGroup className="gap-1.5 md:gap-2">
                          <InputOTPSlot index={0} className="w-10 h-12 md:w-12 md:h-14 text-lg md:text-xl" />
                          <InputOTPSlot index={1} className="w-10 h-12 md:w-12 md:h-14 text-lg md:text-xl" />
                          <InputOTPSlot index={2} className="w-10 h-12 md:w-12 md:h-14 text-lg md:text-xl" />
                          <InputOTPSlot index={3} className="w-10 h-12 md:w-12 md:h-14 text-lg md:text-xl" />
                          <InputOTPSlot index={4} className="w-10 h-12 md:w-12 md:h-14 text-lg md:text-xl" />
                          <InputOTPSlot index={5} className="w-10 h-12 md:w-12 md:h-14 text-lg md:text-xl" />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="newResetPassword" className="text-sm">New Password</Label>
                    <div className="relative">
                      <Input id="newResetPassword" type={showNewPassword ? 'text' : 'password'} placeholder="Enter your new password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="h-10 md:h-11 text-base pr-12" autoComplete="new-password" />
                      <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent touch-manipulation" onClick={() => setShowNewPassword(!showNewPassword)}>
                        {showNewPassword ? <EyeOff className="h-5 w-5 text-muted-foreground" /> : <Eye className="h-5 w-5 text-muted-foreground" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirmResetPassword" className="text-sm">Confirm Password</Label>
                    <div className="relative">
                      <Input id="confirmResetPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm your new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="h-10 md:h-11 text-base pr-12" autoComplete="new-password" />
                      <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent touch-manipulation" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                        {showConfirmPassword ? <EyeOff className="h-5 w-5 text-muted-foreground" /> : <Eye className="h-5 w-5 text-muted-foreground" />}
                      </Button>
                    </div>
                  </div>

                  <div className="text-[10px] md:text-xs text-muted-foreground space-y-0.5 bg-muted/50 p-2 rounded-md">
                    <p className="font-medium">Password Requirements:</p>
                    <ul className="list-disc list-inside space-y-0.5 ml-1">
                      <li>8+ chars, uppercase, lowercase, number, special (@$!%*?&)</li>
                    </ul>
                  </div>

                  {error && <div className="text-xs md:text-sm text-destructive bg-destructive/10 p-2.5 rounded-md">
                      {error}
                    </div>}

                  <Button type="submit" className="w-full h-10 md:h-11 text-base touch-manipulation" disabled={isLoading || otp.length !== 6 || !newPassword || !confirmPassword}>
                    {isLoading ? 'Resetting Password...' : 'Reset Password'}
                  </Button>

                  <div className="text-center">
                    {otpTimer > 0 ? <p className="text-xs md:text-sm text-muted-foreground">
                        Resend code in {otpTimer}s
                      </p> : <Button type="button" variant="ghost" onClick={resendForgotPasswordOtp} disabled={isLoading} className="text-xs md:text-sm h-9 touch-manipulation">
                        Resend Reset Code
                      </Button>}
                  </div>

                  <Button type="button" variant="ghost" onClick={resetToLogin} className="w-full h-9 md:h-10 touch-manipulation">
                    Back to Login
                  </Button>
                </div>
              </form>}
          </CardContent>
        </Card>

        {/* Quick Login Options - Only show for mock login */}
        {!useApiLogin && <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Login (Demo)</CardTitle>
              <CardDescription className="text-xs">Click to auto-fill credentials for testing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => handleQuickLogin('InstituteAdmin')} className="text-xs">
                  Institute Admin
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleQuickLogin('Teacher')} className="text-xs">
                  Teacher
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleQuickLogin('AttendanceMarker')} className="text-xs">
                  Att. Marker
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleQuickLogin('Student')} className="text-xs">
                  Student
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleQuickLogin('Parent')} className="text-xs">
                  Parent
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleQuickLogin('OrganizationManager')} className="text-xs">
                  Org Manager
                </Button>
              </div>
            </CardContent>
          </Card>}

        {/* API Demo Credentials */}
        {useApiLogin}

        {/* Demo Credentials - Only show for mock login */}
        {!useApiLogin && <Card className="text-xs border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Demo Credentials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-muted-foreground">
              <div><strong>Institute Admin:</strong> institute@cambridge.edu / institute123</div>
              <div><strong>Teacher:</strong> teacher@cambridge.edu / teacher123</div>
              <div><strong>Attendance Marker:</strong> marker@cambridge.edu / marker123</div>
              <div><strong>Student:</strong> student@cambridge.edu / student123</div>
              <div><strong>Parent:</strong> parent@cambridge.edu / parent123</div>
              <div><strong>Organization Manager:</strong> orgmanager@company.com / orgmanager123</div>
            </CardContent>
          </Card>}
        </div>
      </div>

      {/* Right Side - Illustration */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 relative min-h-[300px] md:min-h-screen">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5" />
        <img src={loginIllustration} alt="AI-powered education illustration" className="absolute inset-0 w-full h-full object-cover mix-blend-multiply" loading="lazy" onError={e => {
        (e.currentTarget as HTMLImageElement).style.display = 'none';
      }} />
        <div className="absolute inset-0 flex items-center justify-center p-8">
          
        </div>
      </div>
    </div>;
};
export default Login;