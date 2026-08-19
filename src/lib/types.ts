export interface ScoreBreakdown {
  skill_match: number;
  experience_relevance: number;
  quantification_level: number;
}

export interface Dimensions {
  skill_match: number;
  experience_relevance: number;
  quantification_level: number;
}

export interface RecommendedAddition {
  project_name: string;
  why_add: string;
  action_advice: string;
}

export interface RecommendedRemoval {
  project_name: string;
  why_remove: string;
}

export interface ProjectPivot {
  project_name: string;
  pivot_advice: string;
}

export interface ProjectStrategy {
  recommended_additions: RecommendedAddition[];
  recommended_removals: RecommendedRemoval[];
  project_pivots: ProjectPivot[];
}

export type SuggestionType = 'rewrite' | 'new_project_blueprint' | 'section_addition';

export interface Suggestion {
  type?: SuggestionType;
  category_tag?: string;
  section: string;
  original: string;
  improved: string;
  reason: string;
}

export interface CalibrationMeta {
  missing_hard_skills: number;
  matched_hard_skills: string[];
  quant_count: number;
  vague_count: number;
  senior_fuse_applied: boolean;
}

export interface AnalysisResult {
  match_score: number;
  summary: string;
  dimensions: Dimensions;
  score_breakdown?: ScoreBreakdown;
  missing_keywords: string[];
  project_strategy: ProjectStrategy;
  suggestions: Suggestion[];
  _calibration_meta?: CalibrationMeta;
}

export interface AnalyzeRequest {
  resume: string;
  jd: string;
  extra_projects?: string;
}
