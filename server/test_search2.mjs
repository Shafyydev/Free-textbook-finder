import { searchBooks } from './src/providers/index.js';

async function main() {
  try {
    const result = await searchBooks('Calculus', { limit: 5 });
    console.log('Total: ' + result.total);
    result.results.forEach((b, i) => {
      console.log((i+1) + '. [' + b.status + '] ' + b.title);
      console.log('   License: ' + (b.options?.[0]?.license || 'none'));
      console.log('   URL: ' + (b.options?.[0]?.url || 'none'));
      console.log('   Provider: ' + (b._provider || 'merged'));
    });
  } catch (err) {
    console.log('Error: ' + err.message);
    console.log('Stack: ' + err.stack);
  }
}

main();
