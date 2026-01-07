#!/usr/bin/env node

/**
 * Sentry Alert Rules Setup Script
 *
 * This script automatically creates alert rules in Sentry via their API.
 * It creates all 5 recommended alert rules for the Raverpay Mobile app.
 *
 * Usage:
 *   node scripts/setup-sentry-alerts.js
 *
 * Requirements:
 *   - SENTRY_AUTH_TOKEN in .env file
 *   - SENTRY_ORG in .env file
 *   - SENTRY_PROJECT in .env file
 */

require("dotenv").config();

const SENTRY_API_BASE = "https://sentry.io/api/0";
const AUTH_TOKEN = process.env.SENTRY_AUTH_TOKEN;
const ORG_SLUG = process.env.SENTRY_ORG;
const PROJECT_SLUG = process.env.SENTRY_PROJECT;

// Your email for notifications - UPDATE THIS
const ALERT_EMAIL = "raverpay.com"; // TODO: Update with your actual email

// Validate environment variables
if (!AUTH_TOKEN || !ORG_SLUG || !PROJECT_SLUG) {
  console.error("❌ Error: Missing required environment variables");
  console.error(
    "Please ensure SENTRY_AUTH_TOKEN, SENTRY_ORG, and SENTRY_PROJECT are set in .env file"
  );
  process.exit(1);
}

/**
 * Make a request to Sentry API
 */
async function sentryRequest(endpoint, method = "GET", body = null) {
  const url = `${SENTRY_API_BASE}${endpoint}`;

  const options = {
    method,
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      "Content-Type": "application/json",
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        `API Error: ${response.status} - ${JSON.stringify(data)}`
      );
    }

    return data;
  } catch (error) {
    console.error(`Request failed: ${error.message}`);
    throw error;
  }
}

/**
 * Create an alert rule in Sentry
 */
async function createAlertRule(ruleConfig) {
  const endpoint = `/projects/${ORG_SLUG}/${PROJECT_SLUG}/rules/`;

  try {
    const result = await sentryRequest(endpoint, "POST", ruleConfig);
    console.log(`✅ Created alert: "${ruleConfig.name}"`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to create alert: "${ruleConfig.name}"`);
    console.error(`   Error: ${error.message}`);
    return null;
  }
}

/**
 * Delete existing alert rules (optional cleanup)
 */
async function deleteExistingRules() {
  const endpoint = `/projects/${ORG_SLUG}/${PROJECT_SLUG}/rules/`;

  try {
    const rules = await sentryRequest(endpoint);
    console.log(`\n🗑️  Found ${rules.length} existing rules`);

    for (const rule of rules) {
      try {
        await sentryRequest(`${endpoint}${rule.id}/`, "DELETE");
        console.log(`   Deleted: "${rule.name}"`);
      } catch (error) {
        console.error(`   Failed to delete: "${rule.name}"`);
      }
    }
  } catch (error) {
    console.error("Failed to fetch existing rules:", error.message);
  }
}

// Alert Rule Configurations
const alertRules = [
  // Alert 1: Payment Failures
  {
    name: "Payment Failures Alert",
    actionMatch: "any",
    filterMatch: "all",
    frequency: 5, // minutes
    conditions: [
      {
        id: "sentry.rules.conditions.event_attribute.EventAttributeCondition",
        attribute: "message",
        match: "co", // contains
        value: "payment",
      },
    ],
    actions: [
      {
        id: "sentry.mail.actions.NotifyEmailAction",
        targetType: "IssueOwners",
        targetIdentifier: "",
      },
    ],
  },

  // Alert 2: Circle Wallet Errors
  {
    name: "Circle Wallet Errors",
    actionMatch: "all",
    filterMatch: "all",
    frequency: 10, // minutes
    conditions: [
      {
        id: "sentry.rules.conditions.tagged_event.TaggedEventCondition",
        key: "circle_operation",
        match: "is",
        value: "",
      },
      {
        id: "sentry.rules.conditions.tagged_event.TaggedEventCondition",
        key: "circle.success",
        match: "eq", // equals
        value: "false",
      },
    ],
    actions: [
      {
        id: "sentry.mail.actions.NotifyEmailAction",
        targetType: "IssueOwners",
        targetIdentifier: "",
      },
    ],
  },

  // Alert 3: Authentication Loops
  {
    name: "Authentication Loops",
    actionMatch: "any",
    filterMatch: "all",
    frequency: 5, // minutes
    conditions: [
      {
        id: "sentry.rules.conditions.event_attribute.EventAttributeCondition",
        attribute: "message",
        match: "co",
        value: "token expired",
      },
      {
        id: "sentry.rules.conditions.event_attribute.EventAttributeCondition",
        attribute: "message",
        match: "co",
        value: "session expired",
      },
    ],
    actions: [
      {
        id: "sentry.mail.actions.NotifyEmailAction",
        targetType: "IssueOwners",
        targetIdentifier: "",
      },
    ],
  },

  // Alert 4: High Error Rate (Note: This requires metric alerts, which have a different API)
  {
    name: "High Error Rate Alert",
    actionMatch: "any",
    filterMatch: "all",
    frequency: 10, // minutes
    conditions: [
      {
        id: "sentry.rules.conditions.event_frequency.EventFrequencyCondition",
        interval: "5m",
        value: 100, // More than 100 events in 5 minutes
      },
    ],
    actions: [
      {
        id: "sentry.mail.actions.NotifyEmailAction",
        targetType: "IssueOwners",
        targetIdentifier: "",
      },
    ],
  },

  // Alert 5: VTU Provider Failures
  {
    name: "VTU Provider Failures",
    actionMatch: "all",
    filterMatch: "all",
    frequency: 15, // minutes
    conditions: [
      {
        id: "sentry.rules.conditions.tagged_event.TaggedEventCondition",
        key: "vtu_operation",
        match: "is",
        value: "",
      },
      {
        id: "sentry.rules.conditions.tagged_event.TaggedEventCondition",
        key: "vtu.success",
        match: "eq",
        value: "false",
      },
    ],
    actions: [
      {
        id: "sentry.mail.actions.NotifyEmailAction",
        targetType: "IssueOwners",
        targetIdentifier: "",
      },
    ],
  },
];

/**
 * Main execution
 */
async function main() {
  console.log("🚀 Sentry Alert Rules Setup");
  console.log("================================");
  console.log(`Organization: ${ORG_SLUG}`);
  console.log(`Project: ${PROJECT_SLUG}`);
  console.log("");

  // Optional: Uncomment to delete existing rules first
  // await deleteExistingRules();
  // console.log('');

  console.log("📋 Creating alert rules...\n");

  let successCount = 0;
  let failCount = 0;

  for (const rule of alertRules) {
    const result = await createAlertRule(rule);
    if (result) {
      successCount++;
    } else {
      failCount++;
    }
    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log("\n================================");
  console.log(`✅ Successfully created: ${successCount} alert rules`);
  if (failCount > 0) {
    console.log(`❌ Failed to create: ${failCount} alert rules`);
  }
  console.log("\n💡 Next steps:");
  console.log(
    "   1. Visit https://sentry.io/organizations/raverpay/alerts/rules/"
  );
  console.log("   2. Review and customize alert settings");
  console.log("   3. Add Slack/PagerDuty integrations if needed");
  console.log("   4. Test alerts by triggering errors in dev mode");
}

// Run the script
main().catch((error) => {
  console.error("\n❌ Script failed:", error.message);
  process.exit(1);
});
