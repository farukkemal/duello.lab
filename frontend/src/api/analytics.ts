import api from './axios';

export interface BranchPerformance {
  branch: string;
  totalAnswered: number;
  correctCount: number;
  wrongCount: number;
  accuracyRate: number;
  masteryLevel: 'Critical' | 'NeedsWork' | 'Mastered';
  statusColor: 'rose' | 'amber' | 'emerald';
  recommendation: string;
}

export interface AiCoachReport {
  totalExamsTaken: number;
  totalQuestionsSolved: number;
  overallAccuracyRate: number;
  averageNetScore: number;
  strongestBranch: string;
  weakestBranch: string;
  branchHeatmap: BranchPerformance[];
  aiAdviceList: string[];
  dailyRecommendedMode: string;
}

export interface QuestionReview {
  questionId: string;
  branch: string;
  questionText: string;
  choices: Record<string, string>;
  correctAnswer: string;
  selectedAnswer: string | null;
  isCorrect: boolean;
  solutionText: string | null;
  imageUrl: string | null;
  aiExplanationTip: string;
}

export interface ExamReview {
  examId: string;
  examTitle: string;
  category: string;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  netScore: number;
  questions: QuestionReview[];
}

export const getWeaknessReport = () => api.get<AiCoachReport>('/analytics/weakness-report');
export const getExamReview = (examId: string) => api.get<ExamReview>(`/analytics/review/${examId}`);
export const getExamReviewWithAnswers = (examId: string, answers: Record<string, string | null>) =>
  api.post<ExamReview>(`/analytics/review/${examId}/with-answers`, answers);
