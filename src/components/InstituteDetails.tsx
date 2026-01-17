import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth, type UserRole } from '@/contexts/AuthContext';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import { AccessControl } from '@/utils/permissions';
import { Building, Users, Phone, Mail, MapPin, Calendar, Edit, Settings } from 'lucide-react';
const InstituteDetails = () => {
  const {
    user,
    selectedInstitute
  } = useAuth();
  const userRole = useInstituteRole();
  
  if (!selectedInstitute) {
    return <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">No institute selected</p>
      </div>;
  }
  
  const canEdit = AccessControl.hasPermission(userRole, 'edit-institute');
  const handleEdit = () => {
    console.log('Edit institute:', selectedInstitute);
  };
  return <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Institute Details
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Detailed information about {selectedInstitute.name}
          </p>
        </div>
        {canEdit}
      </div>

      <div className="w-full">
        {/* Main Institute Info */}
        <div className="w-full">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Building className="h-8 w-8 text-blue-600" />
                <div>
                  <CardTitle className="text-2xl">{selectedInstitute.name}</CardTitle>
                  <CardDescription className="text-lg">
                    Code: {selectedInstitute.code}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Address</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        123 Education Street, Learning City, LC 12345
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Phone className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        +1 (555) 123-4567
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Mail className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        info@{selectedInstitute.code.toLowerCase()}.edu
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Established</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        January 2010
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Description
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {selectedInstitute.description}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats and Status */}
        
      </div>
    </div>;
};
export default InstituteDetails;