/**
 * CardManagement - Main page for ID Card management
 */

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Package, Wallet } from 'lucide-react';
import CardCatalog from '@/components/cards/CardCatalog';
import MyOrders from '@/components/cards/MyOrders';
import MyCards from '@/components/cards/MyCards';
import PageContainer from '@/components/layout/PageContainer';
import AppLayout from '@/components/layout/AppLayout';

const CardManagement: React.FC = () => {
  return (
    <AppLayout currentPage="id-cards">
      <PageContainer>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">ID Card Management</h1>
        <p className="text-muted-foreground">Order and manage your ID cards</p>
      </div>
      <Tabs defaultValue="catalog" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="catalog" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Cards</span>
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Orders</span>
          </TabsTrigger>
          <TabsTrigger value="my-cards" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">My Cards</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalog">
          <CardCatalog />
        </TabsContent>

        <TabsContent value="orders">
          <MyOrders />
        </TabsContent>

        <TabsContent value="my-cards">
          <MyCards />
        </TabsContent>
      </Tabs>
      </PageContainer>
    </AppLayout>
  );
};

export default CardManagement;
