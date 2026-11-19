import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CC_BY = 'Creative Commons Attribution 4.0 International';
const CC_BY_URL = 'https://creativecommons.org/licenses/by/4.0/';
const CC_BY_NC_SA = 'Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International';
const CC_BY_NC_SA_URL = 'https://creativecommons.org/licenses/by-nc-sa/4.0/';

function os(sourceSlug, title, authors, edition, year, description, subjects, courses, license) {
  const lic = license === 'CC_BY' ? CC_BY : CC_BY_NC_SA;
  const licUrl = license === 'CC_BY' ? CC_BY_URL : CC_BY_NC_SA_URL;
  return {
    title,
    authors,
    edition: edition || null,
    year: year || null,
    description: description || null,
    cover_url: null,
    subjects,
    courses,
    sources: [{
      source_name: 'OpenStax',
      base_url: 'https://openstax.org',
      official_url: `https://openstax.org/details/books/${sourceSlug}`,
      license: lic,
      license_url: licUrl,
    }],
  };
}

const openStaxBooks = [
  os('anatomy-and-physiology-2e', 'Anatomy and Physiology 2e', 'J. Gordon Betts, Kelly A. Young, James A. Wise, et al.', '2e', 2022, 'Comprehensive two-semester human anatomy and physiology textbook from OpenStax.', ['Anatomy', 'Physiology'], ['MBBS Year 1', 'Physiotherapy'], 'CC_BY_NC_SA'),
  os('microbiology', 'Microbiology', 'Nina Parker, Mark Schneegurt, Anh-Hue Thi Tu, et al.', null, 2016, 'Microbiology textbook for allied health and nursing students.', ['Microbiology', 'Nursing'], ['Nursing', 'MBBS Year 1'], 'CC_BY_NC_SA'),
  os('biology-2e', 'Biology 2e', 'Mary Ann Clark, Matthew Douglas, Jung Choi', '2e', 2018, 'Two-semester biology textbook for science majors.', ['Biology'], ['MBBS Year 1'], 'CC_BY_NC_SA'),
  os('chemistry-2e', 'Chemistry 2e', 'Paul Flowers, Klaus Theopold, Richard Langley, et al.', '2e', 2019, 'Two-semester chemistry textbook.', ['Chemistry'], ['MBBS Year 1'], 'CC_BY_NC_SA'),
  os('nutrition', 'Nutrition for Nurses', 'OpenStax', null, 2024, 'Nutrition textbook tailored for nursing students.', ['Nutrition', 'Nursing'], ['Nursing'], 'CC_BY_NC_SA'),
  os('psychology-2e', 'Psychology 2e', 'Rose M. Spielman, William J. Jenkins, Marilyn D. Lovett', '2e', 2020, 'Introductory psychology textbook.', ['Psychology'], ['Nursing', 'MBBS Year 1'], 'CC_BY_NC_SA'),
  os('medical-surgical-nursing', 'Medical-Surgical Nursing', 'OpenStax', null, 2024, 'Medical-surgical nursing textbook for nursing students.', ['Nursing', 'Medical-Surgical Nursing'], ['Nursing', 'MBBS Year 2'], 'CC_BY_NC_SA'),
  os('pharmacology', 'Pharmacology for Nurses', 'OpenStax', null, 2024, 'Pharmacology textbook for nursing students.', ['Pharmacology', 'Nursing'], ['Nursing', 'MBBS Year 1'], 'CC_BY_NC_SA'),
  os('maternal-newborn-nursing', 'Maternal-Newborn Nursing', 'OpenStax', null, 2024, 'Maternal-newborn nursing textbook.', ['Nursing', 'Maternal-Newborn Nursing'], ['Nursing', 'MBBS Year 2'], 'CC_BY_NC_SA'),
  os('psychiatric-mental-health', 'Psychiatric-Mental Health Nursing', 'OpenStax', null, 2024, 'Psychiatric-mental health nursing textbook.', ['Nursing', 'Psychiatric-Mental Health'], ['Nursing', 'MBBS Year 2'], 'CC_BY_NC_SA'),
  os('population-health', 'Population Health for Nurses', 'OpenStax', null, 2024, 'Population health textbook for nursing students.', ['Public Health', 'Nursing'], ['Nursing'], 'CC_BY_NC_SA'),
  os('college-physics-2e', 'College Physics 2e', 'Paul Peter Urone, Roger Hinrichs', '2e', 2022, 'Algebra-based college physics textbook.', ['Physics'], ['MBBS Year 1', 'Physiotherapy'], 'CC_BY_NC_SA'),
  os('university-physics-volume-1', 'University Physics Volume 1', 'Samuel J. Ling, Jeff Sanny, William Moebs', null, 2016, 'Calculus-based university physics volume 1.', ['Physics'], ['MBBS Year 1'], 'CC_BY_NC_SA'),
  os('statistics', 'Statistics', 'OpenStax', null, 2020, 'Introductory statistics textbook.', ['Statistics'], ['MBBS Year 1'], 'CC_BY'),
  os('precalculus-2e', 'Precalculus 2e', 'OpenStax', '2e', 2021, 'Precalculus textbook.', ['Mathematics'], ['MBBS Year 1'], 'CC_BY_NC_SA'),
  os('college-algebra-2e', 'College Algebra 2e', 'Jay Abramson', '2e', 2021, 'College algebra textbook.', ['Mathematics'], ['MBBS Year 1'], 'CC_BY_NC_SA'),
  os('principles-financial-accounting', 'Principles of Accounting, Volume 1: Financial Accounting', 'OpenStax', null, 2019, 'Financial accounting textbook volume 1.', ['Accounting'], ['MBBS Year 1'], 'CC_BY_NC_SA'),
  os('principles-management', 'Principles of Management', 'David S. Bright, Anastasia H. Cortes', null, 2019, 'Principles of management textbook.', ['Management'], ['MBBS Year 1'], 'CC_BY_NC_SA'),
  os('principles-marketing', 'Principles of Marketing', 'OpenStax', null, 2023, 'Principles of marketing textbook.', ['Marketing'], ['MBBS Year 1'], 'CC_BY_NC_SA'),
  os('introduction-sociology-3e', 'Introduction to Sociology 3e', 'Nathan J. Keirns, Heather Griffiths, Eric Strayer, et al.', '3e', 2021, 'Introduction to sociology textbook.', ['Sociology'], ['MBBS Year 1'], 'CC_BY_NC_SA'),
  os('principles-economics-3e', 'Principles of Economics 3e', 'Steven A. Greenlaw, David Shapiro, Timothy Taylor', '3e', 2022, 'Principles of economics textbook.', ['Economics'], ['MBBS Year 1'], 'CC_BY_NC_SA'),
  os('us-history', 'U.S. History', 'P. Scott Corbett, Volker Janssen, John M. Lund, et al.', null, 2016, 'U.S. History textbook.', ['History'], ['MBBS Year 1'], 'CC_BY_NC_SA'),
  os('writing-guide', 'Writing Guide with Handbook', 'OpenStax', null, 2021, 'Writing guide with handbook.', ['Writing'], ['MBBS Year 1'], 'CC_BY_NC_SA'),
  os('concepts-biology', 'Concepts of Biology', 'Samantha Fowler, Rebecca Roush, James Wise', null, 2016, 'Introductory biology for nonmajors.', ['Biology'], ['MBBS Year 1'], 'CC_BY_NC_SA'),
  os('introductory-statistics-2e', 'Introductory Statistics 2e', 'Barbara Illowsky, Susan Dean', '2e', 2023, 'Introductory statistics textbook.', ['Statistics'], ['MBBS Year 1'], 'CC_BY_NC_SA'),
  os('organizational-behavior', 'Organizational Behavior', 'OpenStax', null, 2019, 'Organizational behavior textbook.', ['Management', 'Organizational Behavior'], ['MBBS Year 1'], 'CC_BY_NC_SA'),
  os('introduction-political-science', 'Introduction to Political Science', 'OpenStax', null, 2022, 'Introduction to political science textbook.', ['Political Science'], ['MBBS Year 1'], 'CC_BY_NC_SA'),
  os('lifespan-development', 'Lifespan Development', 'OpenStax', null, 2024, 'Lifespan development psychology textbook.', ['Psychology', 'Human Development'], ['Nursing'], 'CC_BY_NC_SA'),
  os('principles-finance-2e', 'Principles of Finance 2e', 'OpenStax', '2e', 2026, 'Principles of finance textbook.', ['Finance'], ['MBBS Year 1'], 'CC_BY_NC_SA'),
];

// Existing verified OTL books (keep as-is, loaded from current file)
const existing = JSON.parse(fs.readFileSync(path.join(__dirname, 'books.json'), 'utf8'));

const allBooks = [...existing, ...openStaxBooks];

fs.writeFileSync(path.join(__dirname, 'books.json'), JSON.stringify(allBooks, null, 2));
console.log(`Wrote ${allBooks.length} books (${existing.length} existing + ${openStaxBooks.length} OpenStax)`);
