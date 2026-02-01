/**
 * Order Confirmation Email Template
 *
 * Sent to customers after a successful purchase.
 * Confirms order details and provides next steps.
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

export interface OrderItem {
  /** Product title */
  title: string;
  /** Variant title (e.g., "Black / Medium") */
  variantTitle?: string;
  /** Quantity ordered */
  quantity: number;
  /** Unit price in cents */
  unitPrice: number;
  /** Product image URL (optional) */
  imageUrl?: string;
}

export interface OrderConfirmationEmailProps {
  /** Customer's name */
  customerName: string;
  /** Customer's email */
  customerEmail: string;
  /** Order number */
  orderNumber: string;
  /** Order items */
  items: OrderItem[];
  /** Subtotal in cents */
  subtotal: number;
  /** Shipping cost in cents */
  shipping: number;
  /** Tax amount in cents */
  tax: number;
  /** Discount amount in cents (optional) */
  discount?: number;
  /** Total amount in cents */
  total: number;
  /** Shipping address (multiline string) */
  shippingAddress?: string;
  /** Order tracking URL (optional) */
  orderUrl?: string;
  /** Store name */
  storeName?: string;
  /** Support email */
  supportEmail?: string;
}

const defaultProps: OrderConfirmationEmailProps = {
  customerName: 'Sarah',
  customerEmail: 'sarah@example.com',
  orderNumber: 'DM-2026-0001',
  items: [
    {
      title: 'Margot Tote',
      variantTitle: 'Cognac',
      quantity: 1,
      unitPrice: 29500,
      imageUrl: '',
    },
    {
      title: 'Mini Crossbody',
      variantTitle: 'Black',
      quantity: 2,
      unitPrice: 18500,
      imageUrl: '',
    },
  ],
  subtotal: 66500,
  shipping: 0,
  tax: 5985,
  discount: 0,
  total: 72485,
  shippingAddress: '123 Main St\nApt 4B\nNew York, NY 10001\nUnited States',
  orderUrl: 'https://dearmargeaux.com/account/orders/DM-2026-0001',
  storeName: 'Dear Margeaux',
  supportEmail: 'hello@dearmargeaux.com',
};

/**
 * Formats cents to a currency string
 */
