/**
 * OrderDetailsDialog - View full order details
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CreditCard,
  MapPin,
  Phone,
  FileText,
  Calendar,
  Clock,
  Truck,
  Hash,
  Wifi,
} from 'lucide-react';
import { UserIdCardOrder } from '@/api/userCard.api';
import {
  orderStatusColors,
  orderStatusLabels,
  cardStatusColors,
  cardStatusLabels,
  paymentStatusColors,
  paymentStatusLabels,
  formatDate,
  formatDateTime,
  formatPrice,
  getDaysUntilExpiry,
  isExpiringSoon,
} from '@/utils/cardHelpers';

interface OrderDetailsDialogProps {
  order: UserIdCardOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
}

const OrderDetailsDialog: React.FC<OrderDetailsDialogProps> = ({
  order,
  open,
  onOpenChange,
  loading = false,
}) => {
  if (!order) return null;

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Order #{order.id}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-6 w-28" />
            </div>

            <Separator />

            <div className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Skeleton className="h-4 w-40" />
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const daysUntilExpiry = getDaysUntilExpiry(order.cardExpiryDate);
  const expiringSoon = isExpiringSoon(order.cardExpiryDate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Order #{order.id}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge className={orderStatusColors[order.orderStatus]}>
              Order: {orderStatusLabels[order.orderStatus]}
            </Badge>
            <Badge className={cardStatusColors[order.status]}>
              Card: {cardStatusLabels[order.status]}
            </Badge>
            {order.payment && (
              <Badge className={paymentStatusColors[order.payment.paymentStatus]}>
                Payment: {paymentStatusLabels[order.payment.paymentStatus]}
              </Badge>
            )}
          </div>

          <Separator />

          {/* Card Details */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase">Card Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Card Name</p>
                <p className="font-medium">{order.card?.cardName || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Card Type</p>
                <Badge variant="outline">{order.cardType}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Price</p>
                <p className="font-semibold text-primary">
                  {order.card ? formatPrice(order.card.price) : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Validity</p>
                <p className="font-medium">
                  {order.card ? `${Math.floor(order.card.validityDays / 365)} year(s)` : '-'}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Order Information */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase">Order Information</h4>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Order Date</p>
                  <p className="font-medium">{formatDateTime(order.orderDate)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Card Expiry</p>
                  <p className={`font-medium ${expiringSoon ? 'text-orange-500' : ''}`}>
                    {formatDate(order.cardExpiryDate)}
                    {daysUntilExpiry > 0 && (
                      <span className="text-sm text-muted-foreground ml-2">
                        ({daysUntilExpiry} days remaining)
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Delivery Address</p>
                  <p className="font-medium">{order.deliveryAddress}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Contact Phone</p>
                  <p className="font-medium">{order.contactPhone}</p>
                </div>
              </div>
              {order.notes && (
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="font-medium">{order.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tracking & RFID (if available) */}
          {(order.trackingNumber || order.rfidNumber) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase">Tracking & Card ID</h4>
                <div className="grid grid-cols-2 gap-4">
                  {order.trackingNumber && (
                    <div className="flex items-start gap-2">
                      <Truck className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Tracking Number</p>
                        <p className="font-mono font-medium">{order.trackingNumber}</p>
                      </div>
                    </div>
                  )}
                  {order.rfidNumber && (
                    <div className="flex items-start gap-2">
                      <Wifi className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">RFID Number</p>
                        <p className="font-mono font-medium">{order.rfidNumber}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Payment Details (if available) */}
          {order.payment && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase">Payment Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Type</p>
                    <p className="font-medium">{order.payment.paymentType.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="font-semibold text-primary">
                      {formatPrice(order.payment.paymentAmount)}
                    </p>
                  </div>
                  {order.payment.paymentReference && (
                    <div>
                      <p className="text-sm text-muted-foreground">Reference</p>
                      <p className="font-mono font-medium">{order.payment.paymentReference}</p>
                    </div>
                  )}
                  {order.payment.verifiedAt && (
                    <div>
                      <p className="text-sm text-muted-foreground">Verified At</p>
                      <p className="font-medium">{formatDateTime(order.payment.verifiedAt)}</p>
                    </div>
                  )}
                </div>
                {order.payment.rejectionReason && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800">
                      <strong>Rejection Reason:</strong> {order.payment.rejectionReason}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Rejected Order Reason */}
          {order.rejectedReason && (
            <>
              <Separator />
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">
                  <strong>Order Rejected:</strong> {order.rejectedReason}
                </p>
              </div>
            </>
          )}

          {/* Delivery Info */}
          {order.deliveredAt && (
            <>
              <Separator />
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">
                  <strong>Delivered:</strong> {formatDateTime(order.deliveredAt)}
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailsDialog;
