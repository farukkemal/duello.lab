import api from './axios';

export interface ExamListItem {
  id: string;
  title: string;
  category: string;
  questionCount: number;
  isActive: boolean;
}

export interface SoloQuestion {
  id: string;
  branch: string;
  questionText: string;
  choices: Record<string, string>;
  correctAnswer?: string;
  imageUrl?: string;
}

export interface SoloExam {
  examId: string;
  title: string;
  category: string;
  startToken: string;
  questions: SoloQuestion[];
}

export interface ExamResult {
  resultId: string;
  examId: string;
  examTitle: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  netScore: number;
  durationMs: number;
  xpGained: number;
  newTotalXp: number;
  newLevel: number;
}

export interface AnswerPayload {
  questionId: string;
  selectedAnswer: string | null;
}

export const getSoloExams = () =>
  api.get<ExamListItem[]>('/exams/solo');

export const getSoloExam = (examId: string) =>
  api.get<SoloExam>(`/exams/solo/${examId}`);

export const submitExam = (examId: string, startToken: string, answers: AnswerPayload[]) =>
  api.post<ExamResult>('/exams/submit', { examId, startToken, answers });
