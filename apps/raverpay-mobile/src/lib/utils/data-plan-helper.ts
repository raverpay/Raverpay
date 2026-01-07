// lib/utils/data-plan-helper.ts

export type PlanCategory =
  | 'All Plans'
  | 'Daily'
  | 'Weekly'
  | 'Monthly'
  | 'Yearly'
  | 'Special'
  | 'Social Media'
  | 'Video Streaming';

export interface CategorizedPlans {
  'All Plans': any[];
  Daily: any[];
  Weekly: any[];
  Monthly: any[];
  Yearly: any[];
  Special: any[];
  'Social Media': any[];
  'Video Streaming': any[];
}

/**
 * Categorize a data plan based on its name
 */
export function categorizePlan(planName: string): PlanCategory {
  const nameLower = planName.toLowerCase();

  // Social Media plans (Instagram, WhatsApp, TikTok, Telegram, etc.)
  if (/instagram|whatsapp|telegram|tiktok|snapchat|facebook|twitter|social/i.test(nameLower)) {
    return 'Social Media';
  }

  // Video Streaming plans (YouTube, Netflix, GloTV, etc.)
  if (/youtube|netflix|tv|video|streaming/i.test(nameLower)) {
    return 'Video Streaming';
  }

  // Special/Promotional plans (Special, Weekend, WTF, Opera, etc.)
  if (/special|weekend|wtf|opera|promo|myg|xtratalk|xtradata/i.test(nameLower)) {
    return 'Special';
  }

  // Extract duration from parentheses (e.g., "(1 Day)", "(7 Days)", "(30 Days)")
  const durationMatch = nameLower.match(/\((\d+)\s*day/i);
  if (durationMatch) {
    const days = parseInt(durationMatch[1]);
    if (days <= 4) return 'Daily';
    if (days <= 14) return 'Weekly';
    if (days <= 60) return 'Monthly';
    return 'Yearly';
  }

  // Yearly/Long-term plans (year, multiple months, 60+ days)
  if (
    /year|(90|120|180|240|300|360)[\s-]*day|(2|3|4|5|6|7|8|9|10|11|12)[\s-]*(month)/i.test(
      nameLower,
    )
  ) {
    return 'Yearly';
  }

  // Monthly plans - check keyword first, then duration
  if (/monthly\s+plan/i.test(nameLower)) {
    return 'Monthly';
  }
  if (/(30|31|60)[\s-]*day|(1\s*month)/i.test(nameLower)) {
    return 'Monthly';
  }

  // Weekly plans - check keyword first, then duration
  if (/weekly\s+plan/i.test(nameLower)) {
    return 'Weekly';
  }
  if (/((5|6|7|8|9|10|11|12|13|14)[\s-]*day)|week/i.test(nameLower)) {
    return 'Weekly';
  }

  // Daily plans - check keyword first, then duration
  if (/daily\s+plan/i.test(nameLower)) {
    return 'Daily';
  }
  if (/((1|2|3|4)[\s-]*day)|(\d+\s*(hr|hrs|hour))|oneoff/i.test(nameLower)) {
    return 'Daily';
  }

  // Default to Monthly for plans without clear duration
  return 'Monthly';
}

/**
 * Group data plans by category
 */
export function categorizePlans(plans: any[]): CategorizedPlans {
  const categorized: CategorizedPlans = {
    'All Plans': [],
    Daily: [],
    Weekly: [],
    Monthly: [],
    Yearly: [],
    Special: [],
    'Social Media': [],
    'Video Streaming': [],
  };

  // Add all plans to "All Plans" category
  categorized['All Plans'] = [...plans];

  // Categorize each plan
  plans.forEach((plan) => {
    if (!plan || !plan.name) return;

    const category = categorizePlan(plan.name);
    categorized[category].push(plan);
  });

  return categorized;
}

/**
 * Get available categories (only those with plans)
 */
export function getAvailableCategories(categorizedPlans: CategorizedPlans): PlanCategory[] {
  const allCategories: PlanCategory[] = [
    'All Plans',
    'Daily',
    'Weekly',
    'Monthly',
    'Yearly',
    'Special',
    'Social Media',
    'Video Streaming',
  ];

  return allCategories.filter((category) => categorizedPlans[category].length > 0);
}
