import { supabase } from "../supabaseClient";
import type { FlashcardSetSummary, FlashcardDBRow } from "../types";
import { DEFAULT_PAGE_SIZE } from "../constants";

export async function fetchFlashcardSets(
  tab: "personal" | "community",
  userId: string | undefined,
  searchQuery: string,
  page: number
): Promise<{ data: FlashcardSetSummary[]; hasMore: boolean }> {
  const from = page * DEFAULT_PAGE_SIZE;
  const to = from + DEFAULT_PAGE_SIZE - 1;
  let data: FlashcardSetSummary[] = [];

  if (tab === "personal") {
    if (!userId) {
      return { data: [], hasMore: false };
    }

    let query = supabase
      .from("flashcard_sets")
      .select("id, name, description, created_at, updated_at, user_id")
      .eq("user_id", userId);

    if (searchQuery.trim()) {
      query = query.ilike("name", `%${searchQuery}%`);
    } else {
      query = query
        .order("created_at", { ascending: false })
        .order("id", { ascending: true });
    }

    const result = await query.range(from, to);

    if (result.error) throw result.error;

    data = result.data
      ? result.data.map((item) => ({
          ...item,
          flashcard_count: 0,
          has_generated: false,
        }))
      : [];
  } else {
    let query = supabase
      .from("public_flashcard_sets")
      .select(
        "id, name, description, created_at, updated_at, plays, user_id, username"
      );

    if (searchQuery.trim()) {
      query = query.textSearch("search_vector", searchQuery);
    } else {
      query = query
        .order("plays", { ascending: false })
        .order("id", { ascending: true });
    }

    const result = await query.range(from, to);

    if (result.error) throw result.error;

    data = result.data
      ? result.data.map((item) => ({
          ...item,
          flashcard_count: 0,
          has_generated: false,
        }))
      : [];
  }

  const hasMore = data.length === DEFAULT_PAGE_SIZE;
  return { data, hasMore };
}

export async function fetchFlashcardCounts(
  sets: FlashcardSetSummary[],
  tab: "personal" | "community"
): Promise<FlashcardSetSummary[]> {
  const setIdField = tab === "personal" ? "set_id" : "public_set_id";

  const setsWithCounts = await Promise.all(
    sets.map(async (set) => {
      const { data: flashcardData, count } = await supabase
        .from("flashcards")
        .select("term_generated, definition_generated", { count: "exact" })
        .eq(setIdField, set.id)
        .limit(1000);

      const hasTermGen = flashcardData?.some((f) => f.term_generated) || false;
      const hasDefGen =
        flashcardData?.some((f) => f.definition_generated) || false;

      return {
        ...set,
        flashcard_count: count || 0,
        has_generated: hasTermGen || hasDefGen,
        term_generated: hasTermGen,
        definition_generated: hasDefGen,
      };
    })
  );

  return setsWithCounts;
}

export async function fetchFlashcardsFromSet(
  setId: string,
  isPublic: boolean
): Promise<FlashcardDBRow[]> {
  let allData: FlashcardDBRow[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  const setIdField = isPublic ? "public_set_id" : "set_id";

  while (hasMore) {
    const { data, error } = await supabase
      .from("flashcards")
      .select(
        "term, definition, trick_terms, trick_definitions, is_generated, term_generated, definition_generated, order_index"
      )
      .eq(setIdField, setId)
      .order("order_index", { ascending: true })
      .order("id", { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw error;

    if (data && data.length > 0) {
      allData = [...allData, ...data];
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    } else {
      hasMore = false;
    }
  }

  return allData;
}
