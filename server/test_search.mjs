import { searchBooks } from './src/providers/index.js';

const queries = [
  "Harrison's Principles of Internal Medicine",
  'Gray\'s Anatomy',
  'Pride and Prejudice',
  'Calculus',
  'Grays Anatomy 2020'
];

async function main() {
  for (const q of queries) {
    const result = await searchBooks(q, { limit: 10 });
    console.log('\n=== ' + q + ' ===');
    console.log('Total: ' + result.total);
    console.log('Providers: ' + JSON.stringify(result.providers));
    result.results.forEach((b, i) => {
      console.log((i+1) + '. [' + b.status + '] ' + b.title);
      console.log('   License: ' + (b.options?.[0]?.license || 'none'));
      console.log('   URL: ' + (b.options?.[0]?.url || 'none'));
      console.log('   Provider: ' + (b._provider || 'merged'));
    });
  }
}

main().catch(e => console.error(e));
