import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const GoogleAuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Extract the access token from the URL hash
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const error = params.get('error');
    
    if (accessToken) {
      // Store the token in sessionStorage
      sessionStorage.setItem('google_drive_token', accessToken);
      
      // Get the return URL from sessionStorage or default to home
      const returnUrl = sessionStorage.getItem('google_oauth_return_url') || '/';
      sessionStorage.removeItem('google_oauth_return_url');
      
      // Navigate back to the original page
      navigate(returnUrl, { replace: true });
    } else if (error) {
      console.error('OAuth error:', error);
      // Navigate back with error
      const returnUrl = sessionStorage.getItem('google_oauth_return_url') || '/';
      sessionStorage.removeItem('google_oauth_return_url');
      navigate(returnUrl, { replace: true });
    }
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-sm text-muted-foreground">Connecting to Google Drive...</p>
      </div>
    </div>
  );
};

export default GoogleAuthCallback;
