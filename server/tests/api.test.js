const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const validate = require('../middleware/validate');

describe('Input Validation Middleware Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {} };
    res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      }
    };
    next = () => { req.nextCalled = true; };
  });

  test('validateAuthInput passes with valid email and password', () => {
    req.body = { email: 'user@example.com', password: 'password123' };
    validate.validateAuthInput(req, res, next);
    assert.equal(req.nextCalled, true);
    assert.equal(res.statusCode, 200);
  });

  test('validateAuthInput fails with invalid email', () => {
    req.body = { email: 'invalid-email', password: 'password123' };
    validate.validateAuthInput(req, res, next);
    assert.equal(res.statusCode, 400);
    assert.equal(req.nextCalled, undefined);
  });

  test('validateAuthInput fails with short password', () => {
    req.body = { email: 'user@example.com', password: '123' };
    validate.validateAuthInput(req, res, next);
    assert.equal(res.statusCode, 400);
    assert.equal(req.nextCalled, undefined);
  });

  test('validateReviewRating passes with valid rating', () => {
    req.body = { rating: 'good' };
    validate.validateReviewRating(req, res, next);
    assert.equal(req.nextCalled, true);
  });

  test('validateReviewRating fails with invalid rating', () => {
    req.body = { rating: 'super-easy' };
    validate.validateReviewRating(req, res, next);
    assert.equal(res.statusCode, 400);
    assert.equal(req.nextCalled, undefined);
  });
});

const { calculateStreak } = require('../utils/streak');

describe('Backend Streak Calculation Unit Tests', () => {
  const now = new Date();
  const msInDay = 86400000;

  test('User solved today and past 5 days -> streak = 6', () => {
    const problems = [0, 1, 2, 3, 4, 5].map(daysAgo => ({
      solvedAt: new Date(now.getTime() - (daysAgo * msInDay))
    }));
    const streak = calculateStreak(problems, {});
    assert.equal(streak, 6);
  });

  test('User solved yesterday and past 4 days, but not today -> streak = 5', () => {
    const problems = [1, 2, 3, 4, 5].map(daysAgo => ({
      solvedAt: new Date(now.getTime() - (daysAgo * msInDay))
    }));
    const streak = calculateStreak(problems, {});
    assert.equal(streak, 5);
  });

  test('User solved 2+ days ago and nothing since -> streak = 0', () => {
    const problems = [2, 3, 4].map(daysAgo => ({
      solvedAt: new Date(now.getTime() - (daysAgo * msInDay))
    }));
    const streak = calculateStreak(problems, {});
    assert.equal(streak, 0);
  });

  test('Syncing 20 historical problems from 100 days ago today -> streak = 0', () => {
    const problems = Array.from({ length: 20 }, () => ({
      solvedAt: new Date(now.getTime() - (100 * msInDay)),
      syncedAt: new Date() // synced today
    }));
    const streak = calculateStreak(problems, {});
    assert.equal(streak, 0);
  });
});
