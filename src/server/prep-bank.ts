// Placement-prep content: learning paths, LMS modules and practice questions of the kinds most often repeated in
// campus selection rounds (online tests, group discussions, technical and HR interviews). Authored for this app;
// no company is claimed as the source. Answers are graded on the server; `answer` and `why` never reach the browser
// before the student answers. Never change what an existing question id asks: graded answers point at it. Add a new id.

export type Track = 'aptitude' | 'communication' | 'coding' | 'interview';
export const TRACKS: Record<Track, string> = { aptitude: 'Aptitude', communication: 'Communication', coding: 'Coding & technical', interview: 'Interview' };

/** Readiness areas. Each practice track feeds one area; resume is scored from the confirmed resume. */
export type Dim = 'technical' | 'aptitude' | 'communication' | 'interview' | 'resume';

export type Round = 'Online test' | 'Technical interview' | 'HR interview' | 'Group discussion';
export type Question = { id: string; q: string; code?: string; options: string[]; answer: number; why: string; round?: Round };
export type Module = { id: string; track: Track; title: string; round: Round; lesson: string[]; note?: string; questions: Question[] };

export type PathId = 'software' | 'data' | 'qa' | 'business';
/** weights sum to 100. skills must be words the resume matcher knows (career.ts SKILLS). modules = course order. */
export type Path = { label: string; blurb: string; weights: Record<Dim, number>; skills: string[]; modules: string[] };

export const PATHS: Record<PathId, Path> = {
  software: {
    label: 'Software Developer', blurb: 'Product and service companies: coding rounds, DSA and CS fundamentals.',
    weights: { technical: 35, aptitude: 20, communication: 15, interview: 15, resume: 15 },
    skills: ['python', 'java', 'c', 'c++', 'javascript', 'typescript', 'sql', 'git', 'react', 'node.js', 'html', 'css', 'docker', 'linux', 'aws'],
    modules: ['apt-arith', 'apt-time', 'apt-reason', 'apt-prob', 'com-grammar', 'com-vocab', 'com-email', 'com-speaking',
      'cod-dsa', 'cod-algo', 'cod-output', 'cod-oop', 'cod-sql', 'cod-core', 'int-hr', 'int-star', 'int-etiquette'],
  },
  data: {
    label: 'Data Analyst', blurb: 'SQL, statistics, spreadsheets and explaining numbers to people.',
    weights: { technical: 30, aptitude: 25, communication: 15, interview: 15, resume: 15 },
    skills: ['sql', 'python', 'excel', 'statistics', 'power bi', 'tableau', 'data analysis', 'machine learning'],
    modules: ['apt-arith', 'apt-time', 'apt-reason', 'apt-prob', 'apt-di', 'com-grammar', 'com-vocab', 'com-email', 'com-client',
      'cod-sql', 'cod-stats', 'cod-excel', 'cod-output', 'cod-algo', 'int-hr', 'int-star', 'int-etiquette'],
  },
  qa: {
    label: 'QA / Test Engineer', blurb: 'Testing concepts, SQL and enough code to read and break it.',
    weights: { technical: 30, aptitude: 20, communication: 20, interview: 15, resume: 15 },
    skills: ['testing', 'sql', 'python', 'java', 'git', 'linux'],
    modules: ['apt-arith', 'apt-time', 'apt-reason', 'com-grammar', 'com-vocab', 'com-email', 'com-speaking',
      'cod-testing', 'cod-sql', 'cod-output', 'cod-dsa', 'cod-oop', 'int-hr', 'int-star', 'int-etiquette'],
  },
  business: {
    label: 'Business & Operations (non-IT)', blurb: 'Banking, sales, operations and supply chain: aptitude, communication, Excel.',
    weights: { technical: 15, aptitude: 25, communication: 30, interview: 15, resume: 15 },
    skills: ['excel', 'communication', 'negotiation', 'power bi', 'data analysis'],
    modules: ['apt-arith', 'apt-time', 'apt-reason', 'apt-di', 'com-grammar', 'com-vocab', 'com-email', 'com-speaking', 'com-client',
      'cod-excel', 'int-hr', 'int-star', 'int-etiquette'],
  },
};

const SALES = `Sales of a shop (₹ lakh)
Year   Mobiles   Laptops
2022     40        60
2023     50        75
2024     60        90`;

