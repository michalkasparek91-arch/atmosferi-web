import fs from 'node:fs';import assert from 'node:assert/strict';
const s=fs.readFileSync('start.html','utf8');
assert(s.includes('data-group="need"')&&s.includes('name="email"')&&s.includes('name="message"'));
assert(!s.includes('data-group="budget"')&&!s.includes('Budget, optional')&&!s.includes('picked("budget")'));
assert(s.includes('budget: ""')&&s.includes('AtmosferiInquiry.send('));
assert(s.includes('data-i18n-langs="en,de,cs,fr"'));
console.log('Start form QA passed: no budget field, inquiry request maintained.');