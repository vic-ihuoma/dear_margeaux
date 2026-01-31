/**
 * Order Status Update Email Template
 *
 * Sent to customers when their order status changes.
 * Supports various statuses: processing, delivered, etc.
 */

import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

export type OrderStatus = 'processing' | 'delivered';

export interface OrderStatusItem {
  /** Product title */
  title: string;
  /** Variant title (e.g., "Black / Medium") */
  variantTitle?: string;
  /** Quantity */
  quantity: number;
}

export interface OrderStatusUpdateEmailProps {
  /** Customer's name */
  customerName: string;
  /** Order number */
  orderNumber: string;
  /** New order status */
  status: OrderStatus;
  /** Items in the order */
  items?: OrderStatusItem[];
  /** Tracking number (for delivered status) */
  trackingNumber?: string;
  /** Tracking URL (for delivered status) */
  trackingUrl?: string;
  /** Order details URL */
  orderUrl?: string;
  /** Store name */
  storeName?: string;
  /** Support email */
  supportEmail?: string;
}

const statusConfig: Record<
  OrderStatus,
  {
    icon: string;
    title: string;
    message: string;
    bannerColor: string;
    headingColor: string;
  }
> = {
  processing: {
    icon: '⚙️',
    title: 'Your Order Is Being Prepared',
    message:
      "Great news! We've started preparing your order and it will be on its way soon.",
    bannerColor: '#fef3c7', // amber-100
    headingColor: '#92400e', // amber-800
  },
  delivered: {
    icon: '✅',
    title: 'Your Order Has Been Delivered',
    message:
      "Your order has arrived! We hope you love your new items. If you have any questions, we're here to help.",
    bannerColor: '#dcfce7', // green-100
    headingColor: '#166534', // green-800
  },
};

const defaultProps: OrderStatusUpdateEmailProps = {
  customerName: 'Sarah',
  orderNumber: 'DM-2026-0001',
  status: 'processing',
  items: [
    {
      title: 'Margot Tote',
      variantTitle: 'Cognac',
      quantity: 1,
    },
  ],
  orderUrl: 'https://dearmargeaux.com/account/orders/DM-2026-0001',
  storeName: 'Dear Margeaux',
  supportEmail: 'hello@dearmargeaux.com',
};

