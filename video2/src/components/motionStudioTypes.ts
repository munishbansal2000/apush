// Types for motion-studio components (adapted)

export interface TimelineMilestone {
  year: string;
  title: string;
  description?: string;
  subtitle?: string;
  significance?: string;
}

export interface TimelineProps {
  eraTitle: string;
  periodBadge: string;
  milestones: TimelineMilestone[];
  themeColor?: string;
  showProgressGauge?: boolean;
}

export interface PrimarySourceProps {
  documentTitle: string;
  authorAndDate: string;
  excerptText: string;
  highlightedPhrase: string;
  hippType: 'Historical Context' | 'Intended Audience' | 'Purpose' | 'Point of View';
  hippExplanation: string;
  documentType?: string;
}

export interface VersusStance {
  topic: string;
  powerLevel: number;
  position: string;
}

export interface VersusEntity {
  name: string;
  subtitle?: string;
  points: string[];
  color?: string;
  accentColor?: string;
  faction?: string;
  portraitDesc?: string;
  coreIdeology?: string;
  keyStances?: VersusStance[];
}

export interface VersusProps {
  clashTitle: string;
  periodLabel: string;
  entityA: VersusEntity;
  entityB: VersusEntity;
  verdictSummary: string;
}

export interface WordToken {
  text: string;
  word?: string;
  start: number;
  end: number;
  startFrame: number;
  endFrame: number;
  emphasis?: boolean;
}

export interface KineticCaptionsProps {
  tokens: WordToken[];
  speakerName?: string;
  highlightColor?: string;
  showWaveform?: boolean;
}

export interface LowerThirdProps {
  name: string;
  title?: string;
  duration?: number;
  primaryTitle?: string;
  secondaryTitle?: string;
  chapterNumber?: string;
  badgeText?: string;
  citationDate?: string;
  accentColor?: string;
}
