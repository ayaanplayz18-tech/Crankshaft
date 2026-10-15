import ShareSetting, {
  type ICapitalChangeLog,
  type IShareSetting,
} from "@/lib/models/ShareSetting";
import { connectDB } from "@/lib/mongodb";

/**
 * ============================================================================
 * CRANKSHAFT FINANCIAL VALUATION & DIVIDEND ENGINE
 * ============================================================================
 *
 * Core Financial Mechanics:
 *
 * 1. Capital-Driven Market Valuation Formula:
 *    P = C / S
 *    where:
 *      C = Total Company Capital in INR (Authoritative, Independent)
 *      S = Total Shares Outstanding (Fixed at 1,000 shares)
 *      P = Market Value per Share (Strictly Derived & Read-Only)
 *
 *    *NOTE*: Market Value per Share (P) cannot be updated directly.
 *    Any revaluation occurs by adjusting the Total Capital (C), which
 *    automatically recalibrates P across all public and reserved pools.
 *
 * 2. Pool Valuations:
 *    - Total Market Cap:        V_total    = C = S * P
 *    - Public Market Pool:      V_public   = 400 * P = 0.40 * C (40%)
 *    - Founders/Reserved Pool:  V_reserved = 600 * P = 0.60 * C (60%)
 *
 * 3. Dividend Distribution Formula:
 *    - Dividend Per Share (DPS): DPS = D / S = D / 1,000
 *    - Dividend Yield (%):       Yield = (DPS / P) * 100% = (D / C) * 100%
 *    - Stakeholder Payout:       Payout = UserShares * DPS = (UserShares / 1,000) * D
 *
 * 4. Audit Governance:
 *    - Any capital modification STRICTLY mandates a non-empty reason for audit trail.
 * ============================================================================
 */

/** Default base capital: ₹20,000 (yields default ₹20.00 / share across 1,000 shares) */
export const DEFAULT_CAPITAL = 20000;
export const DEFAULT_PRICE_PER_SHARE = 20;

/** Authorized share pool structure */
export const TOTAL_SHARES = 1000;
export const RESERVED_PERCENT = 60;
export const MAX_PUBLIC_SHARES = 400; // 40% of total
export const RESERVED_SHARES = 600; // 60% of total
export const SHARES_PER_PERCENT = 10; // 10 shares = 1% profit stake

/**
 * Pure financial formula: Computes derived Market Value per Share (m.v.) from Capital (C).
 * Formula: m.v. = Capital / (1,000 - number of shares available)
 */
export function calculateMarketValueFromCapital(
  capital: number,
  availableShares: number = 0,
): number {
  if (
    typeof capital !== "number" ||
    Number.isNaN(capital) ||
    !Number.isFinite(capital) ||
    capital <= 0
  ) {
    throw new Error("Company capital must be a positive finite number.");
  }
  const denom = TOTAL_SHARES - (Number(availableShares) || 0);
  const effectiveDenominator = denom > 0 ? denom : TOTAL_SHARES;
  return Math.round((capital / effectiveDenominator) * 100) / 100;
}

/**
 * Computes currently available market shares dynamically from PAID shares in MongoDB.
 */
export async function getAvailableSharesCount(): Promise<number> {
  try {
    const { default: Share } = await import("@/lib/models/Share");
    await connectDB();
    const result = await Share.aggregate([
      { $match: { status: "PAID" } },
      {
        $group: {
          _id: { $ifNull: ["$pool", "market"] },
          totalShares: { $sum: "$numberOfShares" },
        },
      },
    ]);
    let marketSold = 0;
    result.forEach((r) => {
      if (r._id !== "reserved") marketSold += r.totalShares;
    });
    return Math.max(0, MAX_PUBLIC_SHARES - marketSold);
  } catch {
    return MAX_PUBLIC_SHARES;
  }
}

/**
 * Pure financial formula: Computes dividend distribution metrics.
 */
export function calculateDividendMetrics(
  capital: number,
  dividendPool: number = 0,
  userShares: number = 0,
) {
  const safeCapital = Math.max(1, capital);
  const safeDividendPool = Math.max(0, dividendPool);
  const safeUserShares = Math.max(0, userShares);

  // DPS = Total Dividend / Total Shares
  const dps = Math.round((safeDividendPool / TOTAL_SHARES) * 100) / 100;

  // Dividend Yield = (Total Dividend / Total Capital) * 100
  const dividendYieldPercent =
    Math.round((safeDividendPool / safeCapital) * 10000) / 100;

  // Individual stakeholder payout
  const userPayout = Math.round(safeUserShares * dps * 100) / 100;
  const userStakePercent =
    Math.round((safeUserShares / TOTAL_SHARES) * 10000) / 100;

  return {
    dividendPool: safeDividendPool,
    dividendPerShare: dps,
    dividendYieldPercent,
    userPayout,
    userStakePercent,
  };
}

