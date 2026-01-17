/**
 * MyCards - View and manage my active/deactivated cards
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  CreditCard,
  MoreVertical,
  AlertTriangle,
  Ban,
  Wifi,
  Calendar,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';
import {
  userCardApi,
  UserIdCardOrder,
  CardStatus,
  PaginatedOrdersResponse,
} from '@/api/userCard.api';
import {
  cardStatusColors,
  cardStatusLabels,
  formatDate,
  formatPrice,
  getDaysUntilExpiry,
  isExpiringSoon,
} from '@/utils/cardHelpers';
import { toast } from '@/hooks/use-toast';

const MyCards: React.FC = () => {
  const [cards, setCards] = useState<UserIdCardOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCard, setSelectedCard] = useState<UserIdCardOrder | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<CardStatus | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCards = async (forceRefresh = false) => {
    try {
      if (forceRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await userCardApi.getMyCards({}, forceRefresh);
      setCards(response.data || []);
    } catch (error: any) {
      console.error('Error fetching cards:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load cards',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const handleAction = (card: UserIdCardOrder, status: CardStatus) => {
    setSelectedCard(card);
    setActionType(status);
    setActionDialogOpen(true);
  };

  const confirmAction = async () => {
    if (!selectedCard || !actionType) return;

    try {
      setActionLoading(true);
      await userCardApi.updateMyCardStatus(selectedCard.id, {
        status: actionType,
        notes: `Card reported as ${actionType.toLowerCase()} by user`,
      });

      toast({
        title: 'Card Status Updated',
        description: `Your card has been marked as ${actionType.toLowerCase()}.`,
      });

      fetchCards(true);
    } catch (error: any) {
      console.error('Error updating card status:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update card status',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
      setActionDialogOpen(false);
      setSelectedCard(null);
      setActionType(null);
    }
  };

  const getActionLabel = (status: CardStatus) => {
    switch (status) {
      case CardStatus.LOST:
        return 'Report Lost';
      case CardStatus.DAMAGED:
        return 'Report Damaged';
      case CardStatus.DEACTIVATED:
        return 'Deactivate';
      default:
        return 'Update';
    }
  };

  const getActionDescription = (status: CardStatus) => {
    switch (status) {
      case CardStatus.LOST:
        return 'This will deactivate your card and mark it as lost. You may need to order a replacement.';
      case CardStatus.DAMAGED:
        return 'This will mark your card as damaged. You may need to order a replacement.';
      case CardStatus.DEACTIVATED:
        return 'This will deactivate your card. You can reactivate it later by contacting support.';
      default:
        return 'Are you sure you want to update this card?';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">My Cards</h2>
          <p className="text-muted-foreground">View and manage your ID cards</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchCards(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : cards.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <CreditCard className="h-16 w-16 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">No Cards Yet</h3>
              <p className="text-muted-foreground">
                You don't have any active or delivered cards yet.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => {
            const daysUntilExpiry = getDaysUntilExpiry(card.cardExpiryDate);
            const expiringSoon = isExpiringSoon(card.cardExpiryDate);
            const isActive = card.status === CardStatus.ACTIVE;

            return (
              <Card
                key={card.id}
                className={`overflow-hidden ${!isActive ? 'opacity-75' : ''}`}
              >
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      {card.card?.cardName || 'ID Card'}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {card.cardType}
                    </Badge>
                  </div>
                  {isActive && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleAction(card, CardStatus.LOST)}
                          className="text-red-600"
                        >
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Report Lost
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleAction(card, CardStatus.DAMAGED)}
                          className="text-orange-600"
                        >
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Report Damaged
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleAction(card, CardStatus.DEACTIVATED)}
                          className="text-gray-600"
                        >
                          <Ban className="h-4 w-4 mr-2" />
                          Deactivate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Status */}
                  <Badge className={`${cardStatusColors[card.status]} flex items-center gap-1 w-fit`}>
                    {isActive ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <Ban className="h-3 w-3" />
                    )}
                    {cardStatusLabels[card.status]}
                  </Badge>

                  {/* RFID */}
                  {card.rfidNumber && (
                    <div className="flex items-center gap-2 text-sm">
                      <Wifi className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono text-xs">{card.rfidNumber}</span>
                    </div>
                  )}

                  {/* Expiry */}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className={expiringSoon ? 'text-orange-500 font-medium' : ''}>
                      Expires: {formatDate(card.cardExpiryDate)}
                      {daysUntilExpiry > 0 && daysUntilExpiry <= 30 && (
                        <span className="text-xs ml-1">({daysUntilExpiry} days)</span>
                      )}
                    </span>
                  </div>

                  {/* Delivered Date */}
                  {card.deliveredAt && (
                    <div className="text-xs text-muted-foreground">
                      Delivered: {formatDate(card.deliveredAt)}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Action Confirmation Dialog */}
      <AlertDialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType ? getActionLabel(actionType) : 'Update Card'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType ? getActionDescription(actionType) : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MyCards;
