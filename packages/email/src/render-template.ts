/**
 * Email Template Rendering Utilities
 *
 * Provides functions to render React Email templates to HTML strings
 * for sending via AWS SES.
 */

import * as React from 'react';
import { render } from '@react-email/render';

/**
 * Result of rendering an email template
 */
export interface RenderResult {
  /** HTML version of the email */
  html: string;
  /** Plain text version of the email */
  text: string;
}

/**
 * Renders a React Email component to HTML and plain text
 *
 * @param element - React element to render
 * @returns Object containing HTML and plain text versions
 *
 * @example
 * import { DropLaunchEmail } from './templates/drop-launch';
 *
 * const { html, text } = await renderEmailTemplate(
 *   React.createElement(DropLaunchEmail, {
 *     dropName: 'Summer 2026',
 *     dropUrl: 'https://example.com/shop/summer-2026',
 *   })
 * );
 */
export async function renderEmailTemplate(
  element: React.ReactElement
): Promise<RenderResult> {
  // Render to HTML
  const html = await render(element, {
    pretty: false, // Minified for production
  });

  // Render to plain text
  const text = await render(element, {
    plainText: true,
  });

  return { html, text };
}

/**
 * Renders a React Email component to HTML only
 *
 * @param element - React element to render
 * @returns HTML string
 */
export async function renderToHtml(
  element: React.ReactElement
): Promise<string> {
  return render(element, {
    pretty: false,
  });
}

/**
 * Renders a React Email component to plain text only
 *
 * @param element - React element to render
 * @returns Plain text string
 */
export async function renderToText(
  element: React.ReactElement
): Promise<string> {
  return render(element, {
    plainText: true,
  });
}
