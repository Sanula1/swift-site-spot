import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { parentsApi, ParentChildrenResponse, ChildData } from '@/api/parents.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Phone, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import PageContainer from '@/components/layout/PageContainer';
import AppLayout from '@/components/layout/AppLayout';

const MyChildren = () => {
  const [childrenData, setChildrenData] = useState<ParentChildrenResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, setSelectedChild } = useAuth();

  const handleLoadChildren = async () => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'User not logged in',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    try {
      const data = await parentsApi.getChildren(user.id);
      setChildrenData(data);
      toast({
        title: 'Success',
        description: 'Children data loaded successfully',
      });
    } catch (error) {
      console.error('Error loading children:', error);
      toast({
        title: 'Error',
        description: 'Failed to load children data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChild = (child: ChildData) => {
    // Store child in auth context
    setSelectedChild({
      id: child.id,
      name: child.name,
      user: {
        firstName: child.name.split(' ')[0] || child.name,
        lastName: child.name.split(' ').slice(1).join(' ') || '',
        phoneNumber: child.phoneNumber
      }
    } as any);
    navigate(`/child/${child.id}/attendance`);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <AppLayout currentPage="my-children">
      <PageContainer>
        <div className="space-y-6">
          {!childrenData && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <Users className="w-16 h-16 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">Click the button below to load your children's information</p>
                  <Button onClick={handleLoadChildren} disabled={loading}>
                    {loading ? 'Loading...' : 'Load Children'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {childrenData && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Parent Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>{getInitials(childrenData.parentName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{childrenData.parentName}</p>
                      <p className="text-sm text-muted-foreground">Parent ID: {childrenData.parentId}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {childrenData.children.map((child) => (
                  <Card key={`${child.id}-${child.relationship}`} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback>{getInitials(child.name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-semibold">{child.name}</p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {child.relationship}
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="w-4 h-4" />
                            <span>ID: {child.id}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="w-4 h-4" />
                            <span>{child.phoneNumber}</span>
                          </div>
                        </div>

                        <Button 
                          onClick={() => handleSelectChild(child)} 
                          className="w-full"
                        >
                          Select Student
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </PageContainer>
    </AppLayout>
  );
};

export default MyChildren;
