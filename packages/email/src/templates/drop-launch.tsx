/**
 * Drop Launch Email Template
 *
 * Sent to waitlist subscribers when a drop becomes active.
 * Announces the drop and encourages immediate action.
 */

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

export interface DropLaunchEmailProps {
  /** Subscriber's name (optional, for personalization) */
  subscriberName?: string;
  /** Name of the drop */
  dropName: string;
  /** Drop description */
  dropDescription?: string;
  /** URL to the drop page */
  dropUrl: string;
  /** Featured product image URL (optional) */
  featuredImageUrl?: string;
  /** Store name */
  storeName?: string;
  /** Unsubscribe URL */
  unsubscribeUrl?: string;
}

const defaultProps: DropLaunchEmailProps = {
  subscriberName: 'there',
  dropName: 'Summer 2026 Collection',
  dropDescription:
    'Discover our latest collection of handcrafted leather bags, designed for the modern woman.',
  dropUrl: 'https://dearmargeaux.com/shop/summer-2026',
  featuredImageUrl: '',
  storeName: 'Dear Margeaux',
  unsubscribeUrl: 'https://dearmargeaux.com/unsubscribe',
};

export function DropLaunchEmail({
  subscriberName = defaultProps.subscriberName,
  dropName = defaultProps.dropName,
  dropDescription = defaultProps.dropDescription,
  dropUrl = defaultProps.dropUrl,
  featuredImageUrl = defaultProps.featuredImageUrl,
  storeName = defaultProps.storeName,
  unsubscribeUrl = defaultProps.unsubscribeUrl,
}: DropLaunchEmailProps): React.ReactElement {
  const previewText = `${dropName} is now live! Shop the collection before it sells out.`;

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

          {/* Featured Image */}
          {featuredImageUrl && (
            <Section style={imageSection}>
              <Img
                src={featuredImageUrl}
                width="100%"
                height="auto"
                alt={dropName}
                style={heroImage}
              />
            </Section>
          )}

          {/* Main Content */}
          <Section style={content}>
            <Heading style={h1}>The Wait Is Over</Heading>

            <Text style={text}>Hi {subscriberName},</Text>

            <Text style={text}>
              You asked us to let you know when <strong>{dropName}</strong> goes
              live. Well, the moment is here!
            </Text>

            {dropDescription && <Text style={text}>{dropDescription}</Text>}

            <Text style={text}>
              As a waitlist member, you get first access. But with limited
              quantities available, we recommend shopping soon.
            </Text>

            <Button style={button} href={dropUrl}>
              Shop {dropName}
            </Button>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              You received this email because you signed up for the {dropName}{' '}
              waitlist.
            </Text>
            {unsubscribeUrl && (
              <Text style={footerText}>
                <Link href={unsubscribeUrl} style={link}>
                  Unsubscribe
                </Link>{' '}
                from future notifications
              </Text>
            )}
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

const imageSection = {
  padding: '0',
};

const heroImage = {
  display: 'block',
  width: '100%',
  height: 'auto',
};

const content = {
  padding: '40px',
};

const h1 = {
  color: '#333333',
  fontSize: '28px',
  fontWeight: '600',
  lineHeight: '1.3',
  margin: '0 0 24px 0',
  textAlign: 'center' as const,
};

const text = {
  color: '#333333',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px 0',
};

const button = {
  backgroundColor: '#E2725B',
  borderRadius: '6px',
  color: '#ffffff',
  display: 'block',
  fontSize: '16px',
  fontWeight: '600',
  padding: '14px 24px',
  textAlign: 'center' as const,
  textDecoration: 'none',
  marginTop: '24px',
  marginBottom: '8px',
};

const hr = {
  borderColor: '#e5e5e5',
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

export default DropLaunchEmail;
