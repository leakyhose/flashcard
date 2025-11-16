import { useEffect, useState } from "react";
import { socket } from "../socket";
import type { FlashcardEnd } from "@shared/types";

export function Game() {
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [hasAnsweredCorrectly, setHasAnsweredCorrectly] = useState(false);
  const [results, setResults] = useState<FlashcardEnd | null>(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const handleNewFlashcard = (question: string) => {
      console.log(question);
      setCurrentQuestion(question);
      setAnswer("");
      setHasAnsweredCorrectly(false);
      setResults(null);
      setShowResults(false);
    };

    const handleCorrectGuess = () => {
      setHasAnsweredCorrectly(true);
    };

    const handleEndFlashcard = (flashcardEnd: FlashcardEnd) => {
      setResults(flashcardEnd);
      setShowResults(true);
    };

    // Attach listeners first
    socket.on("newFlashcard", handleNewFlashcard);
    socket.on("correctGuess", handleCorrectGuess);
    socket.on("endFlashcard", handleEndFlashcard);

    // Request current question in case we missed the initial event
    socket.emit("requestCurrentQuestion");

    return () => {
      socket.off("newFlashcard", handleNewFlashcard);
      socket.off("correctGuess", handleCorrectGuess);
      socket.off("endFlashcard", handleEndFlashcard);
    };
  }, []);

  const handleSubmitAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (answer.trim() && !hasAnsweredCorrectly) {
      socket.emit("answer", answer.trim());
      setAnswer("");
    }
  };

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Waiting for game to start...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-6xl font-bold text-center max-w-4xl">
          {currentQuestion}
        </div>
      </div>

      {!showResults && !hasAnsweredCorrectly && (
        <div className="p-8">
          <form onSubmit={handleSubmitAnswer}>
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer..."
              className="w-full px-6 py-4 text-2xl border-2 border-blue-400 rounded-lg focus:outline-none focus:border-blue-600"
              autoFocus
            />
          </form>
        </div>
      )}

      {!showResults && hasAnsweredCorrectly && (
        <div className="p-8 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">✓</div>
            <div className="text-2xl font-bold text-green-600">Correct!</div>
            <div className="text-gray-600 mt-2">Waiting for round to end...</div>
          </div>
        </div>
      )}

      {showResults && results && (
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-center p-8" style={{ height: '30%' }}>
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">Correct Answer:</h3>
              <div className="text-4xl font-bold text-green-600 p-4 bg-green-50 rounded-lg border-2 border-green-300 max-h-32 overflow-auto">
                {results.Answer}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 flex-1 p-8 pt-0">
            <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
              <h3 className="text-xl font-semibold mb-3 text-blue-800">
                Fastest Correct Answers
              </h3>
              {results.fastestPlayers.length > 0 ? (
                <div className="space-y-2">
                  {results.fastestPlayers.map((player, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-2 bg-white rounded border"
                    >
                      <span className="font-medium">{player.player}</span>
                      <span className="text-sm text-gray-600">
                        {(Number(player.time) / 1000).toFixed(2)}s
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 italic">No correct answers</div>
              )}
            </div>

            <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
              <h3 className="text-xl font-semibold mb-3 text-red-800">
                Incorrect Guesses
              </h3>
              {results.wrongAnswers.length > 0 ? (
                <div className="space-y-2">
                  {results.wrongAnswers.map((wrong, index) => (
                    <div key={index} className="p-2 bg-white rounded border">
                      <div className="font-medium">{wrong.player}</div>
                      <div className="text-sm text-gray-600 italic">
                        "{wrong.answer}"
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 italic">No wrong answers</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
