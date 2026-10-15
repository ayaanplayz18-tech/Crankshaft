import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateDividendMetrics,
  calculateMarketValueFromCapital,
  calculateShareMetrics,
  DEFAULT_PRICE_PER_SHARE,
  updateCompanyCapital,
  updateSharePrice,
} from "../lib/shares";

test("calculateMarketValueFromCapital derives price per share strictly from capital (P = C / 1,000)", () => {
  assert.equal(calculateMarketValueFromCapital(20000), 20);
  assert.equal(calculateMarketValueFromCapital(50000), 50);
  assert.equal(calculateMarketValueFromCapital(37500), 37.5);
  assert.equal(calculateMarketValueFromCapital(100000), 100);

  // Negative and zero capital must be rejected
  assert.throws(() => calculateMarketValueFromCapital(0), {
    message: /positive finite number/,
  });
  assert.throws(() => calculateMarketValueFromCapital(-1000), {
    message: /positive finite number/,
  });
  assert.throws(() => calculateMarketValueFromCapital(Number.NaN), {
    message: /positive finite number/,
  });
});

test("calculateDividendMetrics computes correct DPS and Yield %", () => {
  const capital = 50000;
  const dividendPool = 5000;
  const userShares = 20;

  const metrics = calculateDividendMetrics(capital, dividendPool, userShares);
  // DPS = 5,000 / 1,000 = ₹5.00 / share
  assert.equal(metrics.dividendPerShare, 5);
  // Yield = (5,000 / 50,000) * 100 = 10%
  assert.equal(metrics.dividendYieldPercent, 10);
  // User Payout = 20 shares * ₹5 = ₹100
  assert.equal(metrics.userPayout, 100);
  // User Stake % = (20 / 1,000) * 100 = 2%
  assert.equal(metrics.userStakePercent, 2);
});

test("calculateShareMetrics computes correct metrics with default market value (₹20)", () => {
  const soldShares = 100;
  const price = DEFAULT_PRICE_PER_SHARE; // 20
  const metrics = calculateShareMetrics(soldShares, price);

  assert.equal(metrics.totalShares, 1000);
  assert.equal(metrics.maxPublicShares, 400);
  assert.equal(metrics.reservedShares, 600);
  assert.equal(metrics.reservedPercent, 60);
  assert.equal(metrics.soldShares, 100);
  assert.equal(metrics.availableShares, 300);
  assert.equal(metrics.soldPercent, 10); // 100 / 1000 * 100
  assert.equal(metrics.availablePercent, 30);
  assert.equal(metrics.pricePerShare, 20);
  assert.equal(metrics.totalCompanyValuation, 20000); // 1000 * 20
  assert.equal(metrics.publicPoolValuation, 8000); // 400 * 20
  assert.equal(metrics.soldPoolValuation, 2000); // 100 * 20
});

test("calculateShareMetrics computes correct metrics with custom market value (₹35)", () => {
  const soldShares = 50;
  const customPrice = 35;
  const metrics = calculateShareMetrics(soldShares, customPrice);

  assert.equal(metrics.pricePerShare, 35);
  assert.equal(metrics.totalCompanyValuation, 35000); // 1000 * 35
  assert.equal(metrics.publicPoolValuation, 14000); // 400 * 35
  assert.equal(metrics.soldPoolValuation, 1750); // 50 * 35
  assert.equal(metrics.availableShares, 350); // 400 - 50
});

test("calculateShareMetrics clamps negative sold shares safely", () => {
  const metrics = calculateShareMetrics(-10, 20);
  assert.equal(metrics.soldShares, 0);
  assert.equal(metrics.availableShares, 400);
  assert.equal(metrics.soldPoolValuation, 0);
});

test("updateCompanyCapital strictly enforces mandatory reason for change", async () => {
  // Empty reason must throw
  await assert.rejects(
    async () => {
      await updateCompanyCapital(30000, "", "admin");
    },
    { message: /reason for changing company capital is strictly required/ },
  );

  // Whitespace-only reason must throw
  await assert.rejects(
    async () => {
      await updateCompanyCapital(30000, "   ", "admin");
    },
    { message: /reason for changing company capital is strictly required/ },
  );

  // Invalid capital <= 0 must throw
  await assert.rejects(
    async () => {
      await updateCompanyCapital(-1000, "Valid reason here", "admin");
    },
    { message: /positive number/ },
  );
});

test("updateSharePrice rejects negative, zero, and NaN prices", async () => {
  await assert.rejects(
    async () => {
      await updateSharePrice(-5, "admin");
    },
    { message: /positive number/ },
  );

  await assert.rejects(
    async () => {
      await updateSharePrice(0, "admin");
    },
    { message: /positive number/ },
  );

  await assert.rejects(
    async () => {
      await updateSharePrice(Number.NaN, "admin");
    },
    { message: /positive number/ },
  );
});
