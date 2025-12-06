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
                <div 
                  key={`${child.id}-${child.relationship}-${index}`} 
                  className="group relative cursor-pointer"
                  onClick={() => handleSelectChild(child)}
                >
                  {/* Glowing background effect */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 rounded-2xl opacity-60 group-hover:opacity-100 blur-sm transition-all duration-500 group-hover:blur-md" />
                  
                  <div className="relative bg-card rounded-2xl overflow-hidden border-0 shadow-xl">
                    {/* Header gradient banner */}
                    <div className="h-24 bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-500 relative overflow-hidden">
                      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMiIvPjwvZz48L3N2Zz4=')] opacity-30" />
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm capitalize">
                          {getRelationshipIcon(child.relationship)}
                        </Badge>
                      </div>
                      {/* Decorative circles */}
                      <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-white/10 rounded-full" />
                      <div className="absolute -top-4 -left-4 w-16 h-16 bg-white/10 rounded-full" />
                    </div>
                    
                    {/* Profile image - overlapping banner */}
                    <div className="relative -mt-12 px-6">
                      <div className="relative inline-block">
                        <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-card shadow-2xl bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/50 dark:to-cyan-900/50">
                          {child.imageUrl ? (
                            <img 
                              src={child.imageUrl} 
                              alt={child.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`absolute inset-0 flex items-center justify-center ${child.imageUrl ? 'hidden' : ''}`}>
                            <span className="text-3xl font-bold bg-gradient-to-br from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                              {getInitials(child.name)}
                            </span>
                          </div>
                        </div>
                        {/* Status indicator */}
                        <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-3 border-card flex items-center justify-center shadow-lg">
                          <Sparkles className="w-3.5 h-3.5 text-white" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="p-6 pt-4 space-y-4">
                      <div>
                        <h3 className="font-bold text-xl text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                          {child.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">Student</p>
                      </div>
                      
                      {/* Contact info cards */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border border-blue-100 dark:border-blue-900/50">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <Phone className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground">Phone</p>
                            <p className="text-sm font-medium truncate">
                              {child.phoneNumber || 'Not available'}
                            </p>
                          </div>
                        </div>
                        
                        {child.email && (
                          <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 border border-cyan-100 dark:border-cyan-900/50">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                              <Mail className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground">Email</p>
                              <p className="text-sm font-medium truncate">{child.email}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <Button 
                        className="w-full h-12 gap-2 bg-gradient-to-r from-blue-500 via-blue-600 to-cyan-500 hover:from-blue-600 hover:via-blue-700 hover:to-cyan-600 text-white border-0 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 rounded-xl font-semibold"
                      >
                        <User className="w-5 h-5" />
                        Select Children
                        <ChevronRight className="w-5 h-5 ml-auto group-hover:translate-x-1 transition-transform duration-300" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PageContainer>
    </AppLayout>
  );
};

export default MyChildren;