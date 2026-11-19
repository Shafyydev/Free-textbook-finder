import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CC_BY = 'Creative Commons Attribution 4.0 International';
const CC_BY_URL = 'https://creativecommons.org/licenses/by/4.0/';
const CC_BY_NC_SA = 'Creative Commons Attribution-NonCommercial-ShareAlike License';
const CC_BY_NC_SA_URL = 'https://creativecommons.org/licenses/by-nc-sa/4.0/';

// Category mapping for browsing
const CATEGORIES = [
  'Medicine and Health',
  'Nursing',
  'Science',
  'Mathematics',
  'Engineering and Technology',
  'Business',
  'Social Sciences',
  'Humanities',
  'Computer Science',
  'Education',
  'Languages',
  'Law'
];

function os(sourceSlug, title, authors, edition, year, description, subjects, courses, category, license, pdfUrl) {
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
    category,
    featured: false,
    sources: [{
      source_name: 'OpenStax',
      base_url: 'https://openstax.org',
      official_url: `https://openstax.org/details/books/${sourceSlug}`,
      license: lic,
      license_url: licUrl,
      access_type: 'free',
      direct_file_url: pdfUrl || null
    }]
  };
}

// OpenStax books (all live, verified)
const openStaxBooks = [
  os('anatomy-and-physiology-2e', 'Anatomy and Physiology 2e', 'J. Gordon Betts, Kelly A. Young, James A. Wise, et al.', '2e', 2022, 'Comprehensive two-semester human anatomy and physiology textbook from OpenStax.', ['Anatomy', 'Physiology'], ['MBBS Year 1', 'Physiotherapy'], 'Medicine and Health', 'CC_BY_NC_SA', 'https://assets.openstax.org/oscms-prodcms/media/documents/anatomy-and-physiology-2e_-_WEB.pdf'),
  os('microbiology', 'Microbiology', 'Nina Parker, Mark Schneegurt, Anh-Hue Thi Tu, et al.', null, 2016, 'Microbiology textbook for allied health and nursing students.', ['Microbiology', 'Nursing'], ['Nursing', 'MBBS Year 1'], 'Medicine and Health', 'CC_BY_NC_SA', 'https://assets.openstax.org/oscms-prodcms/media/documents/microbiology_-_WEB.pdf'),
  os('biology-2e', 'Biology 2e', 'Mary Ann Clark, Matthew Douglas, Jung Choi', '2e', 2018, 'Two-semester biology textbook for science majors.', ['Biology'], ['MBBS Year 1'], 'Science', 'CC_BY_NC_SA', 'https://assets.openstax.org/oscms-prodcms/media/documents/Biology-2e_-_WEB.pdf'),
  os('chemistry-2e', 'Chemistry 2e', 'Paul Flowers, Klaus Theopold, Richard Langley, et al.', '2e', 2019, 'Two-semester chemistry textbook.', ['Chemistry'], ['MBBS Year 1'], 'Science', 'CC_BY_NC_SA', 'https://assets.openstax.org/oscms-prodcms/media/documents/chemistry-2e_-_WEB.pdf'),
  os('nutrition', 'Nutrition for Nurses', 'OpenStax', null, 2024, 'Nutrition textbook tailored for nursing students.', ['Nutrition', 'Nursing'], ['Nursing'], 'Medicine and Health', 'CC_BY_NC_SA', 'https://assets.openstax.org/oscms-prodcms/media/documents/Nutrition_for_Nurses-WEB.pdf'),
  os('psychology-2e', 'Psychology 2e', 'Rose M. Spielman, William J. Jenkins, Marilyn D. Lovett', '2e', 2020, 'Introductory psychology textbook.', ['Psychology'], ['Nursing', 'MBBS Year 1'], 'Social Sciences', 'CC_BY_NC_SA', 'https://assets.openstax.org/oscms-prodcms/media/documents/Psychology2e_WEB.pdf'),
  os('medical-surgical-nursing', 'Medical-Surgical Nursing', 'OpenStax', null, 2024, 'Medical-surgical nursing textbook for nursing students.', ['Nursing', 'Medical-Surgical Nursing'], ['Nursing', 'MBBS Year 2'], 'Medicine and Health', 'CC_BY_NC_SA', 'https://assets.openstax.org/oscms-prodcms/media/documents/Medical-Surgical_Nursing-WEB.pdf'),
  os('pharmacology', 'Pharmacology for Nurses', 'OpenStax', null, 2024, 'Pharmacology textbook for nursing students.', ['Pharmacology', 'Nursing'], ['Nursing', 'MBBS Year 1'], 'Medicine and Health', 'CC_BY_NC_SA', 'https://assets.openstax.org/oscms-prodcms/media/documents/Pharmacology-WEB.pdf'),
  os('maternal-newborn-nursing', 'Maternal-Newborn Nursing', 'OpenStax', null, 2024, 'Maternal-newborn nursing textbook.', ['Nursing', 'Maternal-Newborn Nursing'], ['Nursing', 'MBBS Year 2'], 'Medicine and Health', 'CC_BY_NC_SA', 'https://assets.openstax.org/oscms-prodcms/media/documents/Maternal-Newborn_Nursing-WEB.pdf'),
  os('psychiatric-mental-health', 'Psychiatric-Mental Health Nursing', 'OpenStax', null, 2024, 'Psychiatric-mental health nursing textbook.', ['Nursing', 'Psychiatric-Mental Health'], ['Nursing', 'MBBS Year 2'], 'Medicine and Health', 'CC_BY_NC_SA', 'https://assets.openstax.org/oscms-prodcms/media/documents/Psychiatric-Mental_Health_Nursing-WEB.pdf'),
  os('population-health', 'Population Health for Nurses', 'OpenStax', null, 2024, 'Population health textbook for nursing students.', ['Public Health', 'Nursing'], ['Nursing'], 'Medicine and Health', 'CC_BY_NC_SA', 'https://assets.openstax.org/oscms-prodcms/media/documents/Population_Health_for_Nurses_-_WEB.pdf'),
  os('college-physics-2e', 'College Physics 2e', 'Paul Peter Urone, Roger Hinrichs', '2e', 2022, 'Algebra-based college physics textbook.', ['Physics'], ['MBBS Year 1', 'Physiotherapy'], 'Science', 'CC_BY_NC_SA', 'https://assets.openstax.org/oscms-prodcms/media/documents/college-physics-2e_-_WEB.pdf'),
  os('university-physics-volume-1', 'University Physics Volume 1', 'Samuel J. Ling, Jeff Sanny, William Moebs', null, 2016, 'Calculus-based university physics volume 1.', ['Physics'], ['MBBS Year 1'], 'Science', 'CC_BY_NC_SA', 'https://assets.openstax.org/oscms-prodcms/media/documents/university-physics-volume-1_-_WEB.pdf'),
  os('concepts-biology', 'Concepts of Biology', 'Samantha Fowler, Rebecca Roush, James Wise', null, 2016, 'Introductory biology for nonmajors.', ['Biology'], ['MBBS Year 1'], 'Science', 'CC_BY_NC_SA', 'https://assets.openstax.org/oscms-prodcms/media/documents/Concepts-Biology_-_WEB.pdf'),
  os('lifespan-development', 'Lifespan Development', 'OpenStax', null, 2024, 'Lifespan development psychology textbook.', ['Psychology', 'Human Development'], ['Nursing'], 'Social Sciences', 'CC_BY_NC_SA', 'https://assets.openstax.org/oscms-prodcms/media/documents/Lifespan_Development_-_WEB.pdf'),
  os('college-algebra-2e', 'College Algebra 2e', 'Jay Abramson', '2e', 2021, 'College algebra textbook.', ['Mathematics'], ['MBBS Year 1'], 'Mathematics', 'CC_BY_NC_SA', 'https://assets.openstax.org/oscms-prodcms/media/documents/college-algebra-2e_-_WEB.pdf'),
  os('precalculus-2e', 'Precalculus 2e', 'OpenStax', '2e', 2021, 'Precalculus textbook.', ['Mathematics'], ['MBBS Year 1'], 'Mathematics', 'CC_BY_NC_SA', 'https://assets.openstax.org/oscms-prodcms/media/documents/precalculus-2e_-_WEB.pdf'),
  os('principles-financial-accounting', 'Principles of Accounting, Volume 1: Financial Accounting', 'OpenStax', null, 2019, 'Financial accounting textbook volume 1.', ['Accounting'], ['MBBS Year 1'], 'Business', 'CC_BY_NC_SA', 'https://assets.openstax.org/oscms-prodcms/media/documents/principles-financial-accounting_-_WEB.pdf'),
  os('principles-management', 'Principles of Management', 'David S. Bright, Anastasia H. Cortes', null, 2019, 'Principles of management textbook.', ['Management'], ['MBBS Year 1'], 'Business', 'CC_BY_NC_SA', 'https://assets.openstax.org/oscms-prodcms/media/documents/principles-management_-_WEB.pdf'),
  os('principles-marketing', 'Principles of Marketing', 'OpenStax', null, 2023, 'Principles of marketing textbook.', ['Marketing'], ['MBBS Year 1'], 'Business', 'CC_BY_NC_SA', 'https://assets.openstax.org/oscms-prodcms/media/documents/principles-marketing_-_WEB.pdf'),
  os('principles-finance-2e', 'Principles of Finance 2e', 'OpenStax', '2e', 2026, 'Principles of finance textbook.', ['Finance'], ['MBBS Year 1'], 'Business', 'CC_BY_NC_SA', 'https://assets.openstax.org/oscms-prodcms/media/documents/Principles_of_Finance_2e_-_WEB_.pdf'),
  os('principles-economics-3e', 'Principles of Economics 3e', 'Steven A. Greenlaw, David Shapiro, Timothy Taylor', '3e', 2022, 'Principles of economics textbook.', ['Economics'], ['MBBS Year 1'], 'Social Sciences', 'CC_BY_NC_SA', 'https://assets.openstax.org/oscms-prodcms/media/documents/principles-economics-3e_-_WEB.pdf'),
  os('us-history', 'U.S. History', 'P. Scott Corbett, Volker Janssen, John M. Lund, et al.', null, 2016, 'U.S. History textbook.', ['History'], ['MBBS Year 1'], 'Humanities', 'CC_BY_NC_SA', 'https://assets.openstax.org/oscms-prodcms/media/documents/US_History_-_WEB.pdf'),
  os('writing-guide', 'Writing Guide with Handbook', 'OpenStax', null, 2021, 'Writing guide with handbook.', ['Writing'], ['MBBS Year 1'], 'Humanities', 'CC_BY_NC_SA', 'https://assets.openstax.org/oscms-prodcms/media/documents/WritingGuide-WEB.pdf'),
  os('introduction-political-science', 'Introduction to Political Science', 'OpenStax', null, 2022, 'Introduction to political science textbook.', ['Political Science'], ['MBBS Year 1'], 'Social Sciences', 'CC_BY_NC_SA', 'https://assets.openstax.org/oscms-prodcms/media/documents/Introduction_to_Political_Science_-_WEB.pdf'),
  os('organizational-behavior', 'Organizational Behavior', 'OpenStax', null, 2019, 'Organizational behavior textbook.', ['Management', 'Organizational Behavior'], ['MBBS Year 1'], 'Business', 'CC_BY_NC_SA', 'https://assets.openstax.org/oscms-prodcms/media/documents/organizational-behavior_-_WEB.pdf'),
  os('statistics', 'Statistics', 'OpenStax', null, 2020, 'Introductory statistics textbook.', ['Statistics'], ['MBBS Year 1'], 'Mathematics', 'CC_BY', 'https://assets.openstax.org/oscms-prodcms/media/documents/high-school-statistics_-_WEB.pdf'),
  os('introductory-statistics-2e', 'Introductory Statistics 2e', 'Barbara Illowsky, Susan Dean', '2e', 2023, 'Introductory statistics textbook.', ['Statistics'], ['MBBS Year 1'], 'Mathematics', 'CC_BY_NC_SA', 'https://assets.openstax.org/oscms-prodcms/media/documents/introductory-statistics-2e_-_WEB.pdf'),
  os('introduction-sociology-3e', 'Introduction to Sociology 3e', 'Nathan J. Keirns, Heather Griffiths, Eric Strayer, et al.', '3e', 2021, 'Introduction to sociology textbook.', ['Sociology'], ['MBBS Year 1'], 'Social Sciences', 'CC_BY_NC_SA', 'https://assets.openstax.org/oscms-prodcms/media/documents/introduction-sociology-3e_-_WEB.pdf'),
];

