import { User } from "@shared/schema";

export interface PaywallResponse {
  isPreview: boolean;
  hasAccess: boolean;
  previewContent?: string;
  fullContent: string;
  previewPercent: number;
  lockMessage: string;
  headers: Record<string, string>;
}

export interface PaywallOptions {
  userId: string | undefined;
  user: User | null;
  fullContent: string;
  estimatedTokens: number;
  endpoint: string;
}

/**
 * CENTRALIZED PAYWALL LOGIC
 * 
 * This module enforces identical preview/paywall behavior across ALL endpoints.
 * CRITICAL: Both /api/process-text and /api/process-text/stream MUST use this.
 * 
 * FAIL-CLOSED DESIGN: When in doubt, serve preview only, never full content.
 */
export class FreemiumPaywall {
  
  /**
   * Determines access level and generates appropriate response
   * FAIL-CLOSED: Any error/uncertainty results in preview-only access
   */
  static processContent(options: PaywallOptions): PaywallResponse {
    const { userId, user, fullContent, estimatedTokens, endpoint } = options;
    
    // FAIL-CLOSED: No user ID = preview only
    if (!userId || !user) {
      console.log(`PAYWALL: No user/userId - forcing preview [endpoint: ${endpoint}]`);
      return this.generatePreview(fullContent, 0, endpoint, "No user authentication");
    }
    
    // FAIL-CLOSED: Can't determine token balance = preview only  
    const tokenBalance = user.tokenBalance ?? 0;
    if (tokenBalance === null || tokenBalance === undefined) {
      console.log(`PAYWALL: Null/undefined token balance - forcing preview [userId: ${userId}, endpoint: ${endpoint}]`);
      return this.generatePreview(fullContent, tokenBalance, endpoint, "Token balance unavailable");
    }
    
    // Calculate estimated cost (simplified - adjust based on your pricing model)
    const estimatedCost = Math.ceil(estimatedTokens * 0.001); // Rough estimate
    
    // FAIL-CLOSED: Insufficient credits = preview only
    if (tokenBalance < estimatedCost) {
      console.log(`PAYWALL: Insufficient credits (${tokenBalance} < ${estimatedCost}) - forcing preview [userId: ${userId}, endpoint: ${endpoint}]`);
      return this.generatePreview(fullContent, tokenBalance, endpoint, `Insufficient credits (need ${estimatedCost}, have ${tokenBalance})`);
    }
    
    // User has sufficient credits - grant full access
    console.log(`PAYWALL: Full access granted [userId: ${userId}, balance: ${tokenBalance}, cost: ${estimatedCost}, endpoint: ${endpoint}]`);
    return {
      isPreview: false,
      hasAccess: true,
      fullContent,
      previewPercent: 100,
      lockMessage: "",
      headers: {
        'X-Preview': 'false',
        'X-Preview-Percent': '100',
        'X-Access-Level': 'full'
      }
    };
  }
  
  /**
   * Generates consistent preview response (30-50% of content)
   * ALWAYS includes lock message and preview headers
   */
  private static generatePreview(fullContent: string, tokenBalance: number, endpoint: string, reason: string): PaywallResponse {
    // Target 30% preview (can adjust between 30-50% as needed)
    const previewPercent = 30;
    const targetLength = Math.ceil(fullContent.length * (previewPercent / 100));
    
    // Find a natural break point near the target length
    let cutoffIndex = targetLength;
    
    // Try to cut at sentence boundary
    const sentenceEnd = fullContent.lastIndexOf('.', targetLength + 100);
    const questionEnd = fullContent.lastIndexOf('?', targetLength + 100);  
    const exclamationEnd = fullContent.lastIndexOf('!', targetLength + 100);
    
    const naturalBreak = Math.max(sentenceEnd, questionEnd, exclamationEnd);
    if (naturalBreak > targetLength - 100 && naturalBreak < fullContent.length - 50) {
      cutoffIndex = naturalBreak + 1;
    }
    
    // Fallback: cut at word boundary
    if (cutoffIndex >= fullContent.length - 10) {
      const lastSpace = fullContent.lastIndexOf(' ', targetLength);
      if (lastSpace > targetLength - 50) {
        cutoffIndex = lastSpace;
      }
    }
    
    const previewContent = fullContent.substring(0, cutoffIndex).trim();
    const lockMessage = "\n\n🔒 **Complete solution available with credits.** Upgrade to see the full answer, detailed explanations, and step-by-step solutions.";
    
    // AUDIT LOG
    console.log(`PAYWALL AUDIT: userId=${tokenBalance > 0 ? 'authenticated' : 'anonymous'}, endpoint=${endpoint}, isPreview=true, percent=${previewPercent}, originalBytes=${fullContent.length}, sentBytes=${previewContent.length + lockMessage.length}, reason=${reason}`);
    
    return {
      isPreview: true,
      hasAccess: false,
      previewContent: previewContent + lockMessage,
      fullContent,
      previewPercent,
      lockMessage,
      headers: {
        'X-Preview': 'true',
        'X-Preview-Percent': previewPercent.toString(),
        'X-Access-Level': 'preview',
        'X-Lock-Reason': reason
      }
    };
  }
  
  /**
   * Get content to store in database
   * CRITICAL: Previews store preview content, full access stores full content
   */
  static getStorageContent(paywallResponse: PaywallResponse): string {
    if (paywallResponse.isPreview) {
      // Store only the preview content (without lock message for database)
      return paywallResponse.previewContent?.replace(/\n\n🔒.*$/, '').trim() || '';
    }
    return paywallResponse.fullContent;
  }
  
  /**
   * Get content to send to user (for streaming or direct response)
   */
  static getUserContent(paywallResponse: PaywallResponse): string {
    if (paywallResponse.isPreview) {
      return paywallResponse.previewContent || '';
    }
    return paywallResponse.fullContent;
  }
}