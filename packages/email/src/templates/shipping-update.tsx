/**
 * Shipping Update Email Template
 *
 * Sent to customers when their order is shipped.
 * Includes tracking information and estimated delivery.
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
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

export interface ShippingItem {
  /** Product title */
  title: string;
  /** Variant title (e.g., "Black / Medium") */
  variantTitle?: string;
  /** Quantity shipped */
  quantity: number;
  /** Product image URL (optional) */
  imageUrl?: string;
}

export interface ShippingUpdateEmailProps {
  /** Customer's name */
  customerName: string;
  /** Order number */
  orderNumber: string;
  /** Items being shipped */
  items: ShippingItem[];
  /** Tracking number */
  trackingNumber: string;
  /** Tracking URL */
  trackingUrl?: string;
  /** Carrier name (e.g., "UPS", "USPS", "FedEx") */
  carrier?: string;
  /** Estimated delivery date (formatted string) */
  estimatedDelivery?: string;
  /** Shipping address (multiline string) */
  shippingAddress?: string;
  /** Order details URL (optional) */
  orderUrl?: string;
  /** Store name */
  storeName?: string;
  /** Support email */
  supportEmail?: string;
}

const defaultProps: ShippingUpdateEmailProps = {
  customerName: 'Sarah',
  orderNumber: 'DM-2026-0001',
  items: [
    {
      title: 'Margot Tote',
      variantTitle: 'Cognac',
      quantity: 1,
      imageUrl: '',
    },
    {
      title: 'Mini Crossbody',
      variantTitle: 'Black',
      quantity: 2,
      imageUrl: '',
    },
  ],
  trackingNumber: '1Z999AA10123456784',
  trackingUrl: 'https://www.ups.com/track?tracknum=1Z999AA10123456784',
  carrier: 'UPS',
  estimatedDelivery: 'Friday, January 24, 2026',
  shippingAddress: '123 Main St\nApt 4B\nNew York, NY 10001\nUnited States',
  orderUrl: 'https://dearmargeaux.com/account/orders/DM-2026-0001',
  storeName: 'Dear Margeaux',
  supportEmail: 'hello@dearmargeaux.com',
};

export function ShippingUpdateEmail({
  customerName = defaultProps.customerName,
  orderNumber = defaultProps.orderNumber,
  items = defaultProps.items,
  trackingNumber = defaultProps.trackingNumber,
  trackingUrl = defaultProps.trackingUrl,
  carrier = defaultProps.carrier,
  estimatedDelivery = defaultProps.estimatedDelivery,
  shippingAddress = defaultProps.shippingAddress,
  orderUrl = defaultProps.orderUrl,
  storeName = defaultProps.storeName,
  supportEmail = defaultProps.supportEmail,
}: ShippingUpdateEmailProps): React.ReactElement {
  const previewText = `Good news! Your order #${orderNumber} is on its way.`;

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

          {/* Shipping Banner */}
          <Section style={shippingBanner}>
            <Text style={packageIcon}>&#128230;</Text>
            <Heading style={h1}>Your Order Is On Its Way!</Heading>
            <Text style={orderNumberText}>Order #{orderNumber}</Text>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Text style={text}>Hi {customerName},</Text>

            <Text style={text}>
              Great news! Your order has shipped and is on its way to you. Here
              are your tracking details:
            </Text>
          </Section>

          {/* Tracking Info Box */}
          <Section style={trackingBox}>
            {carrier && (
              <Text style={carrierText}>
                <strong>Carrier:</strong> {carrier}
              </Text>
            )}
            <Text style={trackingNumberText}>
              <strong>Tracking Number:</strong> {trackingNumber}
            </Text>
            {estimatedDelivery && (
              <Text style={deliveryText}>
                <strong>Estimated Delivery:</strong> {estimatedDelivery}
              </Text>
            )}
            {trackingUrl && (
              <Button style={trackButton} href={trackingUrl}>
                Track Your Package
              </Button>
            )}
          </Section>

          <Hr style={hr} />

          {/* Items Shipped */}
          <Section style={content}>
            <Heading as="h2" style={h2}>
              Items Shipped
            </Heading>

            {items.map((item, index) => (
              <Row key={index} style={itemRow}>
                <Column style={itemImageColumn}>
                  {item.imageUrl ? (
                    <Img
                      src={item.imageUrl}
                      width="60"
                      height="60"
                      alt={item.title}
                      style={itemImage}
                    />
                  ) : (
                    <div style={imagePlaceholder} />
                  )}
                </Column>
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

          {/* Shipping Address */}
          {shippingAddress && (
            <>
              <Section style={content}>
                <Heading as="h2" style={h2}>
                  Shipping To
                </Heading>
                <Text style={addressText}>
                  {shippingAddress.split('\n').map((line, i) => (
                    <React.Fragment key={i}>
                      {line}
                      {i < shippingAddress.split('\n').length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </Text>
              </Section>

              <Hr style={hr} />
            </>
          )}

          {/* Tips Section */}
          <Section style={content}>
            <Heading as="h2" style={h2}>
              Delivery Tips
            </Heading>
            <Text style={tipText}>
              <strong>&#128681; Track often:</strong> Delivery estimates can
              change. Check your tracking link for real-time updates.
            </Text>
            <Text style={tipText}>
              <strong>&#127968; Not home?</strong> Consider leaving delivery
              instructions or scheduling a redelivery.
            </Text>
            <Text style={tipText}>
              <strong>&#128230; Check your package:</strong> Inspect your items
              upon arrival and contact us if anything seems off.
            </Text>
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
              Questions about your shipment? Contact us at{' '}
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

const shippingBanner = {
  backgroundColor: '#eff6ff',
  padding: '32px 40px',
  textAlign: 'center' as const,
};

const packageIcon = {
  fontSize: '48px',
  margin: '0 0 16px 0',
};

const h1 = {
  color: '#1d4ed8',
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

const carrierText = {
  color: '#333333',
  fontSize: '14px',
  margin: '0 0 8px 0',
};

const trackingNumberText = {
  color: '#333333',
  fontSize: '14px',
  margin: '0 0 8px 0',
};

const deliveryText = {
  color: '#16a34a',
  fontSize: '14px',
  fontWeight: '500',
  margin: '0 0 16px 0',
};

const trackButton = {
  backgroundColor: '#1d4ed8',
  borderRadius: '6px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: '600',
  padding: '14px 24px',
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
  marginBottom: '16px',
};

const itemImageColumn = {
  width: '60px',
  verticalAlign: 'top' as const,
};

const itemImage = {
  borderRadius: '4px',
  objectFit: 'cover' as const,
};

const imagePlaceholder = {
  width: '60px',
  height: '60px',
  backgroundColor: '#f5f5f5',
  borderRadius: '4px',
};

const itemDetailsColumn = {
  paddingLeft: '16px',
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

const addressText = {
  color: '#333333',
  fontSize: '14px',
  lineHeight: '1.6',
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

export default ShippingUpdateEmail;
