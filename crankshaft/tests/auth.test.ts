import assert from "node:assert/strict";
import test from "node:test";
import {
  validateIndianPhone,
  validateLoginIdentifier,
  validatePassword,
  validateUsername,
} from "../lib/validation";

/* ─── Username Validation Tests ────────────────────────────────────────── */

test("validateUsername strictly rejects Gmail and any email addresses", () => {
  const rejectedEmails = [
    "user@gmail.com",
    "john.doe@gmail.com",
    "ayaansyed@gmail.com",
    "test@yahoo.com",
    "admin@crankshaft.in",
    "person@sub.domain.org",
    "somebody@",
    "@someone",
    "hello@world",
  ];

  for (const email of rejectedEmails) {
    const res = validateUsername(email);
    assert.equal(
      res.isValid,
      false,
      `Expected ${email} to be rejected as a username`,
    );
    assert.match(
      res.error || "",
      /Email addresses/,
      `Expected error message to mention email for ${email}`,
    );
  }
});

test("validateUsername enforces length requirements (3 to 30 characters)", () => {
  assert.equal(validateUsername("ab").isValid, false);
  assert.equal(validateUsername("").isValid, false);
  assert.equal(validateUsername("a".repeat(31)).isValid, false);

  assert.equal(validateUsername("abc").isValid, true);
  assert.equal(validateUsername("a".repeat(30)).isValid, true);
});

test("validateUsername rejects spaces and invalid symbols", () => {
  assert.equal(validateUsername("user name").isValid, false);
  assert.equal(validateUsername("user$name").isValid, false);
  assert.equal(validateUsername("user#123").isValid, false);
  assert.equal(validateUsername("user!").isValid, false);
  assert.equal(validateUsername("user%").isValid, false);
});

test("validateUsername rejects starting or ending with symbols", () => {
  assert.equal(validateUsername("_username").isValid, false);
  assert.equal(validateUsername("-username").isValid, false);
  assert.equal(validateUsername("username_").isValid, false);
  assert.equal(validateUsername("username-").isValid, false);
});

test("validateUsername accepts standard valid alphanumeric usernames with underscores and hyphens", () => {
  const validUsernames = [
    "ayaansyed",
    "ayaan_18",
    "crank-shaft",
    "collector_2026",
    "speed-demon-99",
    "vintage_lover",
  ];

  for (const u of validUsernames) {
    const res = validateUsername(u);
    assert.equal(
      res.isValid,
      true,
      `Expected ${u} to be valid, got: ${res.error}`,
    );
  }
});

/* ─── Password Validation Tests ────────────────────────────────────────── */

test("validatePassword enforces minimum 8 characters and maximum 100", () => {
  assert.equal(validatePassword("abc1").isValid, false);
  assert.equal(validatePassword("1234567").isValid, false);
  assert.equal(validatePassword("a".repeat(101)).isValid, false);
});

test("validatePassword requires both letters and numbers", () => {
  // Letters only
  assert.equal(validatePassword("abcdefgh").isValid, false);
  // Numbers only
  assert.equal(validatePassword("12345678").isValid, false);
  // Both letters and numbers
  assert.equal(validatePassword("Password123").isValid, true);
  assert.equal(validatePassword("crankshaft2026").isValid, true);
  assert.equal(validatePassword("secure99!").isValid, true);
});

/* ─── Phone Number Validation Tests ────────────────────────────────────── */

test("validateIndianPhone validates 10-digit Indian numbers starting with 6, 7, 8, or 9", () => {
  // Valid
  assert.equal(validateIndianPhone("9876543210").isValid, true);
  assert.equal(validateIndianPhone("+919876543210").isValid, true);
  assert.equal(validateIndianPhone("8123456789").isValid, true);
  assert.equal(validateIndianPhone("7000000000").isValid, true);
  assert.equal(validateIndianPhone("6300000000").isValid, true);

  // Invalid length
  assert.equal(validateIndianPhone("98765").isValid, false);
  assert.equal(validateIndianPhone("987654321012").isValid, false);

  // Invalid starting digit (India does not assign mobile numbers starting with 0, 1, 2, 3, 4, 5)
  assert.equal(validateIndianPhone("1234567890").isValid, false);
  assert.equal(validateIndianPhone("5555555555").isValid, false);
  assert.equal(validateIndianPhone("0987654321").isValid, false);
});

/* ─── Login Identifier Validation Tests ────────────────────────────────── */

test("validateLoginIdentifier rejects emails and guides user to proper method", () => {
  const emailRes = validateLoginIdentifier("user@gmail.com");
  assert.equal(emailRes.isValid, false);
  assert.match(emailRes.error || "", /Google/);

  // Accepts valid username or phone
  assert.equal(validateLoginIdentifier("ayaansyed").isValid, true);
  assert.equal(validateLoginIdentifier("9876543210").isValid, true);
  assert.equal(validateLoginIdentifier("+919876543210").isValid, true);
});
