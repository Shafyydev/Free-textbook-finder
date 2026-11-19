import { search as localSearch } from './src/providers/local.js';
import { search as googleBooksSearch, PROVIDER_NAME as GOOGLE_NAME } from './src/providers/google-books.js';
import { search as openstaxSearch, PROVIDER_NAME as OPENAX_NAME } from './src/providers/openstax.js';
import { search as doabSearch, PROVIDER_NAME as DOAB_NAME } from './src/providers/doab.js';
import { search as openLibrarySearch, PROVIDER_NAME as OPEN_LIBRARY_NAME } from './src/providers/open-library.js';
import { search as gutenbergSearch, PROVIDER_NAME as GUTENBERG_NAME } from './src/providers/gutenberg.js';
import { search as ncbiSearch, PROVIDER_NAME as NCBI_NAME } from './src/providers/ncbi.js';
import { search as internetArchiveSearch, PROVIDER_NAME as INTERNET_ARCHIVE_NAME } from './src/providers/internet-archive.js';
import { search as hathitrustSearch, PROVIDER_NAME as HATHITRUST_NAME } from './src/providers/hathitrust.js';

const providers = [
  { name: 'local', fn: localSearch },
  { name: 'google-books', fn: googleBooksSearch },
  { name: 'openstax', fn: openstaxSearch },
  { name: 'doab', fn: doabSearch },
  { name: 'open-library', fn: openLibrarySearch },
  { name: 'gutenberg', fn: gutenbergSearch },
  { name: 'ncbi', fn: ncbiSearch },
  { name: 'internet-archive', fn: internetArchiveSearch },
  { name: 'ncbi', fn: hathitrustSearch }
];

async function test() {
  for (const p of providers) {
    try {
      const results = await p.fn('Pride and Prejudice', { limit: 5 });
      console.log(`${p.name}: ${results.length} results`);
      results.forEach(r => console.log(`  [${r.status}] ${r.title} | ${r.options?.[0]?.source}`));
    } catch (err) {
      console.log(`${p.name}: ERROR - ${err.message}`);
    }
  }
}

test().catch(e => console.error('Fatal:', e));
