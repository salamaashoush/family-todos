import { useQuery } from "@tanstack/react-query";
import { getUserFamilies } from "../server/auth";

/**
 * Hook to get the current family context for the logged-in user.
 * Returns the current family ID which can be used to scope query keys.
 */
export function useFamilyContext() {
  const { data, isLoading } = useQuery({
    queryKey: ["user-families"],
    queryFn: () => getUserFamilies(),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return {
    familyId: data?.currentFamilyId,
    families: data?.families || [],
    isLoading,
  };
}

/**
 * Get the current family ID, returning undefined if not available.
 * This is a simpler version for use in query keys.
 */
export function useCurrentFamilyId(): number | undefined {
  const { familyId } = useFamilyContext();
  return familyId;
}
