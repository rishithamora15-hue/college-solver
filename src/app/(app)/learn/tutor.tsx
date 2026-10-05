'use client';
import { useState } from 'react';
import { StartRun } from '../../client';

export function TutorClient({ csId, topic }: { csId: string; topic?: string }) {
  const [question, setQuestion] = useState('');
  return (
    <>
      <label htmlFor="question">Your question</label>
      <textarea id="question" rows={3} maxLength={1000} value={question} onChange={(e) => setQuestion(e.target.value)} />
      <div style={{ marginTop: 8 }}>
        <StartRun screen="learn" input={{ curriculum_subject_id: csId, topic, question }} label="Ask" render="tutor" />
      </div>
    </>
  );
}
