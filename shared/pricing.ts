// ZHI Provider Pricing and Descriptions Configuration

export interface PricingTier {
  price: number;
  words: number;
}

export interface LLMProvider {
  id: string;
  name: string;
  pricing: PricingTier[];
  merits: string[];
  demerits: string[];
  description: string;
}

export const LLM_PROVIDERS: Record<string, LLMProvider> = {
  anthropic: {
    id: "anthropic",
    name: "ZHI 1 (Anthropic Claude)",
    pricing: [
      { price: 5, words: 4275000 },
      { price: 10, words: 8977500 },
      { price: 25, words: 23512500 },
      { price: 50, words: 51300000 },
      { price: 100, words: 115425000 }
    ],
    merits: [
      "Fast, cheap, widely compatible",
      "Good balance of creativity + accuracy",
      "Reliable at short/medium rewrites and commercial text"
    ],
    demerits: [
      "Struggles with very dense scholarly material (drops nuance)",
      "More \"AI-detected\" feel in raw outputs (less human signal)",
      "Occasionally hallucinates stylistic quirks"
    ],
    description: "Fast and cost-effective with good balance for general academic use"
  },
  openai: {
    id: "openai",
    name: "ZHI 2 (OpenAI GPT)",
    pricing: [
      { price: 5, words: 106840 },
      { price: 10, words: 224360 },
      { price: 25, words: 587625 },
      { price: 50, words: 1282100 },
      { price: 100, words: 2883400 }
    ],
    merits: [
      "Excellent on scholarly, philosophical, and \"thinking-through\" tasks",
      "Strong at staying consistent in long rewrites",
      "More \"polished\" tone, good for academic-sounding prose"
    ],
    demerits: [
      "By far the most expensive",
      "Sometimes cautious / verbose, especially when asked for edgy or non-academic rewrites",
      "Can \"over-summarize\" instead of fully transforming"
    ],
    description: "Premium quality for complex academic and philosophical work"
  },
  deepseek: {
    id: "deepseek",
    name: "ZHI 3 (DeepSeek)",
    pricing: [
      { price: 5, words: 702000 },
      { price: 10, words: 1474200 },
      { price: 25, words: 3861000 },
      { price: 50, words: 8424000 },
      { price: 100, words: 18954000 }
    ],
    merits: [
      "Cheapest by far",
      "Handles bulk text rewriting and simple transformations well",
      "Decent logical coherence, especially for structured rewriting"
    ],
    demerits: [
      "Noticeably slower than the others",
      "Less nuanced on subtle philosophy/literature than Anthropic",
      "Output can feel mechanical if pushed beyond bulk processing"
    ],
    description: "Budget-friendly option ideal for bulk processing and simple tasks"
  },
  perplexity: {
    id: "perplexity",
    name: "ZHI 4 (Perplexity)",
    pricing: [
      { price: 5, words: 6410255 },
      { price: 10, words: 13461530 },
      { price: 25, words: 35256400 },
      { price: 50, words: 76923050 },
      { price: 100, words: 173176900 }
    ],
    merits: [
      "Very cheap for API calls (currently subsidized)",
      "Good for quick turnarounds, exploratory rewrites",
      "Sometimes surprisingly concise and pointed"
    ],
    demerits: [
      "Quality varies — can be shallow compared to Anthropic/OpenAI",
      "Weak on sustained long-form consistency",
      "Infrastructure less mature, risk of pricing changing abruptly"
    ],
    description: "Highly cost-effective but with variable quality"
  }
};

// Calculate cost per word for a provider
export function getCostPerWord(providerId: string): number {
  const provider = LLM_PROVIDERS[providerId];
  if (!provider) return 0;
  
  // Use the $100 tier for most accurate per-word pricing
  const tier = provider.pricing.find(p => p.price === 100);
  if (!tier) return 0;
  
  return tier.price / tier.words;
}

// Calculate credit cost for word count and provider
export function calculateCreditCost(providerId: string, wordCount: number): number {
  const costPerWord = getCostPerWord(providerId);
  return Math.ceil(costPerWord * wordCount * 1000); // Convert to credits (assuming 1000 credits = $1)
}

// Get words per dollar for a provider (using $100 tier)
export function getWordsPerDollar(providerId: string): number {
  const provider = LLM_PROVIDERS[providerId];
  if (!provider) return 0;
  
  const tier = provider.pricing.find(p => p.price === 100);
  if (!tier) return 0;
  
  return tier.words / tier.price;
}

// Format pricing display
export function formatPricingDisplay(provider: LLMProvider): string {
  const wordsPerDollar = getWordsPerDollar(provider.id);
  return `${wordsPerDollar.toLocaleString()} words per $1`;
}