function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export function OrderConfirmationEmail({
  customerName = defaultProps.customerName,
  customerEmail = defaultProps.customerEmail,
  orderNumber = defaultProps.orderNumber,
  items = defaultProps.items,
  subtotal = defaultProps.subtotal,
  shipping = defaultProps.shipping,
  tax = defaultProps.tax,
  discount = defaultProps.discount,
  total = defaultProps.total,
  shippingAddress = defaultProps.shippingAddress,
  orderUrl = defaultProps.orderUrl,
  storeName = defaultProps.storeName,
  supportEmail = defaultProps.supportEmail,
}: OrderConfirmationEmailProps): React.ReactElement {
  const previewText = `Thanks for your order, ${customerName}! Order #${orderNumber} confirmed.`;

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

          {/* Confirmation Banner */}
          <Section style={confirmationBanner}>
            <Text style={checkmark}>&#10003;</Text>
            <Heading style={h1}>Order Confirmed</Heading>
            <Text style={orderNumberText}>Order #{orderNumber}</Text>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Text style={text}>Hi {customerName},</Text>

            <Text style={text}>
              Thank you for your order! We&apos;re getting it ready and will let
              you know when it ships. A confirmation has also been sent to{' '}
              {customerEmail}.
            </Text>

            {orderUrl && (
              <Button style={button} href={orderUrl}>
                View Order Details
              </Button>
            )}
          </Section>

          <Hr style={hr} />

          {/* Order Items */}
          <Section style={content}>
            <Heading as="h2" style={h2}>
              Order Summary
            </Heading>

            {items.map((item, index) => (
              <Row key={index} style={itemRow}>
                <Column style={itemImageColumn}>
                  {item.imageUrl ? (
                    <Img
                      src={item.imageUrl}
                      width="80"
                      height="80"
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
                <Column style={itemPriceColumn}>
                  <Text style={itemPrice}>
                    {formatPrice(item.unitPrice * item.quantity)}
                  </Text>
                </Column>
              </Row>
            ))}
          </Section>

          <Hr style={hr} />

          {/* Order Totals */}
          <Section style={totalsSection}>
            <Row style={totalRow}>
              <Column style={totalLabelColumn}>
                <Text style={totalLabel}>Subtotal</Text>
              </Column>
              <Column style={totalValueColumn}>
                <Text style={totalValue}>{formatPrice(subtotal)}</Text>
              </Column>
            </Row>

            {discount !== undefined && discount > 0 && (
              <Row style={totalRow}>
                <Column style={totalLabelColumn}>
                  <Text style={discountLabel}>Discount</Text>
                </Column>
                <Column style={totalValueColumn}>
                  <Text style={discountValue}>-{formatPrice(discount)}</Text>
                </Column>
              </Row>
            )}

            <Row style={totalRow}>
              <Column style={totalLabelColumn}>
                <Text style={totalLabel}>Shipping</Text>
              </Column>
              <Column style={totalValueColumn}>
                <Text style={totalValue}>
                  {shipping === 0 ? 'Free' : formatPrice(shipping)}
                </Text>
              </Column>
            </Row>

            <Row style={totalRow}>
              <Column style={totalLabelColumn}>
                <Text style={totalLabel}>Tax</Text>
              </Column>
              <Column style={totalValueColumn}>
                <Text style={totalValue}>{formatPrice(tax)}</Text>
              </Column>
            </Row>

            <Hr style={hrLight} />

            <Row style={totalRow}>
              <Column style={totalLabelColumn}>
                <Text style={grandTotalLabel}>Total</Text>
              </Column>
              <Column style={totalValueColumn}>
                <Text style={grandTotalValue}>{formatPrice(total)}</Text>
              </Column>
            </Row>
          </Section>

          <Hr style={hr} />

          {/* Shipping Address */}
          {shippingAddress && (
            <Section style={content}>
              <Heading as="h2" style={h2}>
                Shipping Address
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
          )}

          <Hr style={hr} />

          {/* What's Next */}
          <Section style={content}>
            <Heading as="h2" style={h2}>
              What&apos;s Next?
            </Heading>
            <Text style={text}>
              1. <strong>Order Processing:</strong> We&apos;re carefully
              preparing your order.
            </Text>
            <Text style={text}>
              2. <strong>Shipping:</strong> You&apos;ll receive an email with
              tracking info once shipped.
            </Text>
            <Text style={text}>
              3. <strong>Delivery:</strong> Your order will arrive at your
              doorstep soon!
            </Text>
          </Section>

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

const confirmationBanner = {
  backgroundColor: '#f0fdf4',
  padding: '32px 40px',
  textAlign: 'center' as const,
};

const checkmark = {
  color: '#16a34a',
  fontSize: '48px',
  margin: '0 0 16px 0',
};

const h1 = {
  color: '#16a34a',
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

const button = {
  backgroundColor: '#8B4513',
  borderRadius: '6px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: '600',
  padding: '14px 24px',
  textAlign: 'center' as const,
  textDecoration: 'none',
  marginTop: '8px',
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

const hrLight = {
  borderColor: '#f0f0f0',
  margin: '12px 0',
};

const itemRow = {
  marginBottom: '16px',
};

const itemImageColumn = {
  width: '80px',
  verticalAlign: 'top' as const,
};

const itemImage = {
  borderRadius: '4px',
  objectFit: 'cover' as const,
};

const imagePlaceholder = {
  width: '80px',
  height: '80px',
  backgroundColor: '#f5f5f5',
  borderRadius: '4px',
};

const itemDetailsColumn = {
  paddingLeft: '16px',
  verticalAlign: 'top' as const,
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

const itemPriceColumn = {
  width: '100px',
  textAlign: 'right' as const,
  verticalAlign: 'top' as const,
};

const itemPrice = {
  color: '#333333',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0',
};

const totalsSection = {
  padding: '24px 40px',
};

const totalRow = {
  marginBottom: '8px',
};

const totalLabelColumn = {
  width: '70%',
};

const totalValueColumn = {
  width: '30%',
  textAlign: 'right' as const,
};

const totalLabel = {
  color: '#666666',
  fontSize: '14px',
  margin: '0',
};

const totalValue = {
  color: '#333333',
  fontSize: '14px',
  margin: '0',
};

const discountLabel = {
  color: '#16a34a',
  fontSize: '14px',
  margin: '0',
};

const discountValue = {
  color: '#16a34a',
  fontSize: '14px',
  margin: '0',
};

const grandTotalLabel = {
  color: '#333333',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0',
};

const grandTotalValue = {
  color: '#333333',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0',
};

const addressText = {
  color: '#333333',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0',
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

export default OrderConfirmationEmail;
