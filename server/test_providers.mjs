import { search as googleBooksSearch, PROVIDER_NAME as GOOGLE_NAME } from './src/providers/google-books.js';
import { search as openstaxSearch, PROVIDER_NAME as OPENAX_NAME } from './src/providers/openstax.js';
import { search as doabSearch, PROVIDER_NAME as DOAB_NAME } from './src/providers/doab.js';
import { search as openLibrarySearch, PROVIDER_NAME as OPEN_LIBRARY_NAME } from './src/providers/open-library.js';
import { search as gutenbergSearch, PROVIDER_NAME as GUTENBERG_NAME } from './src/providers/gutenberg.js';
import { search as ncbiSearch, PROVIDER_NAME as NCBI_NAME } from './src/providers/ncbi.js';

const queries = [
  'Harrison\'s Principles of Internal Medicine',
  'Gray\'s Anatomy',
  'Pride and Prejudice',
  'Calculus',
  'Grays Anatomy 2020'
];

async function testProvider(name, searchFn, query) {
  try {
    const results = await searchFn(query, { limit: 10 });
    console.log(`\n=== ${name}: "${query}" ===`);
    console.log(`Results: ${results.length}`);
    results.forEach((r, i) => {
      console.log(`  ${i+1}. [${r.status}] ${r.title}`);
      console.log(`     License: ${r.options?.[0]?.license || 'none'}`);
      console.log(`     URL: ${r.options?.[0]?.url || 'none'}`);
      console.log(`     Option types: ${r.options?.map(o => o.type).join(', ') || 'none'}`);
    });
    return results;
  } catch (err) {
    console.log(`\n=== ${name}: "${query}" ===`);
    console.log(`ERROR: ${err.message}`);
    return [];
  }
}

async function runAll() {
  const providers = [
    { name: 'Google Books', fn: googleBooksSearch, apiKey: undefined },
    { name: 'OpenStax', fn: openstaxSearch, apiKey: undefined },
    { name: 'DOAB', fn: doabSearch, apiKey: undefined },
    { name: 'Open Library', fn: openLibrarySearch, apiKey: undefined },
    { name: 'Gutenberg', fn: gutenbergSearch, apiKey: undefined },
    { name: 'NCBI', fn: ncbiSearch, apiKey: undefined }
  ];

  for (const query of queries) {
    for (const p of providers) {
      await testProvider(p.name, p.fn, query);
    }
  }
}

runAll().catch(e => console.error(e));
