import React from 'react';
import AppContent from '@/components/AppContent';

const Index = () => {
  console.log('Index component rendering');
  
  // Add error boundary to catch any rendering errors
  try {
    return <AppContent />;
  } catch (error) {
    console.error('Error in Index component:', error);
    return <div>Error loading application. Please check console for details.</div>;
  }
};

export default Index;