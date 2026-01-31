/**
 * Database row types and related interfaces for flashcard operations.
 * These types are shared across multiple components that interact with Supabase.
 */

export interface FlashcardDBRow {
  id?: string;
  term: string;
  definition: string;
  trick_terms: string[] | null;
  trick_definitions: string[] | null;
  is_generated: boolean | null;
  term_generated: boolean | null;
  definition_generated: boolean | null;
  order_index: number | null;
  set_id?: string | null;
  public_set_id?: string | null;
  created_at?: string;
}

export interface FlashcardSetSummary {
  id: string;
  name: string;
  created_at: string;
  updated_at?: string;
  description?: string;
  flashcard_count: number;
  has_generated: boolean;
  term_generated?: boolean;
  definition_generated?: boolean;
  plays?: number;
  user_id?: string;
  username?: string;
}

export interface PublicFlashcardSet {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  plays: number;
  user_id: string;
  username: string;
  allow_view: boolean;
  allow_save: boolean;
  shuffle_flashcard: boolean | null;
  fuzzy_tolerance: boolean | null;
  use_term: boolean | null;
  use_mc: boolean | null;
  flashcard_count?: number;
  has_generated?: boolean;
  term_generated?: boolean;
  definition_generated?: boolean;
}

export interface EditableFlashcard {
  id: string;
  term: string;
  definition: string;
  trick_terms: string[];
  trick_definitions: string[];
}

export interface SettingConfig {
  locked: boolean;
  value: boolean | null;
}