export interface ShareConfigData {
  totalCapital: number;
  pricePerShare: number;
  totalShares: number;
  dividendPool: number;
  dividendPerShare: number;
  dividendYieldPercent: number;
  reasonForChange: string;
  changeHistory: ICapitalChangeLog[];
  updatedBy: string;
  updatedAt: Date;
}

/**
 * Fetch full financial configuration from database.
 * If totalCapital is missing on legacy documents, backfills from pricePerShare * TOTAL_SHARES.
 */
export async function getShareConfig(): Promise<ShareConfigData> {
  try {
    await connectDB();
    const config = await ShareSetting.findOne({ key: "shares_config" }).lean();

    if (config) {
      const capital =
        typeof config.totalCapital === "number" && config.totalCapital > 0
          ? config.totalCapital
          : (config.pricePerShare || DEFAULT_PRICE_PER_SHARE) * TOTAL_SHARES;

      const availableShares = await getAvailableSharesCount();
      const price = calculateMarketValueFromCapital(capital, availableShares);
      const divPool = Math.max(0, config.dividendPool || 0);
      const divMetrics = calculateDividendMetrics(capital, divPool);

      return {
        totalCapital: capital,
        pricePerShare: price,
        totalShares: TOTAL_SHARES,
        dividendPool: divPool,
        dividendPerShare: divMetrics.dividendPerShare,
        dividendYieldPercent: divMetrics.dividendYieldPercent,
        reasonForChange:
          config.reasonForChange || "Initial company capitalization",
        changeHistory: (config.changeHistory as ICapitalChangeLog[]) || [],
        updatedBy: config.updatedBy || "System",
        updatedAt: config.updatedAt || new Date(),
      };
    }
  } catch (err) {
    console.error(
      "[getShareConfig] Error fetching config, using defaults:",
      err,
    );
  }

  const defaultPrice = calculateMarketValueFromCapital(DEFAULT_CAPITAL);
  const defaultDiv = calculateDividendMetrics(DEFAULT_CAPITAL, 0);

  return {
    totalCapital: DEFAULT_CAPITAL,
    pricePerShare: defaultPrice,
    totalShares: TOTAL_SHARES,
    dividendPool: 0,
    dividendPerShare: defaultDiv.dividendPerShare,
    dividendYieldPercent: defaultDiv.dividendYieldPercent,
    reasonForChange: "System default initialization",
    changeHistory: [],
    updatedBy: "System",
    updatedAt: new Date(),
  };
}

/**
 * Fetch the current market value (price per share in INR) from the database.
 * Market value is strictly derived from the current capital.
 */
export async function getSharePrice(): Promise<number> {
  const config = await getShareConfig();
  return config.pricePerShare;
}

/**
 * Primary corporate action: Updates the Total Company Capital.
 *
 * Rules:
 * - Market value is NEVER updated directly. It is computed as: Capital / TOTAL_SHARES.
 * - A valid, non-empty `reason` is MANDATORY for all capital adjustments.
 */
