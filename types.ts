export interface GoldenResult {
  originalTranslation: string;
  goldenPrompt: string;
  category: string;
  reasoning: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isThinking?: boolean;
}

export enum AppMode {
  CONVERTER = 'CONVERTER',
  CHAT = 'CHAT',
}

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface ConversionState {
  isLoading: boolean;
  result: GoldenResult | null;
  error: string | null;
  sources: GroundingSource[];
}

export interface HistoryItem {
  id: string;
  originalInput: string;
  result: GoldenResult;
  timestamp: number;
}
