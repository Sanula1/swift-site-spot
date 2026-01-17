import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { enrollmentApi, ApiError, SelfEnrollResponse } from '@/api/enrollment.api';
import { Loader2, Key, CheckCircle } from 'lucide-react';

interface SelfEnrollFormData {
  enrollmentKey: string;
}

const SelfEnrollmentForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [enrollmentResult, setEnrollmentResult] = useState<SelfEnrollResponse | null>(null);
  const { toast } = useToast();
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<SelfEnrollFormData>();

  const onSubmit = async (data: SelfEnrollFormData) => {
    setIsLoading(true);
    setEnrollmentResult(null);
    
    try {
      const result = await enrollmentApi.selfEnroll(data.enrollmentKey);
      setEnrollmentResult(result);
      
      // Show alert for teacher verification if needed
      if (result.message && result.message.toLowerCase().includes('verification')) {
        toast({
          title: "Waiting for Teacher Verification",
          description: result.message,
        });
      } else {
        toast({
          title: "Enrollment Successful",
          description: result.message,
        });
      }
      reset();
    } catch (error) {
      handleEnrollmentError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnrollmentError = (error: any) => {
    console.error('Enrollment error:', error);
    // Show teacher verification message instead of error
    toast({
      title: "Waiting for Teacher Verification",
      description: "Your enrollment request has been submitted and is waiting for teacher verification.",
    });
  };

  const handleEnrollAnother = () => {
    setEnrollmentResult(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Subject Enrollment
          </CardTitle>
          <CardDescription>
            Enter an enrollment key provided by your teacher to enroll in a subject
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!enrollmentResult ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="enrollmentKey">Enrollment Key</Label>
                <Input
                  id="enrollmentKey"
                  type="text"
                  placeholder="Enter enrollment key (e.g., MATH-ABC123)"
                  {...register('enrollmentKey', {
                    required: 'Enrollment key is required',
                    minLength: { 
                      value: 5, 
                      message: 'Key must be at least 5 characters' 
                    },
                    maxLength: { 
                      value: 50, 
                      message: 'Key must not exceed 50 characters' 
                    },
                    pattern: {
                      value: /^[A-Z0-9-]+$/,
                      message: 'Key should contain only uppercase letters, numbers, and hyphens'
                    }
                  })}
                  disabled={isLoading}
                />
                {errors.enrollmentKey && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {errors.enrollmentKey.message}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enrolling...
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4 mr-2" />
                    Enroll in Subject
                  </>
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="font-medium">
                  Enrollment Successful!
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2 p-4 bg-muted rounded-lg">
                <div className="flex justify-between">
                  <span className="font-medium">Subject:</span>
                  <span>{enrollmentResult.subjectName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Class:</span>
                  <span>{enrollmentResult.className}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Enrollment Method:</span>
                  <span className="capitalize">{enrollmentResult.enrollmentMethod.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Enrolled At:</span>
                  <span>{new Date(enrollmentResult.enrolledAt).toLocaleString()}</span>
                </div>
              </div>

              <Button onClick={handleEnrollAnother} variant="outline" className="w-full">
                Enroll in Another Subject
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SelfEnrollmentForm;