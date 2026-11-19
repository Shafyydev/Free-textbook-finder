import { search as googleBooksSearch } from './src/providers/google-books.js';
import { search as openstaxSearch } from './src/providers/openstax.js';
import { search as doabSearch } from './src/providers/doab.js';
import { search as openLibrarySearch } from './src/providers/open-library.js';
import { search as gutenbergSearch } from './src/providers/gutenberg.js';
import { search as ncbiSearch } from './src/providers/ncbi.js';
import { search as localSearch } from './src/providers/local.js';

const queries = [
  "Harrison's Principles of Internal Medicine",
  'Gray\'s Anatomy',
  'Pride and Prejudice',
  'Calculus',
  'Grays Anatomy 2020'
];

async function testProvider(name, searchFn, query) {
  try {
    const results = await searchFn(query, { limit: 10 });
    console.log('\n=== ' + name + ': "' + query + '" ===');
    console.log('Results: ' + results.length);
    results.forEach((r, i) => {
      console.log((i+1) + '. [' + r.status + '] ' + r.title);
      console.log('   License: ' + (r.options?.[0]?.license || 'none'));
      console.log('   URL: ' + (r.options?.[0]?.url || 'none'));
    });
    return results;
  } catch (err) {
    console.log('\n=== ' + name + ': "' + query + '" ===');
    console.log('ERROR: ' + err.message);
    return [];
  }
}

async function main() {
  const providers = [
    { name: 'Local DB', fn: localSearch },
    { name: 'Google Books', fn: googleBooksSearch },
    { name: 'OpenStax', fn: openstaxSearch },
    { name: 'DOAB', fn: doabSearch },
    { name: 'Open Library', fn: openLibrarySearch },
    { name: 'Gutenberg', fn: gutenbergSearch },
    { name: 'NCBI', fn: ncbiSearch }
  ];

  for (const query of queries) {
    for (const p of providers) {
      await testProvider(p.name, p.fn, query);
    }
  }
}

main().catch(e => console.error(e));
