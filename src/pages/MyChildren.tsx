import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { parentsApi, ParentChildrenResponse, ChildData } from '@/api/parents.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Phone, Users, RefreshCw, ChevronRight, Heart, Mail, Sparkles } from 'lucide-react';
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

  // Auto-load children on mount
  useEffect(() => {
    if (user?.id && !childrenData) {
      handleLoadChildren();
    }
  }, [user?.id]);

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

  const getRelationshipColor = (relationship: string) => {
    switch (relationship.toLowerCase()) {
      case 'father':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'mother':
        return 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20';
      case 'guardian':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getRelationshipIcon = (relationship: string) => {
    return relationship.charAt(0).toUpperCase() + relationship.slice(1);
  };

  return (
    <AppLayout currentPage="my-children">
      <PageContainer>
        <div className="space-y-8">
          {/* Modern Header */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 md:p-8 border border-primary/10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                    <Heart className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Children</h1>
                    <p className="text-muted-foreground text-sm md:text-base">
                      View and manage your children's information
                    </p>
                  </div>
                </div>
              </div>
              <Button 
                onClick={handleLoadChildren} 
                disabled={loading}
                variant="outline"
                size="sm"
                className="gap-2 bg-background/50 backdrop-blur-sm hover:bg-background/80"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            
            {/* Parent Info */}
            {childrenData && (
              <div className="mt-4 pt-4 border-t border-primary/10">
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-background/60 backdrop-blur-sm border border-border/50">
                  <Avatar className="h-8 w-8 border-2 border-primary/20">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                      {getInitials(childrenData.parentName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{childrenData.parentName}</span>
                  <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-0">
                    Parent
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* Loading State */}
          {loading && !childrenData && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-6 pb-6">
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 rounded-2xl bg-muted" />
                      <div className="flex-1 space-y-3">
                        <div className="h-5 bg-muted rounded w-3/4" />
                        <div className="h-4 bg-muted rounded w-1/2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && childrenData?.children.length === 0 && (
            <Card className="border-dashed border-2">
              <CardContent className="pt-12 pb-12">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
                    <Users className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">No Children Found</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto">
                      No children are linked to your account yet
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Children Grid */}
          {childrenData && childrenData.children.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {childrenData.children.map((child, index) => (
                <Card 
                  key={`${child.id}-${child.relationship}-${index}`} 
                  className="group relative overflow-hidden hover:shadow-xl transition-all duration-500 hover:-translate-y-2 cursor-pointer border-2 border-blue-500/50 bg-gradient-to-br from-blue-50/50 to-card dark:from-blue-950/20 dark:to-card"
                  onClick={() => handleSelectChild(child)}
                >
                  {/* Blue decorative gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <CardContent className="relative pt-6 pb-6">
                    <div className="space-y-5">
                      {/* Image & Name Section */}
                      <div className="flex items-start gap-4">
                        <div className="relative">
                          {/* Profile Image */}
                          <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-blue-500/30 shadow-lg group-hover:border-blue-500/60 transition-colors duration-300">
                            {child.imageUrl ? (
                              <img 
                                src={child.imageUrl} 
                                alt={child.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-blue-600/10 ${child.imageUrl ? 'hidden' : ''}`}>
                              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {getInitials(child.name)}
                              </span>
                            </div>
                          </div>
                          {/* Online indicator */}
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
                            <Sparkles className="w-2.5 h-2.5 text-white" />
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0 space-y-2">
                          <h3 className="font-bold text-lg truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                            {child.name}
                          </h3>
                          <Badge 
                            variant="outline" 
                            className={`capitalize text-xs font-medium ${getRelationshipColor(child.relationship)}`}
                          >
                            {getRelationshipIcon(child.relationship)}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Contact Info */}
                      <div className="space-y-2.5 pt-2 border-t border-blue-500/20">
                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <span className="text-muted-foreground">
                            {child.phoneNumber || 'No phone number'}
                          </span>
                        </div>
                        {child.email && (
                          <div className="flex items-center gap-3 text-sm">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                              <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="text-muted-foreground truncate">{child.email}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <Button 
                        className="w-full gap-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white border-blue-500/30 transition-all duration-300"
                        variant="outline"
                      >
                        <User className="w-4 h-4" />
                        Select Children
                        <ChevronRight className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-transform duration-300" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </PageContainer>
    </AppLayout>
  );
};

export default MyChildren;