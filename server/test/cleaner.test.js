import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanQuery, extractIsbn } from '../src/providers/cleaner.js';

test('cleanQuery removes edition, binding, year, brackets and ISBN noise', () => {
  const cases = [
    {
      input: "The Principles Of Exercise Therapy 4Ed Revised (Pb 2025)",
      expected: "The Principles Of Exercise Therapy",
      isbn: null
    },
    {
      input: "Cash's textbook of neurology for physiotherapist",
      expected: "Cash's textbook of neurology for physiotherapist",
      isbn: null
    },
    {
      input: 'calculas',
      expected: 'calculas',
      isbn: null
    },
    {
      input: "Harrison's Principles of Internal Medicine",
      expected: "Harrison's Principles of Internal Medicine",
      isbn: null
    },
    {
      input: "Harrison's Principles 9780071803234",
      expected: "Harrison's Principles",
      isbn: '9780071803234'
    },
    {
      input: "Calculus 4th (Hb 2020) Paperback",
      expected: "Calculus",
      isbn: null
    }
  ];

  for (const { input, expected, isbn } of cases) {
    const result = cleanQuery(input);
    assert.equal(result.cleanedQuery, expected, `cleaned query for "${input}"`);
    assert.equal(result.isbn, isbn, `isbn for "${input}"`);
  }
});

test('extractIsbn returns null when no ISBN present', () => {
  assert.equal(extractIsbn('calculas'), null);
  assert.equal(extractIsbn('The Principles Of Exercise Therapy'), null);
  assert.equal(extractIsbn(''), null);
});

test('cleanQuery collapses whitespace and trims', () => {
  const result = cleanQuery("   Calculus   4th   ");
  assert.equal(result.cleanedQuery, 'Calculus');
});