export const MODULES: Module[] = [
  // ---------- Aptitude
  {
    id: 'apt-arith', track: 'aptitude', title: 'Percentages, profit, interest and averages', round: 'Online test',
    lesson: [
      'x% of y = y% of x. Use whichever is easier: 8% of 50 = 50% of 8 = 4.',
      'Successive changes of a% and b%: net = a + b + ab/100. +20% then −20% gives −4%.',
      'Profit % = (SP − CP) / CP × 100. It is on cost price unless the question says otherwise.',
      'Simple interest = P × R × T / 100. Compound amount = P × (1 + R/100)^T.',
      'Average = sum / count. If one item is removed, removed item = old sum − new sum.',
      'Share of a in ratio a:b:c of a total T = T × a / (a + b + c).',
    ],
    questions: [
      { id: 'apt-arith.1', q: 'The price of a laptop rises by 20% and then falls by 20%. What is the net change?', options: ['No change', '4% increase', '4% decrease', '2% decrease'], answer: 2, why: 'Net = 20 − 20 + (20 × −20)/100 = −4%. Check: 100 → 120 → 96.' },
      { id: 'apt-arith.2', q: 'A shopkeeper buys an item for ₹400 and sells it for ₹500. What is the profit percentage?', options: ['20%', '25%', '30%', '100%'], answer: 1, why: 'Profit 100 on a cost of 400 = 25%. 20% is the common mistake of dividing by the selling price.' },
      { id: 'apt-arith.3', q: 'What is the simple interest on ₹5,000 at 8% per year for 3 years?', options: ['₹1,200', '₹1,000', '₹1,260', '₹1,500'], answer: 0, why: '5000 × 8 × 3 / 100 = 1,200.' },
      { id: 'apt-arith.4', q: 'What is the compound interest on ₹10,000 at 10% per year for 2 years, compounded yearly?', options: ['₹2,000', '₹2,210', '₹1,100', '₹2,100'], answer: 3, why: 'Amount = 10000 × 1.1² = 12,100, so interest = 2,100. It beats simple interest by ₹100 because year-1 interest earns interest in year 2.' },
      { id: 'apt-arith.5', q: 'Divide ₹1,200 among A, B and C in the ratio 2:3:5. What is C\'s share?', options: ['₹240', '₹360', '₹500', '₹600'], answer: 3, why: '10 parts in all; C gets 1200 × 5/10 = 600.' },
      { id: 'apt-arith.6', q: 'The average of 5 numbers is 20. When one number is removed, the average of the rest is 18. Which number was removed?', options: ['18', '28', '22', '30'], answer: 1, why: 'Old sum 100, new sum 4 × 18 = 72, so the removed number is 28.' },
      { id: 'apt-arith.7', q: 'A father is three times as old as his son. In 15 years he will be twice as old as his son. How old is the son now?', options: ['15', '10', '12', '20'], answer: 0, why: 'Son s, father 3s: 3s + 15 = 2(s + 15), so s = 15.' },
      { id: 'apt-arith.8', q: 'What is 15% of 40% of 500?', options: ['20', '60', '30', '35'], answer: 2, why: '40% of 500 = 200; 15% of 200 = 30.' },
    ],
  },
  {
    id: 'apt-time', track: 'aptitude', title: 'Time, speed and work', round: 'Online test',
    lesson: [
      'km/h to m/s: multiply by 5/18. m/s to km/h: multiply by 18/5.',
      'A train passing a pole covers its own length. Passing a platform, it covers train + platform.',
      'Average speed over equal distances at a and b = 2ab / (a + b), not (a + b) / 2.',
      'Downstream speed = boat + stream. Upstream speed = boat − stream.',
      'Work: if A takes a days, A does 1/a of the job per day. Add rates to work together; subtract a pipe that empties.',
    ],
    questions: [
      { id: 'apt-time.1', q: 'A 150 m long train passes a pole in 15 seconds. What is its speed in km/h?', options: ['10', '54', '40', '36'], answer: 3, why: '150/15 = 10 m/s; 10 × 18/5 = 36 km/h.' },
      { id: 'apt-time.2', q: 'A can finish a job in 10 days and B in 15 days. How long will they take working together?', options: ['5 days', '6 days', '8 days', '12.5 days'], answer: 1, why: '1/10 + 1/15 = 5/30 = 1/6 of the job per day, so 6 days.' },
      { id: 'apt-time.3', q: 'A car goes from A to B at 60 km/h and returns at 40 km/h. What is its average speed for the round trip?', options: ['48 km/h', '50 km/h', '45 km/h', '52 km/h'], answer: 0, why: '2 × 60 × 40 / (60 + 40) = 48. The car spends longer at the slower speed, so it is below 50.' },
      { id: 'apt-time.4', q: 'A boat moves at 10 km/h in still water and the stream flows at 2 km/h. How long does it take to go 36 km downstream?', options: ['3.6 hours', '4.5 hours', '3 hours', '6 hours'], answer: 2, why: 'Downstream speed = 12 km/h; 36 / 12 = 3 hours.' },
      { id: 'apt-time.5', q: 'Pipe A fills a tank in 6 hours and pipe B empties it in 8 hours. With both open on an empty tank, how long does it take to fill?', options: ['12 hours', '14 hours', '48 hours', '24 hours'], answer: 3, why: '1/6 − 1/8 = 1/24 of the tank per hour.' },
      { id: 'apt-time.6', q: 'A 200 m train running at 72 km/h crosses a 300 m platform. How long does it take?', options: ['10 s', '25 s', '20 s', '30 s'], answer: 1, why: '72 km/h = 20 m/s; it covers 200 + 300 = 500 m; 500 / 20 = 25 s.' },
    ],
  },
  {
    id: 'apt-reason', track: 'aptitude', title: 'Logical reasoning', round: 'Online test',
    lesson: [
      'Number series: check differences first, then differences of differences, then ratios, squares and cubes.',
      'Coding–decoding: write letter positions (A = 1 … Z = 26) and look for a shift or a sum.',
      'Blood relations: draw a small family tree. Mark male and female.',
      'Directions: sketch every turn. A right turn from north faces east. Use Pythagoras for straight-line distance.',
      'Syllogisms: draw circles. "Some" only guarantees an overlap between the two groups it names.',
      'Clock angle = |30H − 5.5M| degrees. A normal year moves the weekday by 1, a leap year by 2.',
    ],
    questions: [
      { id: 'apt-reason.1', q: 'Find the next number: 2, 6, 12, 20, 30, ?', options: ['40', '36', '42', '44'], answer: 2, why: 'Differences are 4, 6, 8, 10, 12, so 30 + 12 = 42. (Each term is n × (n + 1).)' },
      { id: 'apt-reason.2', q: 'If CAT is coded as 24 (C = 3, A = 1, T = 20), how is DOG coded?', options: ['26', '24', '27', '30'], answer: 0, why: 'D = 4, O = 15, G = 7; 4 + 15 + 7 = 26.' },
      { id: 'apt-reason.3', q: 'Pointing to a man, a woman says, "His mother is the only daughter of my mother." How is the woman related to the man?', options: ['Sister', 'Mother', 'Aunt', 'Grandmother'], answer: 1, why: 'The only daughter of her mother is the woman herself, so she is his mother.' },
      { id: 'apt-reason.4', q: 'Ravi walks 10 m north, turns right and walks 5 m, then turns right again and walks 10 m. How far is he from where he started?', options: ['10 m', '15 m', '25 m', '5 m'], answer: 3, why: 'North 10 and south 10 cancel out; he ends 5 m east of the start.' },
      { id: 'apt-reason.5', q: 'Statements: All roses are flowers. Some flowers fade quickly. Conclusion: Some roses fade quickly.', options: ['The conclusion follows', 'The conclusion does not follow', 'Only the first statement is needed', 'The statements contradict each other'], answer: 1, why: 'The flowers that fade quickly might not include any roses, so the conclusion is not certain.' },
      { id: 'apt-reason.6', q: 'What is the angle between the hour and minute hands at 3:15?', options: ['0°', '15°', '7.5°', '22.5°'], answer: 2, why: '|30 × 3 − 5.5 × 15| = |90 − 82.5| = 7.5°. The hour hand has moved past the 3.' },
      { id: 'apt-reason.7', q: '1 January 2025 was a Wednesday. What day was 1 January 2026?', options: ['Thursday', 'Wednesday', 'Friday', 'Tuesday'], answer: 0, why: '2025 is not a leap year: 365 days = 52 weeks + 1 day, so the weekday moves on by one.' },
    ],
  },
  {
    id: 'apt-prob', track: 'aptitude', title: 'Probability and counting', round: 'Online test',
    lesson: [
      'Probability = favourable outcomes / total outcomes. Two dice have 6 × 6 = 36 outcomes.',
      'Arrangements of n different items = n!. If items repeat, divide by the factorial of each repeat count.',
      'Choosing r of n when order does not matter: nCr = n! / (r! × (n − r)!).',
      'P(at least one) = 1 − P(none).',
    ],
    questions: [
      { id: 'apt-prob.1', q: 'Two fair dice are thrown. What is the probability that the sum is 7?', options: ['1/12', '7/36', '1/9', '1/6'], answer: 3, why: '(1,6), (2,5), (3,4), (4,3), (5,2), (6,1): 6 of 36 = 1/6.' },
      { id: 'apt-prob.2', q: 'In how many ways can the letters of the word LEVEL be arranged?', options: ['120', '60', '30', '20'], answer: 2, why: '5! / (2! × 2!) = 120 / 4 = 30. L and E each appear twice.' },
      { id: 'apt-prob.3', q: 'A committee of 3 is chosen from 5 people. How many different committees are possible?', options: ['10', '15', '20', '60'], answer: 0, why: '5C3 = 10. Order does not matter, so it is not 5 × 4 × 3 = 60.' },
      { id: 'apt-prob.4', q: 'A coin is tossed 3 times. What is the probability of at least one head?', options: ['1/8', '7/8', '3/8', '1/2'], answer: 1, why: '1 − P(no heads) = 1 − 1/8 = 7/8.' },
    ],
  },
  {
    id: 'apt-di', track: 'aptitude', title: 'Data interpretation', round: 'Online test',
    lesson: [
      'Read the units, the base year and what each row means before calculating anything.',
      'Percentage change = (new − old) / old × 100.',
      'Share of the total = part / total × 100. Approximate first, then pick the nearest option.',
      'In a pie chart, angle = share × 360°.',
    ],
    questions: [
      { id: 'apt-di.1', q: 'By what percentage did laptop sales grow from 2022 to 2024?', code: SALES, options: ['30%', '45%', '60%', '50%'], answer: 3, why: '(90 − 60) / 60 × 100 = 50%.' },
      { id: 'apt-di.2', q: 'In 2023, what share of total sales came from mobiles?', code: SALES, options: ['40%', '45%', '50%', '60%'], answer: 0, why: '50 / (50 + 75) = 50 / 125 = 40%.' },
      { id: 'apt-di.3', q: 'What were the average yearly mobile sales over the three years?', code: SALES, options: ['₹55 lakh', '₹60 lakh', '₹45 lakh', '₹50 lakh'], answer: 3, why: '(40 + 50 + 60) / 3 = 50.' },
      { id: 'apt-di.4', q: 'A pie chart of a ₹2,00,000 monthly budget shows rent as 72°. How much is the rent?', options: ['₹20,000', '₹40,000', '₹36,000', '₹72,000'], answer: 1, why: '72 / 360 = 20%; 20% of 2,00,000 = 40,000.' },
    ],
  },

  // ---------- Communication
  {
    id: 'com-grammar', track: 'communication', title: 'Grammar and sentence correction', round: 'Online test',
    lesson: [
      'Singular subjects take singular verbs: "Each of the students has…", "Everyone is…".',
      'With "neither … nor" and "either … or", the verb agrees with the nearer subject.',
      'Use "an" before a vowel sound: an honest man, a university.',
      'Past perfect (had + past participle) marks the earlier of two past actions.',
      'Active to passive: the object becomes the subject — "The report was approved by the manager."',
      'Reported speech moves the tense back: "I am busy" → he said that he was busy.',
    ],
    questions: [
      { id: 'com-grammar.1', q: 'Choose the correct sentence.', options: ['He don\'t know the answer.', 'He doesn\'t knows the answer.', 'He doesn\'t know the answer.', 'He not know the answer.'], answer: 2, why: 'Third person singular takes "does not" followed by the base verb.' },
      { id: 'com-grammar.2', q: 'Neither the manager nor the employees ___ present at the meeting.', options: ['were', 'was', 'is', 'has been'], answer: 0, why: 'The verb agrees with the nearer subject, "employees", which is plural.' },
      { id: 'com-grammar.3', q: 'Find the error: "Each of the students / have submitted / their assignment."', options: ['Each of the students', 'have submitted', 'their assignment', 'No error'], answer: 1, why: '"Each" is singular, so it should be "has submitted".' },
      { id: 'com-grammar.4', q: 'He is ___ honest man.', options: ['a', 'the', 'an', 'no article'], answer: 2, why: 'The h in "honest" is silent, so the word starts with a vowel sound.' },
      { id: 'com-grammar.5', q: 'By the time we reached the hall, the presentation ___.', options: ['started', 'has started', 'was start', 'had started'], answer: 3, why: 'The presentation started before we reached: the earlier past action takes past perfect.' },
      { id: 'com-grammar.6', q: 'Change to passive voice: "The manager approved the report."', options: ['The report is approved by the manager.', 'The report was approved by the manager.', 'The report had approved the manager.', 'The manager was approved by the report.'], answer: 1, why: 'Keep the past tense: approved → was approved.' },
      { id: 'com-grammar.7', q: 'Choose the reported form of: He said, "I am busy today."', options: ['He said that he was busy that day.', 'He said that he is busy today.', 'He said that I was busy today.', 'He told that he is busy.'], answer: 0, why: '"am" becomes "was", "I" becomes "he" and "today" becomes "that day".' },
      { id: 'com-grammar.8', q: 'She is good ___ mathematics.', options: ['in', 'on', 'at', 'with'], answer: 2, why: 'The fixed phrase is "good at".' },
    ],
  },
  {
    id: 'com-vocab', track: 'communication', title: 'Vocabulary', round: 'Online test',
    lesson: [
      'Learn words in pairs, with a synonym and an antonym: diligent / lazy.',
      'Commonly confused: affect (verb) and effect (noun); principal and principle; complement and compliment.',
      'Idioms and one-word substitutions appear in most verbal sections. Learn the common ones.',
      'Read one editorial a day and note five new words, each with your own example sentence.',
    ],
    questions: [
      { id: 'com-vocab.1', q: 'Choose the word closest in meaning to DILIGENT.', options: ['Lazy', 'Intelligent', 'Careless', 'Hardworking'], answer: 3, why: 'Diligent means careful and hardworking.' },
      { id: 'com-vocab.2', q: 'Choose the word opposite in meaning to TRANSPARENT.', options: ['Opaque', 'Clear', 'Honest', 'Visible'], answer: 0, why: 'Opaque means light cannot pass through.' },
      { id: 'com-vocab.3', q: 'The new policy will ___ all employees.', options: ['effect', 'affect', 'infect', 'afect'], answer: 1, why: '"Affect" is the verb (to influence). "Effect" is usually the noun (the result).' },
      { id: 'com-vocab.4', q: 'What does the idiom "break the ice" mean?', options: ['To end a friendship', 'To make a mistake', 'To start a conversation in an awkward or new situation', 'To cancel a plan'], answer: 2, why: 'It means easing the first awkwardness when people meet.' },
      { id: 'com-vocab.5', q: 'One word for "a person who can speak two languages":', options: ['Polyglot', 'Bilingual', 'Linguist', 'Bilateral'], answer: 1, why: 'A polyglot speaks many languages; a linguist studies language.' },
      { id: 'com-vocab.6', q: 'Choose the correctly spelled word.', options: ['Occured', 'Ocurred', 'Occurrd', 'Occurred'], answer: 3, why: 'Double c and double r: occurred.' },
    ],
  },
  {
    id: 'com-email', track: 'communication', title: 'Professional email and writing', round: 'Online test',
    lesson: [
      'Subject line = purpose + key detail: "Leave request: 12–13 March (Asha, CSE-A)".',
      'Open with "Dear Mr./Ms. <surname>", or "Dear Hiring Manager" when you do not know the name.',
      'One purpose per email: context, request, deadline, thanks.',
      'Bad news: own it, give a new date and say what you are doing about it. No excuses in the first line.',
      'Reply-all only when everyone needs the reply. Never forward private information without asking.',
    ],
    questions: [
      { id: 'com-email.1', q: 'Which subject line is best for a leave request to your class teacher?', options: ['Leave', 'Hi sir', 'URGENT!!! please read', 'Leave request: 12–13 March (Asha, CSE-A)'], answer: 3, why: 'It says what you need, for which dates and who you are.' },
      { id: 'com-email.2', q: 'You are emailing a company but do not know the recruiter\'s name. How should you begin?', options: ['Dear Hiring Manager,', 'Hey there,', 'Hi dude,', 'Respected all!!'], answer: 0, why: 'Formal and correct when the name is unknown.' },
      { id: 'com-email.3', q: 'You will miss a project deadline by two days. Which message is most professional?', options: ['Sorry, it is not done. Will send later.', 'The deadline was unrealistic anyway.', 'The report will be two days late because of a data issue. I will share it by Thursday 5 pm and send a partial draft today.', 'Say nothing until it is finished.'], answer: 2, why: 'It owns the delay, gives a firm new date and offers something useful now.' },
      { id: 'com-email.4', q: 'Which closing suits a formal email to an interviewer?', options: ['Cya!', 'Bye', 'Waiting for reply asap', 'Thanks and regards, Asha'], answer: 3, why: 'Polite, standard and signed with your name.' },
    ],
  },
  {
    id: 'com-speaking', track: 'communication', title: 'Speaking, group discussion and calls', round: 'Group discussion',
    lesson: [
      'Group discussion: open with a definition or a fact, add one new point each turn, and help summarise at the end.',
      'Enter a crowded discussion by acknowledging the last speaker: "Building on Ravi\'s point…".',
      'On calls, paraphrase to confirm: "So the deadline is Friday 5 pm — is that right?"',
      'Speak in short sentences. Pause instead of saying "umm". Keep answers under two minutes.',
    ],
    questions: [
      { id: 'com-speaking.1', q: 'In a group discussion two people keep talking over everyone. What is the best way to make your point?', options: ['Raise your voice above them', 'Wait for a pause, acknowledge the last point and add a new one', 'Stay silent till the end', 'Tell them they are being rude'], answer: 1, why: 'Evaluators look for listening and adding value, not volume.' },
      { id: 'com-speaking.2', q: 'During a client call you did not understand a requirement. What should you do?', options: ['Agree and figure it out later', 'Guess the most likely meaning', 'Ask them to email everything and end the call', 'Paraphrase what you heard and ask them to confirm'], answer: 3, why: 'Paraphrasing catches misunderstandings while the client is still on the call.', round: 'HR interview' },
      { id: 'com-speaking.3', q: 'What is a strong way to open a group discussion on "Remote work"?', options: ['Give a short definition or a relevant fact, then your stand', '"I agree with everyone."', 'Start with an unrelated joke', 'Ask the moderator which side to take'], answer: 0, why: 'A clear frame gives the group direction and shows preparation.' },
      { id: 'com-speaking.4', q: 'What should the closing summary of a group discussion do?', options: ['Repeat only your own points', 'Introduce a completely new topic', 'Fairly combine the main points from both sides', 'Declare a winner'], answer: 2, why: 'A balanced summary shows you listened to the whole group.' },
    ],
  },
  {
    id: 'com-client', track: 'communication', title: 'Stakeholder and client communication', round: 'HR interview',
    lesson: [
      'Lead with the answer, then the evidence: "Sales fell 8% in March, mainly in two stores."',
      'Turn numbers into decisions for listeners who are not technical.',
      'Negotiation: understand what the other side needs, offer options, and confirm next steps in writing.',
      'Complaints: listen, acknowledge, act, follow up.',
    ],
    questions: [
      { id: 'com-client.1', q: 'Your manager asks for the result of your analysis in a meeting. How should you start?', options: ['Explain every step of the method first', 'State the key finding and its impact, then the evidence', 'Share the raw data and let them read it', 'Say the analysis is too complex to summarise'], answer: 1, why: 'Busy listeners need the conclusion first; details follow if asked.' },
      { id: 'com-client.2', q: 'An angry customer calls about a delayed delivery. What is the best first step?', options: ['Quote company policy immediately', 'Transfer the call', 'Listen fully and acknowledge the problem', 'Promise a full refund straight away'], answer: 2, why: 'People calm down when they feel heard; then you can act.' },
      { id: 'com-client.3', q: 'In a negotiation a client asks for a 20% discount you cannot give. What is a good response?', options: ['Offer an alternative, such as a smaller discount for a longer contract', 'Say no and end the call', 'Agree to avoid conflict', 'Ignore the request'], answer: 0, why: 'Options keep the conversation going without giving away what you cannot.' },
    ],
  },

  // ---------- Coding & technical
  {
    id: 'cod-dsa', track: 'coding', title: 'Arrays, strings, linked lists and hashing', round: 'Technical interview',
    lesson: [
      'A hash map or set gives O(1) average lookup. It is the usual fix for "find a pair", "find duplicates" and "count frequency".',
      'Two pointers: palindromes, reversing, merging sorted arrays, pair sums in a sorted array.',
      'Stack: matching brackets, undo, next greater element. Queue: BFS, scheduling.',
      'Linked list: slow and fast pointers find the middle and detect cycles; reverse with three pointers in O(1) space.',
      'Kadane\'s algorithm: keep the best sum ending at each index; restart from the current element when the running sum hurts.',
    ],
    questions: [
      { id: 'cod-dsa.1', q: 'Two Sum: find two indices whose values add up to a target. What is the optimal approach?', options: ['Check every pair — O(n²)', 'Sort, then binary-search for each element — O(n log n)', 'Recursion over all subsets — O(2ⁿ)', 'One pass with a hash map of value → index — O(n)'], answer: 3, why: 'For each x, check whether target − x is already in the map, then store x.' },
      { id: 'cod-dsa.2', q: 'Which data structure checks whether brackets such as "({[]})" are balanced?', options: ['Queue', 'Stack', 'Heap', 'Hash set'], answer: 1, why: 'Push each opening bracket; on a closing bracket, pop and compare. The stack must end empty.' },
      { id: 'cod-dsa.3', q: 'What is the maximum subarray sum of [-2, 1, -3, 4, -1, 2, 1, -5, 4]?', options: ['4', '5', '6', '7'], answer: 2, why: 'Kadane\'s algorithm finds [4, -1, 2, 1] = 6.', round: 'Online test' },
      { id: 'cod-dsa.4', q: 'How do you detect a cycle in a linked list using O(1) extra space?', options: ['Floyd\'s slow and fast pointers', 'Store visited nodes in a hash set', 'Sort the list', 'Count nodes until you reach null'], answer: 0, why: 'If the fast pointer meets the slow pointer there is a cycle. A hash set also works but needs O(n) space.' },
      { id: 'cod-dsa.5', q: 'What are the time and extra space for reversing a singly linked list iteratively?', options: ['O(n) time, O(n) space', 'O(n) time, O(1) space', 'O(n²) time, O(1) space', 'O(log n) time, O(1) space'], answer: 1, why: 'One pass, re-pointing each node with prev / current / next.' },
      { id: 'cod-dsa.6', q: 'An array holds the numbers 1 to n with exactly one missing. What is a simple O(n) time, O(1) space way to find it?', options: ['Sort and scan', 'Nested loops', 'n(n + 1)/2 minus the sum of the array', 'Binary search on the unsorted array'], answer: 2, why: 'The expected total minus the actual total is the missing number. Sorting costs O(n log n).' },
      { id: 'cod-dsa.7', q: 'What is the most efficient way to check whether two strings are anagrams?', options: ['Compare every permutation', 'Check only that the lengths match', 'Reverse one string and compare', 'Count each character in both strings and compare the counts'], answer: 3, why: 'Counting is O(n). Sorting both strings also works in O(n log n).' },
    ],
  },
  {
    id: 'cod-algo', track: 'coding', title: 'Searching, sorting and complexity', round: 'Technical interview',
    lesson: [
      'Binary search is O(log n) and needs sorted data. Compute mid = low + (high − low) / 2.',
      'Merge sort: always O(n log n), stable, O(n) extra space. Quick sort: O(n log n) on average, O(n²) worst case.',
      'Naive recursive Fibonacci is O(2ⁿ). Memoisation or a simple loop makes it O(n).',
      'BFS uses a queue and finds shortest paths in unweighted graphs. DFS uses a stack or recursion.',
      'Two nested loops over the same input are usually O(n²). Look for a hash map or sorting to remove one.',
    ],
    questions: [
      { id: 'cod-algo.1', q: 'What is the time complexity of binary search, and what does it need?', options: ['O(n), works on any array', 'O(log n), needs a sorted array', 'O(log n), works on any array', 'O(1), needs a sorted array'], answer: 1, why: 'Each step halves a sorted search range.' },
      { id: 'cod-algo.2', q: 'What is the worst-case time complexity of quick sort?', options: ['O(n²)', 'O(n log n)', 'O(n)', 'O(log n)'], answer: 0, why: 'When the pivot is always the smallest or largest element, e.g. a sorted array with the first element as pivot.' },
      { id: 'cod-algo.3', q: 'Which sorting algorithm is stable and always O(n log n)?', options: ['Quick sort', 'Heap sort', 'Selection sort', 'Merge sort'], answer: 3, why: 'Heap sort is O(n log n) but not stable; quick sort can degrade to O(n²).' },
      { id: 'cod-algo.4', q: 'What is the time complexity of the naive recursive fib(n) = fib(n − 1) + fib(n − 2)?', options: ['O(n)', 'O(n log n)', 'O(2ⁿ)', 'O(n²)'], answer: 2, why: 'Each call branches into two and repeats the same sub-problems.' },
      { id: 'cod-algo.5', q: 'Which traversal finds the path with the fewest edges in an unweighted graph?', options: ['DFS', 'BFS', 'Inorder traversal', 'Topological sort'], answer: 1, why: 'BFS visits nodes level by level, so the first time it reaches a node is by a shortest path.' },
      { id: 'cod-algo.6', q: 'What is the average time to look up a key in a hash map?', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], answer: 0, why: 'Hashing jumps straight to a bucket; the worst case with many collisions is O(n).' },
    ],
  },
  {
    id: 'cod-output', track: 'coding', title: 'Predict the output (C, Java, Python)', round: 'Online test',
    lesson: [
      'Java evaluates + left to right: numbers add until the first String appears, then everything concatenates.',
      'In C, a semicolon straight after for(...) makes an empty loop body.',
      'Python lists: * repeats and + joins. Slicing s[::-1] reverses.',
      'Integer division: 7 / 2 is 3 in C and Java, 3.5 in Python 3 (use // for 3).',
      'Post-increment x++ uses the old value; pre-increment ++x uses the new one.',
    ],
    questions: [
      { id: 'cod-output.1', q: 'What does this Java code print?', code: 'System.out.println(10 + 20 + "Hi" + 10 + 20);', options: ['30Hi30', '1020Hi1020', '30Hi1020', 'Compilation error'], answer: 2, why: '10 + 20 = 30 first. After the String, + joins text: "30Hi" + 10 + 20 = "30Hi1020".' },
      { id: 'cod-output.2', q: 'What does this C code print?', code: 'int i;\nfor (i = 0; i < 5; i++);\nprintf("%d", i);', options: ['01234', '4', 'Nothing', '5'], answer: 3, why: 'The semicolon is an empty loop body. The loop stops when i is 5, then printf runs once.' },
      { id: 'cod-output.3', q: 'What does this Python code print?', code: 'print([1, 2, 3] * 2)', options: ['[2, 4, 6]', '[1, 2, 3, 1, 2, 3]', '[[1, 2, 3], [1, 2, 3]]', 'TypeError'], answer: 1, why: 'Multiplying a list repeats it.' },
      { id: 'cod-output.4', q: 'What does this Python code print?', code: 's = "placement"\nprint(s[::-1][:3])', options: ['pla', 'ent', 'tne', 'nem'], answer: 2, why: 's[::-1] is "tnemecalp"; its first three characters are "tne".' },
      { id: 'cod-output.5', q: 'What does this Java code print?', code: 'int x = 5;\nint y = x++ + 10;\nSystem.out.println(x + " " + y);', options: ['6 15', '5 15', '6 16', '5 16'], answer: 0, why: 'x++ gives 5 to the sum, then x becomes 6; y = 15.' },
      { id: 'cod-output.6', q: 'What does this C code print?', code: 'printf("%d", 7 / 2);', options: ['3.5', '3', '4', '3.0'], answer: 1, why: 'Both operands are int, so the division truncates to 3.' },
    ],
  },
  {
    id: 'cod-oop', track: 'coding', title: 'Object-oriented programming', round: 'Technical interview',
    lesson: [
      'Encapsulation: hide data behind methods (private fields with getters and setters).',
      'Inheritance: "is-a" reuse. Java and C# allow one parent class but many interfaces.',
      'Polymorphism: overloading is compile-time (same name, different parameters); overriding is runtime (a subclass replaces a parent method).',
      'Abstraction: abstract classes and interfaces expose what an object does, not how.',
      'Constructors are not inherited. A final class in Java cannot be extended.',
    ],
    questions: [
      { id: 'cod-oop.1', q: 'Method overriding is an example of…', options: ['Runtime polymorphism', 'Compile-time polymorphism', 'Encapsulation', 'Abstraction'], answer: 0, why: 'The method to run is chosen at runtime from the object\'s actual class.' },
      { id: 'cod-oop.2', q: 'Which statement about Java is true?', options: ['A class can extend more than one class', 'Interfaces can have constructors', 'A class can implement many interfaces but extend only one class', 'Abstract classes cannot contain implemented methods'], answer: 2, why: 'Java has single class inheritance and multiple interface implementation.' },
      { id: 'cod-oop.3', q: 'Making fields private and exposing them through getters and setters is called…', options: ['Inheritance', 'Polymorphism', 'Abstraction', 'Encapsulation'], answer: 3, why: 'The data is wrapped and protected behind methods.' },
      { id: 'cod-oop.4', q: 'Two methods add(int, int) and add(double, double) in the same class are an example of…', options: ['Overriding', 'Overloading', 'Hiding', 'Inheritance'], answer: 1, why: 'Same name, different parameter lists, resolved at compile time.' },
    ],
  },
  {
    id: 'cod-sql', track: 'coding', title: 'SQL and DBMS', round: 'Technical interview',
    lesson: [
      'Second-highest value: MAX(salary) WHERE salary < (SELECT MAX(salary) …), or DENSE_RANK().',
      'WHERE filters rows before grouping. HAVING filters groups after GROUP BY.',
      'DELETE removes chosen rows and can be rolled back. TRUNCATE removes all rows quickly. DROP removes the table.',
      'INNER JOIN keeps matching rows only. LEFT JOIN keeps every left row and fills the rest with NULL.',
      'COUNT(*) counts rows; COUNT(column) skips NULLs.',
      '1NF: atomic values. 2NF: no partial dependency. 3NF: no transitive dependency. ACID: atomicity, consistency, isolation, durability.',
    ],
    questions: [
      { id: 'cod-sql.1', q: 'Which query returns the second-highest salary from Employee?', options: ['SELECT MAX(salary) FROM Employee', 'SELECT MAX(salary) FROM Employee WHERE salary < (SELECT MAX(salary) FROM Employee)', 'SELECT salary FROM Employee ORDER BY salary', 'SELECT MIN(salary) FROM Employee WHERE salary > 1'], answer: 1, why: 'Take the maximum among salaries below the overall maximum.' },
      { id: 'cod-sql.2', q: 'Which clause filters groups after GROUP BY?', options: ['WHERE', 'ORDER BY', 'HAVING', 'LIMIT'], answer: 2, why: 'WHERE runs before grouping and cannot use aggregates like COUNT(*).' },
      { id: 'cod-sql.3', q: 'Which command removes all rows, keeps the table structure and takes no WHERE clause?', options: ['DELETE', 'DROP', 'ALTER', 'TRUNCATE'], answer: 3, why: 'DROP removes the table itself; DELETE can filter rows.' },
      { id: 'cod-sql.4', q: 'Students LEFT JOIN Marks returns…', options: ['All students, with NULL marks where none exist', 'Only students who have marks', 'Only marks without a student', 'Every combination of rows'], answer: 0, why: 'Every row of the left table is kept.' },
      { id: 'cod-sql.5', q: 'A table has 10 rows and the email column is NULL in 3 of them. What does SELECT COUNT(email) return?', options: ['10', '7', '3', '0'], answer: 1, why: 'COUNT(column) ignores NULLs; COUNT(*) would return 10.', round: 'Online test' },
      { id: 'cod-sql.6', q: 'What does the I in ACID stand for?', options: ['Integrity', 'Indexing', 'Isolation', 'Identity'], answer: 2, why: 'Isolation: concurrent transactions do not see each other\'s partial work.' },
    ],
  },
  {
    id: 'cod-core', track: 'coding', title: 'Operating systems, networks and Git', round: 'Technical interview',
    lesson: [
      'A process is a program in execution with its own memory. Threads inside a process share that memory.',
      'Deadlock needs all four: mutual exclusion, hold and wait, no preemption, circular wait.',
      'TCP: connection-oriented, reliable, ordered. UDP: connectionless and faster, with no delivery guarantee (video, DNS).',
      'Opening a URL: DNS lookup → TCP (and TLS) handshake → HTTP request → response → render.',
      'git pull = git fetch + git merge. Commit small changes with clear messages; use a branch per feature.',
    ],
    questions: [
      { id: 'cod-core.1', q: 'Which is NOT one of the four necessary conditions for deadlock?', options: ['Mutual exclusion', 'Starvation', 'Hold and wait', 'Circular wait'], answer: 1, why: 'The fourth condition is no preemption. Starvation is a different problem.' },
      { id: 'cod-core.2', q: 'Which is true about threads of the same process?', options: ['They share the memory of their process', 'Each has its own separate address space', 'They can never run at the same time', 'They always run on different machines'], answer: 0, why: 'Shared memory makes threads cheap to create, and makes locking necessary.' },
      { id: 'cod-core.3', q: 'Which protocol is connection-oriented and guarantees ordered delivery?', options: ['UDP', 'IP', 'TCP', 'ICMP'], answer: 2, why: 'TCP sets up a connection and retransmits lost segments in order.' },
      { id: 'cod-core.4', q: 'git pull is equivalent to…', options: ['git push + git merge', 'git clone + git commit', 'git add + git commit', 'git fetch + git merge'], answer: 3, why: 'It downloads remote commits, then merges them into your branch.' },
      { id: 'cod-core.5', q: 'You type a website address into a browser. What happens first?', options: ['The HTML is rendered', 'A DNS lookup turns the domain into an IP address', 'The TCP connection is closed', 'Cookies are cleared'], answer: 1, why: 'The browser needs the server\'s IP address before it can connect.' },
    ],
  },
  {
    id: 'cod-testing', track: 'coding', title: 'Software testing', round: 'Technical interview',
    lesson: [
      'Verification: are we building the product right (reviews, walkthroughs)? Validation: are we building the right product (testing against user needs)?',
      'Boundary value analysis: test at, just below and just above each boundary.',
      'Equivalence partitioning: one representative value per valid or invalid class.',
      'Severity = impact on the system. Priority = how soon it must be fixed.',
      'Regression testing re-checks existing features after a change. Smoke testing checks a build is stable enough to test.',
      'A good bug report has a title, steps to reproduce, expected vs actual result, environment and evidence.',
    ],
    questions: [
      { id: 'cod-testing.1', q: 'An age field accepts 18 to 60. Which set is the best boundary value test?', options: ['18 and 60 only', '20, 30 and 40', '17, 18, 60 and 61', '0 and 100'], answer: 2, why: 'Test each boundary and the value just outside it.' },
      { id: 'cod-testing.2', q: 'Re-running existing tests after a bug fix to make sure nothing else broke is called…', options: ['Regression testing', 'Smoke testing', 'Unit testing', 'Alpha testing'], answer: 0, why: 'It guards against a fix breaking something that used to work.' },
      { id: 'cod-testing.3', q: 'A spelling mistake in the company name on the home page is usually…', options: ['High severity, low priority', 'Low severity, high priority', 'High severity, high priority', 'Low severity, low priority'], answer: 1, why: 'Nothing breaks (low severity), but every customer sees it (high priority).' },
      { id: 'cod-testing.4', q: 'Testing only through inputs and outputs, without looking at the code, is called…', options: ['White-box testing', 'Unit testing', 'Static analysis', 'Black-box testing'], answer: 3, why: 'The tester treats the system as a closed box.' },
      { id: 'cod-testing.5', q: 'What matters most in a bug report for the developer?', options: ['The tester\'s opinion of the code', 'Only a screenshot', 'Clear steps to reproduce, with expected and actual results', 'The hours spent testing'], answer: 2, why: 'A developer who can reproduce the bug can fix it.' },
      { id: 'cod-testing.6', q: 'Reviewing the requirements and design documents before any code runs is…', options: ['Validation', 'Verification', 'Regression testing', 'Load testing'], answer: 1, why: 'Verification checks the work products; validation runs the product against user needs.' },
    ],
  },
  {
    id: 'cod-stats', track: 'coding', title: 'Statistics and Python for data', round: 'Technical interview',
    lesson: [
      'The mean is pulled by outliers; the median is not. Use the median for salaries and house prices.',
      'Standard deviation measures how spread out values are around the mean.',
      'Correlation is not causation: look for a third factor.',
      'pandas: df.groupby("col")["x"].mean(), df.isna().sum() for missing values, df.merge() for joins.',
      'Clean before analysing: duplicates, missing values, wrong types and outliers.',
    ],
    questions: [
      { id: 'cod-stats.1', q: 'Salaries in a team are 30k, 32k, 35k, 36k and 5 lakh. Which measure best describes a typical salary?', options: ['Mean', 'Median', 'Range', 'Standard deviation'], answer: 1, why: 'One outlier pulls the mean far up; the median (35k) stays typical.' },
      { id: 'cod-stats.2', q: 'Which pandas code gives the average marks per branch?', options: ['df.mean("branch")', 'df["marks"].groupby().mean()', 'df.groupby("branch")["marks"].mean()', 'df.sort("branch").mean()'], answer: 2, why: 'Group by the category, pick the column, then aggregate.' },
      { id: 'cod-stats.3', q: 'Ice-cream sales and drowning cases both rise in summer. What is the right conclusion?', options: ['They are correlated, probably through a third factor such as hot weather', 'Ice cream causes drowning', 'Drowning causes ice-cream sales', 'The data must be wrong'], answer: 0, why: 'Hot weather drives both; correlation alone does not show cause.' },
      { id: 'cod-stats.4', q: 'How do you count missing values in each column of a DataFrame df?', options: ['df.count()', 'df.dropna()', 'df.fillna(0)', 'df.isna().sum()'], answer: 3, why: 'isna() marks missing cells as True; sum() counts them per column.' },
    ],
  },
  {
    id: 'cod-excel', track: 'coding', title: 'Excel and business tools', round: 'Online test',
    lesson: [
      'VLOOKUP(value, table, column, FALSE): FALSE means exact match. XLOOKUP is the newer replacement.',
      'SUMIF and COUNTIF add or count rows that meet one condition; SUMIFS and COUNTIFS take several.',
      'Pivot tables summarise large data by category in seconds, without formulas.',
      '$A$1 is an absolute reference: it does not change when the formula is copied.',
      'ROI = (return − cost) / cost × 100.',
    ],
    questions: [
      { id: 'cod-excel.1', q: 'Which Excel function finds a value in the first column of a table and returns a value from another column in the same row?', options: ['SUMIF', 'COUNTA', 'VLOOKUP', 'CONCAT'], answer: 2, why: 'VLOOKUP = vertical lookup.' },
      { id: 'cod-excel.2', q: 'Which formula adds Amount (column C) only for rows where Region (column B) is "South"?', options: ['=SUM(C:C)', '=SUMIF(B:B,"South",C:C)', '=COUNTIF(B:B,"South")', '=IF(B:B="South",C:C)'], answer: 1, why: 'SUMIF(range to test, condition, range to add).' },
      { id: 'cod-excel.3', q: 'What does $A$1 mean in an Excel formula?', options: ['An absolute reference that stays fixed when the formula is copied', 'A relative reference', 'A currency format', 'A named range'], answer: 0, why: 'The $ signs lock both the column and the row.' },
      { id: 'cod-excel.4', q: 'You spend ₹50,000 on a campaign and it returns ₹80,000. What is the ROI?', options: ['30%', '160%', '37.5%', '60%'], answer: 3, why: '(80,000 − 50,000) / 50,000 = 60%.' },
      { id: 'cod-excel.5', q: 'Which Excel feature quickly summarises sales by region and month without writing formulas?', options: ['Conditional formatting', 'Freeze panes', 'Pivot table', 'Data validation'], answer: 2, why: 'Drag fields into rows, columns and values.' },
    ],
  },

  // ---------- Interview
  {
    id: 'int-hr', track: 'interview', title: 'Common HR questions', round: 'HR interview',
    lesson: [
      'Tell me about yourself: present (what you study, your focus) → past (one or two proof points) → future (why this role). Under two minutes.',
      'Weakness: a real but non-critical weakness, plus what you are doing about it.',
      'Why should we hire you: match two or three needs of the role with your evidence.',
      'Why this company: mention something specific you researched (product, values, recent work).',
      'Keep two questions ready for the interviewer about the role or the team.',
      'Salary as a fresher: research the range and say you are open to the company\'s standard package for the role.',
    ],
    questions: [
      { id: 'int-hr.1', q: '"Tell me about yourself." Which structure works best?', options: ['Your full life story from school onwards', 'Present → past → future: what you study now, one or two proof points, why this role', 'Your hobbies and family details', 'Read out your resume line by line'], answer: 1, why: 'It is short, relevant and ends on why you fit the role.' },
      { id: 'int-hr.2', q: '"What is your greatest weakness?" Which answer is best?', options: ['"I am a perfectionist and I work too hard."', '"I have no weaknesses."', '"I am often late."', '"I used to hesitate in public speaking, so I joined the debate club and now present in every project review."'], answer: 3, why: 'Clichés and "none" sound rehearsed. A real weakness with action shows self-awareness.' },
      { id: 'int-hr.3', q: '"Why should we hire you?" The strongest answer…', options: ['Links two or three needs of the role to your projects or results', 'Says you really need the job', 'Compares you negatively with other candidates', 'Repeats your CGPA'], answer: 0, why: 'Evidence matched to the role is what the interviewer is checking.' },
      { id: 'int-hr.4', q: 'At the end the interviewer asks, "Do you have any questions for us?" What should you do?', options: ['Say "No, thank you."', 'Ask about salary hikes and leave first', 'Ask whether you got the job', 'Ask about the team, the first projects or what success looks like in the role'], answer: 3, why: 'Thoughtful questions show genuine interest.' },
      { id: 'int-hr.5', q: '"Where do you see yourself in five years?" A good answer is…', options: ['"Running a company that competes with yours."', '"I have not thought about it."', '"Growing into a strong specialist in this field and taking on more responsibility here."', '"In a different industry."'], answer: 2, why: 'It shows ambition that fits the company.' },
      { id: 'int-hr.6', q: 'As a fresher, how should you answer "What are your salary expectations?"', options: ['Quote a very high number to negotiate down', 'Say you are open to the company\'s standard package for the role, and mention the typical range you researched', 'Refuse to answer', 'Say you will accept anything, even below market'], answer: 1, why: 'Shows research and flexibility without underselling yourself.' },
    ],
  },
  {
    id: 'int-star', track: 'interview', title: 'Behavioural answers with STAR', round: 'HR interview',
    lesson: [
      'STAR = Situation, Task, Action, Result. Spend most of the time on Action and Result.',
      'Say "I", not only "we": explain what you did.',
      'Give numbers when you honestly can: time saved, marks improved, users reached.',
      'Prepare five stories: teamwork, conflict, failure, leadership, a tight deadline. One story can answer several questions.',
      'In technical rounds, think aloud: clarify the problem, give a simple approach, then improve it.',
    ],
    questions: [
      { id: 'int-star.1', q: 'What does STAR stand for in behavioural interviews?', options: ['Skill, Talent, Ability, Result', 'Story, Theme, Answer, Reason', 'Situation, Task, Action, Result', 'Strength, Target, Attitude, Review'], answer: 2, why: 'A simple frame that keeps answers concrete.' },
      { id: 'int-star.2', q: '"Tell me about a conflict in a team." Which answer is best?', options: ['"We never had any conflicts."', 'Describe the situation, how you discussed it privately using facts, the agreement you reached and what you learned', 'Explain why your teammate was wrong', '"I let the others decide everything."'], answer: 1, why: 'It shows maturity, ownership and a result.' },
      { id: 'int-star.3', q: 'In a technical interview you do not know an answer. What should you do?', options: ['Make up an answer confidently', 'Stay silent until the next question', 'Say you are not sure, then reason aloud about how you would approach it', 'Change the topic'], answer: 2, why: 'Honesty plus visible reasoning scores better than a confident wrong answer.', round: 'Technical interview' },
      { id: 'int-star.4', q: 'In a STAR answer, which parts should take most of the time?', options: ['Action and Result', 'Situation and Task', 'Only the Situation', 'An apology for the problem'], answer: 0, why: 'The interviewer wants to know what you did and what changed.' },
      { id: 'int-star.5', q: 'You are given a coding problem in an interview. What is the best first step?', options: ['Start coding immediately', 'Ask the interviewer for the solution', 'Clarify inputs, outputs and edge cases, then state a simple approach before optimising', 'Say you have seen the problem before'], answer: 2, why: 'Clarifying first avoids solving the wrong problem.', round: 'Technical interview' },
    ],
  },
  {
    id: 'int-etiquette', track: 'interview', title: 'Professional behaviour and body language', round: 'HR interview',
    note: 'These questions check what you know about interview etiquette. They do not assess your actual body language.',
    lesson: [
      'Arrive 10–15 minutes early. Online, join 5 minutes early after testing audio and video.',
      'Posture: sit upright, lean slightly forward, keep your hands visible and still.',
      'Eye contact: natural and steady, not staring. On video, look at the camera when you speak.',
      'Online: camera at eye level, plain background, light in front of you, phone on silent.',
      'Dress formally, or one level above the company\'s dress code.',
      'Send a short thank-you email within 24 hours.',
    ],
    questions: [
      { id: 'int-etiquette.1', q: 'For an in-person interview, when should you arrive?', options: ['Exactly on time', 'An hour early', '10–15 minutes early', 'A few minutes late is fine'], answer: 2, why: 'Time to settle in without crowding the reception.' },
      { id: 'int-etiquette.2', q: 'In a video interview, where should you look while answering?', options: ['At your own video tile', 'At the camera', 'At your notes', 'Around the room'], answer: 1, why: 'Looking at the camera reads as eye contact to the interviewer.' },
      { id: 'int-etiquette.3', q: 'Which posture signals confidence and interest?', options: ['Sitting upright, leaning slightly forward, hands visible', 'Leaning back with arms crossed', 'Slouching to look relaxed', 'Checking your phone between questions'], answer: 0, why: 'Open, attentive posture without fidgeting.' },
      { id: 'int-etiquette.4', q: 'When should you send a thank-you email after an interview?', options: ['Never', 'After a month', 'Only if you are selected', 'Within 24 hours'], answer: 3, why: 'While the conversation is fresh in the interviewer\'s mind.' },
      { id: 'int-etiquette.5', q: 'You disagree with a senior\'s decision at work. What is the most professional response?', options: ['Complain to your teammates', 'Ignore the decision', 'Raise it privately and respectfully, with your reasons and data', 'Argue in front of the client'], answer: 2, why: 'Disagree in private with evidence; support the team in public.' },
      { id: 'int-etiquette.6', q: 'Before an online interview, what should you check?', options: ['Nothing — it will be fine', 'Internet, audio, camera framing, lighting and a quiet space', 'Only your outfit', 'Only your resume'], answer: 1, why: 'Technical problems eat into your interview time and first impression.' },
    ],
  },
];