export async function updateCompanyCapital(
  newCapital: number,
  reason: string,
  updatedBy: string,
  dividendPool?: number,
): Promise<{
  previousCapital: number;
  currentCapital: number;
  previousMarketValue: number;
  currentMarketValue: number;
  reason: string;
  setting: IShareSetting;
}> {
  // 1. Capital Validation
  if (
    typeof newCapital !== "number" ||
    Number.isNaN(newCapital) ||
    !Number.isFinite(newCapital) ||
    newCapital <= 0
  ) {
    throw new Error(
      "Total company capital must be a positive number greater than 0.",
    );
  }

  // 2. Mandatory Reason Validation
  if (
    !reason ||
    typeof reason !== "string" ||
    !reason.trim() ||
    reason.trim().length < 3
  ) {
    throw new Error(
      "A valid reason for changing company capital is strictly required for financial compliance.",
    );
  }

  const cleanCapital = Math.round(newCapital * 100) / 100;
  const cleanReason = reason.trim();
  const availableShares = await getAvailableSharesCount();
  const derivedMarketValue = calculateMarketValueFromCapital(
    cleanCapital,
    availableShares,
  );

  await connectDB();
  const existing = await ShareSetting.findOne({ key: "shares_config" });

  const previousCapital =
    existing?.totalCapital ??
    (existing?.pricePerShare ?? DEFAULT_PRICE_PER_SHARE) * TOTAL_SHARES;
  const previousMarketValue =
    existing?.pricePerShare ?? DEFAULT_PRICE_PER_SHARE;

  // New log entry for audit history
  const changeEntry: ICapitalChangeLog = {
    previousCapital,
    newCapital: cleanCapital,
    previousMarketValue,
    newMarketValue: derivedMarketValue,
    reason: cleanReason,
    updatedBy: updatedBy || "Admin",
    timestamp: new Date(),
  };

  const updateFields: any = {
    totalCapital: cleanCapital,
    pricePerShare: derivedMarketValue, // Auto-computed!
    totalShares: TOTAL_SHARES,
    reasonForChange: cleanReason,
    updatedBy: updatedBy || "Admin",
    $push: { changeHistory: changeEntry },
  };

  if (dividendPool !== undefined && !Number.isNaN(Number(dividendPool))) {
    updateFields.dividendPool = Math.max(0, Number(dividendPool));
  }

  const setting = await ShareSetting.findOneAndUpdate(
    { key: "shares_config" },
    updateFields,
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  return {
    previousCapital,
    currentCapital: setting.totalCapital,
    previousMarketValue,
    currentMarketValue: setting.pricePerShare,
    reason: cleanReason,
    setting,
  };
}

/**
 * Backward compatibility wrapper.
 * Converts direct share price requests into capital adjustments with a mandated reason.
 */
export async function updateSharePrice(
  newPrice: number,
  updatedBy: string,
  reason: string = "Direct price adjustment converted to company capital valuation",
): Promise<{
  previousPrice: number;
  currentPrice: number;
  setting: IShareSetting;
}> {
  if (
    typeof newPrice !== "number" ||
    Number.isNaN(newPrice) ||
    !Number.isFinite(newPrice) ||
    newPrice <= 0
  ) {
    throw new Error("Market value per share must be a positive number.");
  }

  // Derive capital: C = P * TOTAL_SHARES
  const derivedCapital = newPrice * TOTAL_SHARES;
  const res = await updateCompanyCapital(derivedCapital, reason, updatedBy);

  return {
    previousPrice: res.previousMarketValue,
    currentPrice: res.currentMarketValue,
    setting: res.setting,
  };
}

/**
 * Compute pool equity and financial market valuation metrics based on the active market value and capital.
 */
export function calculateShareMetrics(
  soldShares: number,
  pricePerShare: number,
  reservedSoldShares: number = 0,
  totalCapital?: number,
  dividendPool: number = 0,
) {
  const safeMarketSold = Math.max(0, soldShares);
  const safeReservedSold = Math.max(0, reservedSoldShares);
  const safePrice = Math.max(0, pricePerShare);

  const capital =
    totalCapital !== undefined && totalCapital > 0
      ? totalCapital
      : safePrice * TOTAL_SHARES;

  const availableMarketShares = Math.max(0, MAX_PUBLIC_SHARES - safeMarketSold);
  const availableReservedShares = Math.max(
    0,
    RESERVED_SHARES - safeReservedSold,
  );
  const totalSoldShares = safeMarketSold + safeReservedSold;
  const totalAvailableShares = availableMarketShares + availableReservedShares;

  const soldPercent = parseFloat(
    ((safeMarketSold / TOTAL_SHARES) * 100).toFixed(2),
  );
  const reservedSoldPercent = parseFloat(
    ((safeReservedSold / TOTAL_SHARES) * 100).toFixed(2),
  );
  const totalSoldPercent = parseFloat(
    ((totalSoldShares / TOTAL_SHARES) * 100).toFixed(2),
  );
  const availablePercent = parseFloat(
    Math.max(0, 40 - (safeMarketSold / TOTAL_SHARES) * 100).toFixed(2),
  );
  const remainingReservedPercent = parseFloat(
    Math.max(0, 60 - (safeReservedSold / TOTAL_SHARES) * 100).toFixed(2),
  );

  const totalCompanyValuation = capital;
  const publicPoolValuation = MAX_PUBLIC_SHARES * safePrice;
  const soldPoolValuation = safeMarketSold * safePrice;
  const reservedPoolValuation = RESERVED_SHARES * safePrice;

  // Dividend metrics
  const divMetrics = calculateDividendMetrics(
    capital,
    dividendPool,
    safeMarketSold,
  );

  return {
    totalCapital: capital,
    totalShares: TOTAL_SHARES,
    reservedShares: RESERVED_SHARES,
    reservedSoldShares: safeReservedSold,
    availableReservedShares,
    reservedSoldPercent,
    remainingReservedPercent,
    maxPublicShares: MAX_PUBLIC_SHARES,
    soldShares: safeMarketSold,
    availableShares: availableMarketShares,
    totalSoldShares,
    totalAvailableShares,
    soldPercent,
    reservedPercent: RESERVED_PERCENT,
    availablePercent,
    totalSoldPercent,
    pricePerShare: safePrice,
    sharesPerPercent: SHARES_PER_PERCENT,
    totalCompanyValuation,
    publicPoolValuation,
    soldPoolValuation,
    reservedPoolValuation,
    dividendPool: divMetrics.dividendPool,
    dividendPerShare: divMetrics.dividendPerShare,
    dividendYieldPercent: divMetrics.dividendYieldPercent,
  };
}
