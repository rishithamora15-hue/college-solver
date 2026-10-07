// Student navigation: one sidebar entry per section; the pages inside a section share a tab bar.
export const SECTIONS = {
  academics: [['/academics', 'Timetable & marks'], ['/learn', 'Study & AI tutor']],
  prep: [['/prep', 'Learning path'], ['/prep/aptitude', 'Aptitude'], ['/prep/communication', 'Communication'], ['/prep/coding', 'Coding & technical'],
    ['/prep/interview', 'Interview'], ['/prep/quiz', 'Quiz & tracker']],
  career: [['/jobs', 'Opportunities'], ['/career', 'Resume & job match']],
  office: [['/fees', 'Fees & scholarships'], ['/requests', 'Certificates & leave'], ['/complaints', 'Complaints']],
} satisfies Record<string, [string, string][]>;
export type Section = keyof typeof SECTIONS;

/** [href, label, other paths that belong to the same entry]. */
export const STUDENT_NAV: [string, string, string[]][] = [
  ['/', 'Overview', []],
  ['/academics', 'Academics', ['/learn']],
  ['/prep', 'Skill prep', []],
  ['/jobs', 'Career & jobs', ['/career']],
  ['/fees', 'Fees & requests', ['/requests', '/complaints', '/receipts']],
];