/**
 * Courses: what a student should learn, each built from the modules above (key points + graded practice).
 * Every module belongs to exactly one course. `skills` use the resume vocabulary (career.ts) so a skill missing from a
 * resume can point at the course that teaches it. `hours` is a suggested study time, not a measurement.
 */
export type Course = { id: string; title: string; level: 'Foundation' | 'Core' | 'Role-specific'; hours: number; blurb: string; outcomes: string[]; skills: string[]; modules: string[] };
export const COURSES: Course[] = [
  { id: 'quant', title: 'Quantitative aptitude', level: 'Foundation', hours: 12, skills: [],
    blurb: 'The arithmetic, speed and data questions in almost every campus online test.',
    outcomes: ['Solve percentage, profit and interest questions in under a minute', 'Use the LCM method for work, pipes and trains', 'Count arrangements and work out probabilities', 'Read tables and pie charts without a calculator'],
    modules: ['apt-arith', 'apt-time', 'apt-prob', 'apt-di'] },
  { id: 'reasoning', title: 'Logical reasoning', level: 'Foundation', hours: 5, skills: ['problem solving'],
    blurb: 'Series, coding-decoding, relations, directions, syllogisms, clocks and calendars.',
    outcomes: ['Spot number-series patterns from differences and ratios', 'Draw family trees, direction sketches and Venn diagrams', 'Tell when a conclusion really follows'],
    modules: ['apt-reason'] },
  { id: 'programming', title: 'Programming fundamentals', level: 'Foundation', hours: 10, skills: ['c', 'java', 'python', 'oop'],
    blurb: 'How C, Java and Python really evaluate code, and the four pillars of OOP.',
    outcomes: ['Predict the output of tricky snippets (operators, loops, slicing, increments)', 'Explain encapsulation, inheritance, polymorphism and abstraction with code'],
    modules: ['cod-output', 'cod-oop'] },
  { id: 'dsa', title: 'Data structures and algorithms', level: 'Core', hours: 25, skills: ['data structures', 'algorithms'],
    blurb: 'Arrays, strings, linked lists, hashing, searching, sorting and Big-O: the core of every coding round.',
    outcomes: ['Pick the right structure: hash map, stack, queue or two pointers', 'Write Kadane, Floyd, binary search and merge sort from memory', 'State the time and space complexity of your solution'],
    modules: ['cod-dsa', 'cod-algo'] },
  { id: 'databases', title: 'Databases and SQL', level: 'Core', hours: 10, skills: ['sql', 'dbms', 'mysql', 'postgresql'],
    blurb: 'Queries interviewers ask every time, joins, aggregates, normalisation and transactions.',
    outcomes: ['Write Nth-highest, GROUP BY / HAVING and JOIN queries', 'Explain NULL handling, normal forms and ACID'],
    modules: ['cod-sql'] },
  { id: 'cs-core', title: 'CS fundamentals: OS, networks and Git', level: 'Core', hours: 8, skills: ['operating systems', 'computer networks', 'git', 'linux'],
    blurb: 'Processes and threads, deadlock, TCP/UDP, what happens when you open a URL, and Git.',
    outcomes: ['Explain deadlock conditions and how to prevent them', 'Compare TCP and UDP, and walk through DNS → TCP → TLS → HTTP', 'Use fetch, merge, pull and rebase confidently'],
    modules: ['cod-core'] },
  { id: 'testing', title: 'Software testing', level: 'Role-specific', hours: 8, skills: ['testing', 'selenium', 'automation testing'],
    blurb: 'Test design, bug reporting and the vocabulary QA interviews expect.',
    outcomes: ['Design boundary-value and black-box test cases', 'Write a bug report a developer can act on', 'Explain severity vs priority and verification vs validation'],
    modules: ['cod-testing'] },
  { id: 'data', title: 'Data analysis with Python and statistics', level: 'Role-specific', hours: 10, skills: ['statistics', 'pandas', 'numpy', 'data analysis'],
    blurb: 'Descriptive statistics, correlation vs causation, and everyday pandas.',
    outcomes: ['Choose mean or median and explain why', 'Group, aggregate and clean data with pandas', 'Avoid claiming cause from correlation'],
    modules: ['cod-stats'] },
  { id: 'excel', title: 'Excel and business analytics', level: 'Role-specific', hours: 6, skills: ['excel', 'ms office', 'power bi'],
    blurb: 'Lookups, conditional sums, references, pivot tables and ROI.',
    outcomes: ['Use VLOOKUP/XLOOKUP, SUMIF(S) and absolute references', 'Summarise data with a pivot table', 'Calculate ROI and growth correctly'],
    modules: ['cod-excel'] },
  { id: 'communication', title: 'Professional communication', level: 'Foundation', hours: 12, skills: ['communication', 'presentation', 'negotiation'],
    blurb: 'Verbal ability for online tests, professional email, group discussions and client conversations.',
    outcomes: ['Fix common grammar errors and pick the right word', 'Write clear, polite professional emails', 'Speak with structure in a group discussion or a client call'],
    modules: ['com-grammar', 'com-vocab', 'com-email', 'com-speaking', 'com-client'] },
  { id: 'interview', title: 'Interview readiness', level: 'Core', hours: 6, skills: ['leadership', 'teamwork'],
    blurb: 'HR questions, STAR stories and professional behaviour.',
    outcomes: ['Answer the common HR questions honestly and briefly', 'Tell teamwork and leadership stories with STAR', 'Prepare for online and in-person interviews'],
    modules: ['int-hr', 'int-star', 'int-etiquette'] },
];