// Existing verified OTL books (non-OpenStax) - keep as-is with category added
const otlBooks = [
  {
    title: 'Nursing Pharmacology',
    authors: 'Chippewa Valley Technical College',
    edition: null,
    year: 2020,
    description: 'Open access nursing pharmacology textbook for entry-level undergraduate nursing students explaining basic pharmacology concepts and common medication classes.',
    cover_url: null,
    subjects: ['Pharmacology', 'Nursing'],
    courses: ['Nursing', 'MBBS Year 1'],
    category: 'Medicine and Health',
    featured: true,
    sources: [{
      source_name: 'Open Textbook Library',
      base_url: 'https://open.umn.edu/opentextbooks',
      official_url: 'https://open.umn.edu/opentextbooks/textbooks/nursing-pharmacology',
      license: 'CC BY 4.0',
      license_url: 'https://creativecommons.org/licenses/by/4.0/',
      access_type: 'free'
    }, {
      source_name: 'WisTech Open (Pressbooks)',
      base_url: 'https://wtcs.pressbooks.pub',
      official_url: 'https://wtcs.pressbooks.pub/pharmacology/',
      license: 'CC BY 4.0',
      license_url: 'https://creativecommons.org/licenses/by/4.0/',
      access_type: 'free'
    }]
  },
  {
    title: 'Nursing Skills',
    authors: 'Kimberly Ernstmeyer, Elizabeth Christman',
    edition: null,
    year: 2021,
    description: 'Open access nursing skills textbook covering physical assessments and basic nursing skills for entry-level nursing students.',
    cover_url: null,
    subjects: ['Nursing', 'Clinical Skills'],
    courses: ['Nursing', 'MBBS Year 1'],
    category: 'Nursing',
    featured: true,
    sources: [{
      source_name: 'Open Textbook Library',
      base_url: 'https://open.umn.edu/opentextbooks',
      official_url: 'https://open.umn.edu/opentextbooks/textbooks/nursing-skills',
      license: 'CC BY 4.0',
      license_url: 'https://creativecommons.org/licenses/by/4.0/',
      access_type: 'free'
    }, {
      source_name: 'WisTech Open (Pressbooks)',
      base_url: 'https://wtcs.pressbooks.pub',
      official_url: 'https://wtcs.pressbooks.pub/nursingskills/',
      license: 'CC BY 4.0',
      license_url: 'https://creativecommons.org/licenses/by/4.0/',
      access_type: 'free'
    }]
  },
  {
    title: 'Nursing Fundamentals',
    authors: 'Kimberly Ernstmeyer, Elizabeth Christman',
    edition: '2e',
    year: 2024,
    description: 'Foundational nursing practice textbook covering communication, safety, and core nursing concepts using the nursing process.',
    cover_url: null,
    subjects: ['Nursing', 'Fundamentals of Nursing'],
    courses: ['Nursing', 'MBBS Year 1'],
    category: 'Nursing',
    featured: true,
    sources: [{
      source_name: 'Open Textbook Library',
      base_url: 'https://open.umn.edu/opentextbooks',
      official_url: 'https://open.umn.edu/opentextbooks/textbooks/nursing-fundamentals',
      license: 'CC BY 4.0',
      license_url: 'https://creativecommons.org/licenses/by/4.0/',
      access_type: 'free'
    }, {
      source_name: 'WisTech Open (Pressbooks)',
      base_url: 'https://wtcs.pressbooks.pub',
      official_url: 'https://wtcs.pressbooks.pub/nursingfundamentals/',
      license: 'CC BY 4.0',
      license_url: 'https://creativecommons.org/licenses/by/4.0/',
      access_type: 'free'
    }]
  },
  {
    title: 'Nursing Care at the End of Life: What Every Clinician Should Know',
    authors: 'Susan E. Lowey',
    edition: null,
    year: 2015,
    description: 'Textbook on end-of-life nursing care covering palliative care, communication, symptom management, ethics, and bereavement.',
    cover_url: null,
    subjects: ['Nursing', 'Palliative Care'],
    courses: ['Nursing', 'MBBS Year 2'],
    category: 'Medicine and Health',
    featured: true,
    sources: [{
      source_name: 'Open Textbook Library',
      base_url: 'https://open.umn.edu/opentextbooks',
      official_url: 'https://open.umn.edu/opentextbooks/textbooks/nursing-care-at-the-end-of-life-what-every-clinician-should-know',
      license: 'CC BY-NC-SA 4.0',
      license_url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
      access_type: 'free'
    }, {
      source_name: 'Milne Open Textbooks (Open SUNY)',
      base_url: 'https://milneopentextbooks.org',
      official_url: 'https://milneopentextbooks.org/nursing-care-at-the-end-of-life/',
      license: 'CC BY-NC-SA 4.0',
      license_url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
      access_type: 'free'
    }]
  },
  {
    title: 'Clinical Procedures for Safer Patient Care',
    authors: 'Glynda Rees Doyle, Jodie Anita McCutcheon',
    edition: null,
    year: 2015,
    description: 'Checklist-based textbook covering standardized clinical nursing procedures to support safe patient care.',
    cover_url: null,
    subjects: ['Nursing', 'Clinical Skills'],
    courses: ['Nursing', 'MBBS Year 1'],
    category: 'Medicine and Health',
    featured: true,
    sources: [{
      source_name: 'Open Textbook Library',
      base_url: 'https://open.umn.edu/opentextbooks',
      official_url: 'https://open.umn.edu/opentextbooks/textbooks/clinical-procedures-for-safer-patient-care',
      license: 'CC BY 4.0',
      license_url: 'https://creativecommons.org/licenses/by/4.0/',
      access_type: 'free'
    }, {
      source_name: 'BCcampus Open Publishing',
      base_url: 'https://opentextbc.ca',
      official_url: 'https://opentextbc.ca/clinicalskills/',
      license: 'CC BY 4.0',
      license_url: 'https://creativecommons.org/licenses/by/4.0/',
      access_type: 'free'
    }]
  }
];

const allBooks = [...otlBooks, ...openStaxBooks];
const outPath = path.join(__dirname, 'books.json');
fs.writeFileSync(outPath, JSON.stringify(allBooks, null, 2) + '\n');
console.log(`Wrote ${allBooks.length} books (${otlBooks.length} OTL + ${openStaxBooks.length} OpenStax)`);
console.log('Categories:', CATEGORIES.join(', '));
