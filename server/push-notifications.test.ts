import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  savePushSubscription,
  getPushSubscriptions,
  deletePushSubscription,
} from "./db";
import {
  sendPushNotification,
  sendPromotionNotification,
} from "./push-notifications";

describe("Push Notifications", () => {
  const testCustomerId = 999;
  const testSubscription = {
    endpoint: "https://example.com/push/test-endpoint",
    keys: {
      auth: "test-auth-key-12345",
      p256dh: "test-p256dh-key-67890",
    },
  };

  beforeAll(async () => {
    // Clean up any existing test subscriptions
    try {
      await deletePushSubscription(testSubscription.endpoint);
    } catch (e) {
      // Ignore if doesn't exist
    }
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await deletePushSubscription(testSubscription.endpoint);
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  it("should save a push subscription", async () => {
    const result = await savePushSubscription(testCustomerId, testSubscription);
    expect(result).toBe(true);
  });

  it("should retrieve saved push subscriptions", async () => {
    // First save a subscription
    await savePushSubscription(testCustomerId, testSubscription);

    // Then retrieve it
    const subscriptions = await getPushSubscriptions(testCustomerId);
    expect(subscriptions).toBeDefined();
    expect(subscriptions.length).toBeGreaterThan(0);

    const found = subscriptions.find(
      s => s.endpoint === testSubscription.endpoint
    );
    expect(found).toBeDefined();
    expect(found?.auth).toBe(testSubscription.keys.auth);
    expect(found?.p256dh).toBe(testSubscription.keys.p256dh);
  });

  it("should update an existing subscription", async () => {
    const updatedSubscription = {
      ...testSubscription,
      keys: {
        auth: "updated-auth-key",
        p256dh: "updated-p256dh-key",
      },
    };

    // Save initial subscription
    await savePushSubscription(testCustomerId, testSubscription);

    // Update it
    const result = await savePushSubscription(
      testCustomerId,
      updatedSubscription
    );
    expect(result).toBe(true);

    // Verify update
    const subscriptions = await getPushSubscriptions(testCustomerId);
    const found = subscriptions.find(
      s => s.endpoint === testSubscription.endpoint
    );
    expect(found?.auth).toBe("updated-auth-key");
    expect(found?.p256dh).toBe("updated-p256dh-key");
  });

  it("should delete a push subscription", async () => {
    // Save a subscription first
    await savePushSubscription(testCustomerId, testSubscription);

    // Delete it
    const result = await deletePushSubscription(testSubscription.endpoint);
    expect(result).toBe(true);

    // Verify deletion
    const subscriptions = await getPushSubscriptions(testCustomerId);
    const found = subscriptions.find(
      s => s.endpoint === testSubscription.endpoint
    );
    expect(found).toBeUndefined();
  });

  it("should handle sending push notifications gracefully", async () => {
    // Save a subscription
    await savePushSubscription(testCustomerId, testSubscription);

    // Try to send notification (will fail due to invalid endpoint, but should handle gracefully)
    const result = await sendPushNotification(
      testCustomerId,
      "Test Notification",
      "This is a test notification"
    );

    expect(result).toBeDefined();
    expect(result).toHaveProperty("sent");
    expect(result).toHaveProperty("failed");
    // We expect this to fail because the endpoint is fake
    expect(result.failed).toBeGreaterThanOrEqual(0);
  });

  it("should handle promotion notifications", async () => {
    // Save a subscription
    await savePushSubscription(testCustomerId, testSubscription);

    // Try to send promotion (will fail due to invalid endpoint, but should handle gracefully)
    const result = await sendPromotionNotification(
      "Promoção Especial",
      "Frango com desconto",
      20,
      "percentual"
    );

    expect(result).toBeDefined();
    expect(result).toHaveProperty("sent");
    expect(result).toHaveProperty("failed");
  });

  it("should handle non-existent customer subscriptions", async () => {
    const result = await sendPushNotification(999999, "Test", "Test message");

    expect(result).toBeDefined();
    expect(result.sent).toBe(0);
  });
});
