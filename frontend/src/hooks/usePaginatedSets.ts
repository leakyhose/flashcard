import { useState, useEffect, useRef, useCallback } from "react";
import { fetchFlashcardSets, fetchFlashcardCounts } from "../services/flashcardService";
import type { FlashcardSetSummary } from "../types";

interface UsePaginatedSetsOptions {
  tab: "personal" | "community";
  userId: string | undefined;
  searchQuery: string;
  isOpen?: boolean;
  refreshTrigger?: number;
}

interface UsePaginatedSetsResult {
  sets: FlashcardSetSummary[];
  loading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string;
  fetchMore: () => void;
  refresh: () => void;
}

export function usePaginatedSets({
  tab,
  userId,
  searchQuery,
  isOpen = true,
  refreshTrigger = 0,
}: UsePaginatedSetsOptions): UsePaginatedSetsResult {
  const [sets, setSets] = useState<FlashcardSetSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);

  const requestIdRef = useRef(0);

  const fetchSets = useCallback(
    async (pageToFetch: number, isInitial: boolean, currentRequestId: number) => {
      if (isInitial) {
        setLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError("");

      try {
        const { data, hasMore: moreAvailable } = await fetchFlashcardSets(
          tab,
          userId,
          searchQuery,
          pageToFetch
        );

        if (requestIdRef.current !== currentRequestId) {
          return;
        }

        if (!moreAvailable) {
          setHasMore(false);
        }

        const setsWithCounts = await fetchFlashcardCounts(data, tab);

        if (requestIdRef.current !== currentRequestId) {
          return;
        }

        if (isInitial) {
          setSets(setsWithCounts);
        } else {
          setSets((prev) => [...prev, ...setsWithCounts]);
        }
      } catch (err) {
        if (requestIdRef.current === currentRequestId) {
          console.error(err);
          setError("Failed to load flashcard sets");
        }
      } finally {
        if (requestIdRef.current === currentRequestId) {
          setLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [tab, userId, searchQuery]
  );

  useEffect(() => {
    if (!isOpen) return;

    requestIdRef.current += 1;
    setPage(0);
    setHasMore(true);
    fetchSets(0, true, requestIdRef.current);
  }, [tab, userId, searchQuery, isOpen, refreshTrigger, fetchSets]);

  const fetchMore = useCallback(() => {
    if (loading || isLoadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchSets(nextPage, false, requestIdRef.current);
  }, [loading, isLoadingMore, hasMore, page, fetchSets]);

  const refresh = useCallback(() => {
    requestIdRef.current += 1;
    setPage(0);
    setHasMore(true);
    fetchSets(0, true, requestIdRef.current);
  }, [fetchSets]);

  return {
    sets,
    loading,
    isLoadingMore,
    hasMore,
    error,
    fetchMore,
    refresh,
  };
}
