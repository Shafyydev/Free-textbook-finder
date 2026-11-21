import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractQueryWords, scoreResult, passesRelevance } from '../src/providers/relevance.js';
import { cleanQuery } from '../src/providers/cleaner.js';

const MATCHING = {
  "The Principles Of Exercise Therapy 4Ed Revised (Pb 2025)": "The Principles of Exercise Therapy",
  "Cash's textbook of neurology for physiotherapist": "Cash's Textbook of Neurology for Physiotherapists",
  calculas: 'Calculus',
  "Harrison's Principles of Internal Medicine": "Harrison's Principles of Internal Medicine"
};

function cleanedWords(query) {
  return extractQueryWords(cleanQuery(query).cleanedQuery);
}

test('cleaned query strips edition/binding/year/stop words', () => {
  const cases = {
    "The Principles Of Exercise Therapy 4Ed Revised (Pb 2025)": ['principles', 'exercise', 'therapy'],
    "Cash's textbook of neurology for physiotherapist": ['cash', 'textbook', 'neurology', 'physiotherapist'],
    calculas: ['calculas'],
    "Harrison's Principles of Internal Medicine": ['harrison', 'principles', 'internal', 'medicine']
  };
  for (const [input, expected] of Object.entries(cases)) {
    assert.deepEqual(cleanedWords(input), expected, `words for "${input}"`);
  }
});

test('relevance passes for matching real titles (70% rule)', () => {
  for (const [query, title] of Object.entries(MATCHING)) {
    const words = cleanedWords(query);
    const result = scoreResult(words, title, []);
    assert.ok(result.score >= 0 && result.score <= 1, 'score computed');
    assert.equal(result.score, 1.0, `score 1.0 for "${query}" vs "${title}"`);
    assert.ok(passesRelevance(words, title, []).pass, `passes 70% for "${query}" vs "${title}"`);
  }
});

test('relevance fails for unrelated titles', () => {
  const words = cleanedWords("The Principles Of Exercise Therapy 4Ed Revised (Pb 2025)");
  const result = passesRelevance(words, "Cash's Textbook of Neurology", []);
  assert.ok(!result.pass, 'unrelated title should fail 70%');
  assert.equal(result.score, 0);
});

test('calculas matches Calculus via typo tolerance', () => {
  const words = cleanedWords('calculas');
  const result = passesRelevance(words, 'Calculus', []);
  assert.ok(result.pass, 'calculas should match Calculus');
  assert.equal(result.score, 1.0);
});

test('50% fallback threshold admits results below 70%', () => {
  const words = cleanedWords("The Principles Of Exercise Therapy");
  // A title containing only 2 of 3 important words scores 0.66: below 70%, above 50%
  const below70 = passesRelevance(words, "Principles of Exercise", []);
  assert.ok(!below70.pass, '0.66 fails 70%');
  assert.ok(below70.score >= 0.5, '0.66 passes 50%');
  assert.ok(below70.score < 0.7, '0.66 below 70%');

  // A title containing only 1 of 3 scores 0.33: fails both
  const below50 = passesRelevance(words, "Exercise", []);
  assert.ok(!below50.pass, '0.33 fails 50%');
  assert.ok(below50.score < 0.5, '0.33 below 50%');
});

test('empty query words pass relevance', () => {
  assert.ok(passesRelevance([], 'anything', []).pass);
});
