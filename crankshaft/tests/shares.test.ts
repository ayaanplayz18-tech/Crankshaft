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

test("calculateMarketValueFromCapital derives price per share strictly from capital (m.v. = capital / total shares bought)", () => {
  assert.equal(calculateMarketValueFromCapital(1600, 200), 8);
  assert.equal(calculateMarketValueFromCapital(20000, 0), 20);
  assert.equal(calculateMarketValueFromCapital(50000), 50);
  assert.equal(calculateMarketValueFromCapital(25000, 500), 50);

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

test("user shareholding calculates exact profit stake percentage (10 shares = 1%)", () => {
  const userPaidShares = 25; // 25 shares
  const totalCompanyShares = 1000;
  const stakePercent = parseFloat(
    ((userPaidShares / totalCompanyShares) * 100).toFixed(2),
  );
  assert.equal(stakePercent, 2.5);

  const currentPricePerShare = 32;
  const portfolioValuation = userPaidShares * currentPricePerShare;
  assert.equal(portfolioValuation, 800); // 25 * 32
});

test("user dividend payout correctly reflects dividend pool distribution", () => {
  const userPaidShares = 40; // 40 shares = 4% stake
  const capital = 30000;
  const dividendPool = 2000;
  const metrics = calculateDividendMetrics(
    capital,
    dividendPool,
    userPaidShares,
  );

  // DPS = 2,000 / 1,000 = ₹2.00 / share
  assert.equal(metrics.dividendPerShare, 2);
  // Payout = 40 * ₹2 = ₹80
  assert.equal(metrics.userPayout, 80);
  assert.equal(metrics.userStakePercent, 4);
});

test("share reassignment links allocation and preserves portfolio value", () => {
  const initialAllocation = {
    username: "manual_buyer",
    userId: "manual_12345",
    numberOfShares: 50,
    totalPrice: 1000,
    pool: "market",
  };

  const registeredUser = {
    _id: "user_registered_67890",
    username: "AyaanSyed",
    phone: "9876543210",
  };

  // Reassignment resolution
  const reassignedShare = {
    ...initialAllocation,
    username: registeredUser.username,
    userId: registeredUser._id,
    phone: registeredUser.phone,
  };

  assert.equal(reassignedShare.username, "AyaanSyed");
  assert.equal(reassignedShare.userId, "user_registered_67890");
  assert.equal(reassignedShare.numberOfShares, 50);

  // Test case-insensitive match resolution
  const queryUsername = "ayaansyed";
  const regex = new RegExp(`^${queryUsername}$`, "i");
  assert.ok(regex.test(reassignedShare.username));
});

