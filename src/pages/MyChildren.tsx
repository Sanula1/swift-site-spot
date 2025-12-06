import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { parentsApi, ParentChildrenResponse, ChildData } from '@/api/parents.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Phone, Users, RefreshCw, ChevronRight, Heart, Mail, Hash } from 'lucide-react';
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

  const getRelationshipBadge = (relationship: string) => {
    return (
      <Badge variant="secondary" className="capitalize text-xs font-medium">
        {relationship}
      </Badge>
    );
  };

  return (
    <AppLayout currentPage="my-children">
      <PageContainer>
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Heart className="w-8 h-8 text-primary" />
                My Children
              </h1>
              <p className="text-muted-foreground">Manage and view your children's information</p>
            </div>
            {childrenData && (
              <Button 
                onClick={handleLoadChildren} 
                disabled={loading}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
          </div>

          {/* Empty State - Load Data */}
          {!childrenData && (
            <Card className="border-dashed border-2">
              <CardContent className="pt-12 pb-12">
                <div className="text-center space-y-6">
                  <div className="relative inline-flex">
                    <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                      <Users className="w-12 h-12 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">Load Your Children</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto">
                      Click the button below to fetch and display your children's information
                    </p>
                  </div>
                  <Button 
                    onClick={handleLoadChildren} 
                    disabled={loading}
                    size="lg"
                    className="gap-2 px-8"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Users className="w-5 h-5" />
                        Load Children
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Children List */}
          {childrenData && (
            <>
              {/* Parent Info Badge */}
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-muted/50 border">
                <Avatar className="h-8 w-8 border-2 border-primary/20">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {getInitials(childrenData.parentName)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{childrenData.parentName}</span>
                <Badge variant="secondary" className="text-xs">Parent</Badge>
              </div>

              {childrenData.children.length === 0 ? (
                <Card className="border-dashed border-2">
                  <CardContent className="pt-12 pb-12">
                    <div className="text-center space-y-4">
                      <Users className="w-16 h-16 mx-auto text-muted-foreground/50" />
                      <div className="space-y-2">
                        <h3 className="text-xl font-semibold">No Children Found</h3>
                        <p className="text-muted-foreground">No children are linked to your account yet</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {childrenData.children.map((child) => (
                    <Card 
                      key={`${child.id}-${child.relationship}`} 
                      className="group relative overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer border hover:border-primary/30"
                      onClick={() => handleSelectChild(child)}
                    >
                      <CardContent className="pt-6 pb-6">
                        <div className="space-y-5">
                          {/* Avatar & Name */}
                          <div className="flex items-start gap-4">
                            <div className="relative">
                              <Avatar className="h-16 w-16 border-2 border-border shadow-sm">
                                {child.imageUrl ? (
                                  <AvatarImage 
                                    src={child.imageUrl} 
                                    alt={child.name}
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${child.id}`} />
                                )}
                                <AvatarFallback className="text-lg font-bold bg-muted text-muted-foreground">
                                  {getInitials(child.name)}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">
                                {child.name}
                              </h3>
                              {getRelationshipBadge(child.relationship)}
                            </div>
                          </div>
                          
                          {/* Info */}
                          <div className="space-y-2 pt-2">
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                                <Hash className="w-3.5 h-3.5" />
                              </div>
                              <span className="truncate">ID: {child.id}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                                <Phone className="w-3.5 h-3.5" />
                              </div>
                              <span>{child.phoneNumber || 'N/A'}</span>
                            </div>
                            {child.email && (
                              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                                  <Mail className="w-3.5 h-3.5" />
                                </div>
                                <span className="truncate">{child.email}</span>
                              </div>
                            )}
                          </div>

                          {/* Select Button */}
                          <Button 
                            className="w-full gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                            variant="outline"
                          >
                            Select Student
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </PageContainer>
    </AppLayout>
  );
};

export default MyChildren;