export function OrderStatusUpdateEmail({
  customerName = defaultProps.customerName,
  orderNumber = defaultProps.orderNumber,
  status = defaultProps.status,
  items = defaultProps.items,
  trackingNumber,
  trackingUrl,
  orderUrl = defaultProps.orderUrl,
  storeName = defaultProps.storeName,
  supportEmail = defaultProps.supportEmail,
}: OrderStatusUpdateEmailProps): React.ReactElement {
  const config = statusConfig[status];
  const previewText = `Order #${orderNumber} - ${config.title}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logo}>{storeName}</Text>
          </Section>

          {/* Status Banner */}
          <Section
            style={{ ...statusBanner, backgroundColor: config.bannerColor }}
          >
            <Text style={statusIcon}>{config.icon}</Text>
            <Heading style={{ ...h1, color: config.headingColor }}>
              {config.title}
            </Heading>
            <Text style={orderNumberText}>Order #{orderNumber}</Text>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Text style={text}>Hi {customerName},</Text>

            <Text style={text}>{config.message}</Text>
          </Section>

          {/* Tracking Info for delivered status */}
          {status === 'delivered' && trackingNumber && (
            <Section style={trackingBox}>
              <Text style={trackingLabel}>Tracking Number</Text>
              <Text style={trackingValue}>{trackingNumber}</Text>
              {trackingUrl && (
                <Button style={trackButton} href={trackingUrl}>
                  View Tracking Details
                </Button>
              )}
            </Section>
          )}

          <Hr style={hr} />

          {/* Order Items */}
          {items && items.length > 0 && (
            <>
              <Section style={content}>
                <Heading as="h2" style={h2}>
                  Order Items
                </Heading>

                {items.map((item, index) => (
                  <Row key={index} style={itemRow}>
                    <Column style={itemDetailsColumn}>
                      <Text style={itemTitle}>{item.title}</Text>
                      {item.variantTitle && (
                        <Text style={itemVariant}>{item.variantTitle}</Text>
                      )}
                      <Text style={itemQuantity}>Qty: {item.quantity}</Text>
                    </Column>
                  </Row>
                ))}
              </Section>

              <Hr style={hr} />
            </>
          )}

          {/* What's Next Section */}
          <Section style={content}>
            <Heading as="h2" style={h2}>
              What&apos;s Next?
            </Heading>
            {status === 'processing' && (
              <>
                <Text style={tipText}>
                  <strong>📦 Packing:</strong> Our team is carefully preparing
                  your items.
                </Text>
                <Text style={tipText}>
                  <strong>📧 Updates:</strong> You&apos;ll receive an email when
                  your order ships.
                </Text>
                <Text style={tipText}>
                  <strong>📍 Track:</strong> Once shipped, you&apos;ll get
                  tracking information to follow your package.
                </Text>
              </>
            )}
            {status === 'delivered' && (
              <>
                <Text style={tipText}>
                  <strong>📸 Share:</strong> We&apos;d love to see you with your
                  new items! Tag us on social media.
                </Text>
                <Text style={tipText}>
                  <strong>⭐ Review:</strong> Your feedback helps us improve.
                  Consider leaving a review!
                </Text>
                <Text style={tipText}>
                  <strong>🔄 Returns:</strong> Not quite right? Check our return
                  policy for easy exchanges.
                </Text>
              </>
            )}
          </Section>

          {orderUrl && (
            <Section style={content}>
              <Button style={secondaryButton} href={orderUrl}>
                View Order Details
              </Button>
            </Section>
          )}

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Questions about your order? Contact us at{' '}
              <Link href={`mailto:${supportEmail}`} style={link}>
                {supportEmail}
              </Link>
            </Text>
            <Text style={footerText}>{storeName} | Handcrafted with love</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#fafafa',
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '0',
  maxWidth: '600px',
  borderRadius: '8px',
  overflow: 'hidden' as const,
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
};

const header = {
  backgroundColor: '#8B4513',
  padding: '32px 40px',
  textAlign: 'center' as const,
};

const logo = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: '600',
  margin: '0',
  letterSpacing: '0.5px',
};

const statusBanner = {
  padding: '32px 40px',
  textAlign: 'center' as const,
};

const statusIcon = {
  fontSize: '48px',
  margin: '0 0 16px 0',
};

const h1 = {
  fontSize: '28px',
  fontWeight: '600',
  lineHeight: '1.3',
  margin: '0 0 8px 0',
};

const orderNumberText = {
  color: '#666666',
  fontSize: '14px',
  margin: '0',
};

const content = {
  padding: '32px 40px',
};

const text = {
  color: '#333333',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px 0',
};

const trackingBox = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  margin: '0 40px 24px 40px',
  padding: '24px',
  textAlign: 'center' as const,
};

const trackingLabel = {
  color: '#666666',
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  margin: '0 0 8px 0',
};

const trackingValue = {
  color: '#333333',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 16px 0',
};

const trackButton = {
  backgroundColor: '#16a34a',
  borderRadius: '6px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '14px',
  fontWeight: '600',
  padding: '12px 20px',
  textAlign: 'center' as const,
  textDecoration: 'none',
};

const h2 = {
  color: '#333333',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 16px 0',
};

const hr = {
  borderColor: '#e5e5e5',
  margin: '0',
};

const itemRow = {
  marginBottom: '12px',
};

const itemDetailsColumn = {
  verticalAlign: 'center' as const,
};

const itemTitle = {
  color: '#333333',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 4px 0',
};

const itemVariant = {
  color: '#666666',
  fontSize: '14px',
  margin: '0 0 4px 0',
};

const itemQuantity = {
  color: '#666666',
  fontSize: '14px',
  margin: '0',
};

const tipText = {
  color: '#333333',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0 0 12px 0',
};

const secondaryButton = {
  backgroundColor: '#ffffff',
  border: '2px solid #8B4513',
  borderRadius: '6px',
  color: '#8B4513',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: '600',
  padding: '12px 24px',
  textAlign: 'center' as const,
  textDecoration: 'none',
};

const footer = {
  padding: '24px 40px',
  backgroundColor: '#fafafa',
};

const footerText = {
  color: '#666666',
  fontSize: '12px',
  lineHeight: '1.5',
  margin: '0 0 8px 0',
  textAlign: 'center' as const,
};

const link = {
  color: '#8B4513',
  textDecoration: 'underline',
};

export default OrderStatusUpdateEmail;
