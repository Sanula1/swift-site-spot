import { useParams, Outlet, useLocation, NavLink } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { 
  GraduationCap, 
  Calendar, 
  Bus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import PageContainer from '@/components/layout/PageContainer';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';

const ChildDashboard = () => {
  const { childId } = useParams();
  const location = useLocation();

  const navigationItems = [
    {
      title: 'Transport Attendance',
      path: `/child/${childId}/attendance`,
      icon: Bus,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950/30',
      description: 'Check transport attendance records'
    },
  ];

  const isDashboard = location.pathname === `/child/${childId}/dashboard`;

  const getNavClassName = ({ isActive }: { isActive: boolean }) =>
    cn(
      "w-full justify-start gap-2",
      isActive && "bg-primary text-primary-foreground"
    );

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar className="border-r">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Student Information</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton asChild>
                          <NavLink to={item.path} className={getNavClassName}>
                            <Icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1">
          <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center px-4">
              <SidebarTrigger />
              <h1 className="text-lg font-semibold ml-4">Student Dashboard</h1>
            </div>
          </div>
          
          <PageContainer>
            {isDashboard ? (
              <div>
                <h2 className="text-2xl font-bold mb-6">Overview</h2>
                <div className="grid gap-4 md:grid-cols-3">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    
                    return (
                      <Card
                        key={item.path}
                        className="cursor-pointer hover:shadow-lg transition-all"
                        onClick={() => {
                          window.history.pushState({}, '', item.path);
                          window.dispatchEvent(new PopStateEvent('popstate'));
                        }}
                      >
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            <div className={cn(
                              "w-12 h-12 rounded-lg flex items-center justify-center",
                              item.bgColor
                            )}>
                              <Icon className={cn("h-6 w-6", item.color)} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">{item.title}</h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {item.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : (
              <Outlet />
            )}
          </PageContainer>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default ChildDashboard;
