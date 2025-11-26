import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { getUserFamilies, switchFamily } from "../server/auth";
import { ChevronDown, Check, Users, Plus } from "lucide-react";

export function FamilySelector() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["user-families"],
    queryFn: () => getUserFamilies(),
  });

  const switchMutation = useMutation({
    mutationFn: switchFamily,
    onSuccess: async () => {
      // Invalidate all queries to refetch with new family context
      await queryClient.invalidateQueries();
      router.invalidate();
      setIsOpen(false);
    },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isLoading || !data || data.families.length === 0) {
    return null;
  }

  // Don't show selector if user only has one family
  if (data.families.length === 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600">
        <Users className="w-4 h-4" />
        <span className="font-medium">{data.families[0].name}</span>
      </div>
    );
  }

  const currentFamily = data.families.find((f) => f.id === data.currentFamilyId);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        disabled={switchMutation.isPending}
      >
        <Users className="w-4 h-4 text-gray-500" />
        <span className="font-medium text-gray-700 max-w-[150px] truncate">
          {currentFamily?.name || "Select Family"}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Your Families
          </div>

          {data.families.map((family) => (
            <button
              key={family.id}
              onClick={() => {
                if (family.id !== data.currentFamilyId) {
                  switchMutation.mutate({ data: { family_id: family.id } });
                } else {
                  setIsOpen(false);
                }
              }}
              disabled={switchMutation.isPending}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors ${
                family.id === data.currentFamilyId ? "bg-blue-50" : ""
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  family.id === data.currentFamilyId
                    ? "bg-blue-100 text-blue-600"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {family.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-800 truncate">
                  {family.name}
                </div>
                <div className="text-xs text-gray-500 capitalize">
                  {family.role}
                </div>
              </div>
              {family.id === data.currentFamilyId && (
                <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
              )}
            </button>
          ))}

          <div className="border-t border-gray-100 mt-2 pt-2">
            <button
              onClick={() => {
                setIsOpen(false);
                router.navigate({ to: "/onboarding" });
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-left text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Plus className="w-4 h-4" />
              </div>
              <span className="font-medium">Create New Family</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
