export function FlashcardPreview({
  flashcards,
}: {
  flashcards: { id: string; question: string; answer: string }[];
}) {
  return (
    <ul>
      {flashcards.map((flashcard) => (
        <li key={flashcard.id}>
          {flashcard.question} : {flashcard.answer}
        </li>
      ))}
    </ul>
  );
}
