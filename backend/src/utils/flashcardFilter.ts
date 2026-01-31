import type { Flashcard } from "@shared/types.js";

/**
 * Filters flashcards for broadcasting to clients when allowView is false.
 * Hides question and answer content while preserving generation status.
 */
export function filterFlashcardsForBroadcast(
  flashcards: Flashcard[],
  allowView: boolean | undefined
): Flashcard[] {
  if (allowView !== false) {
    return flashcards;
  }

  return flashcards.map((card) => ({
    id: card.id,
    question: "",
    answer: "",
    isGenerated: card.isGenerated ?? false,
    termGenerated: card.termGenerated ?? false,
    definitionGenerated: card.definitionGenerated ?? false,
  }));
}
