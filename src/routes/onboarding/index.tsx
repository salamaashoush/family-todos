import { createFileRoute, useRouter, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getOnboardingStatus,
  createFamily,
  addMemberOnboarding,
  getTemplates,
  applyTemplate,
  createTodoOnboarding,
  completeOnboarding,
} from "../../server/onboarding";
import { getAccountStatus } from "../../server/auth";
import { getMembers } from "../../server/members";
import { getTimeslots } from "../../server/timeslots";
import { getTodos } from "../../server/todos";
import { Button, Input } from "../../components/shared";
import {
  Users,
  Clock,
  CheckSquare,
  ChevronRight,
  ChevronLeft,
  Plus,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/onboarding/")({
  component: OnboardingPage,
  beforeLoad: async () => {
    // Check authentication and account status
    const auth = await getAccountStatus();
    if (!auth.authenticated) {
      throw redirect({ to: "/login" });
    }

    // Check if account is active (super admins bypass this check)
    if (!auth.isSuperAdmin && auth.accountStatus !== "active") {
      throw redirect({ to: "/account-status" });
    }

    return auth;
  },
  loader: async () => {
    const status = await getOnboardingStatus();
    return status;
  },
});

type OnboardingStep = "family" | "members" | "timeslots" | "todos" | "review";

const STEPS: { id: OnboardingStep; label: string; icon: React.ReactNode }[] = [
  { id: "family", label: "Create Family", icon: <Users className="w-5 h-5" /> },
  { id: "members", label: "Add Members", icon: <Users className="w-5 h-5" /> },
  { id: "timeslots", label: "Set Schedules", icon: <Clock className="w-5 h-5" /> },
  { id: "todos", label: "Add Tasks", icon: <CheckSquare className="w-5 h-5" /> },
  { id: "review", label: "Review", icon: <Sparkles className="w-5 h-5" /> },
];

function OnboardingPage() {
  const router = useRouter();
  const loaderData = Route.useLoaderData();

  // If already onboarded, redirect to main app
  if (loaderData.isOnboarded) {
    router.navigate({ to: "/" });
    return null;
  }

  // Determine initial step
  const initialStep: OnboardingStep = loaderData.step === "signup" ? "family" : loaderData.step;
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(initialStep);

  const renderStep = () => {
    switch (currentStep) {
      case "family":
        return <FamilyStep onComplete={() => setCurrentStep("members")} />;
      case "members":
        return (
          <MembersStep
            onComplete={() => setCurrentStep("timeslots")}
            onBack={() => setCurrentStep("family")}
          />
        );
      case "timeslots":
        return (
          <TimeslotsStep
            onComplete={() => setCurrentStep("todos")}
            onBack={() => setCurrentStep("members")}
          />
        );
      case "todos":
        return (
          <TodosStep
            onComplete={() => setCurrentStep("review")}
            onBack={() => setCurrentStep("timeslots")}
          />
        );
      case "review":
        return <ReviewStep onBack={() => setCurrentStep("todos")} />;
      default:
        return null;
    }
  };

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Progress Steps */}
        <nav className="mb-8">
          <ol className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <li key={step.id} className="flex items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all
                    ${
                      index === currentStepIndex
                        ? "bg-blue-600 text-white shadow-lg"
                        : index < currentStepIndex
                          ? "bg-green-500 text-white"
                          : "bg-gray-200 text-gray-600"
                    }
                  `}
                >
                  {step.icon}
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-8 sm:w-12 h-1 mx-1 sm:mx-2 rounded ${
                      index < currentStepIndex ? "bg-green-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </li>
            ))}
          </ol>
          <div className="mt-2 text-center text-sm text-gray-600">
            Step {currentStepIndex + 1} of {STEPS.length}: {STEPS[currentStepIndex]?.label}
          </div>
        </nav>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">{renderStep()}</div>
      </div>
    </div>
  );
}

// Helper to get user-friendly error message
function getFriendlyErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Something went wrong. Please try again.";
  }

  const message = error.message.toLowerCase();

  // Handle common database/validation errors
  if (message.includes("not authenticated")) {
    return "Your session has expired. Please log in again.";
  }
  if (message.includes("family name is required") || message.includes("min")) {
    return "Please enter a name for your family.";
  }
  if (message.includes("max") || message.includes("too long")) {
    return "Family name is too long. Please use a shorter name.";
  }

  // Generic fallback with the original message
  return error.message || "Something went wrong. Please try again.";
}

// Step 1: Create Family
function FamilyStep({ onComplete }: { onComplete: () => void }) {
  const queryClient = useQueryClient();

  const createFamilyMutation = useMutation({
    mutationFn: createFamily,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["onboarding-status"] });
      onComplete();
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = (formData.get("name") as string).trim();

    if (!name) {
      return;
    }

    createFamilyMutation.mutate({
      data: { name },
    });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome! Let's set up your family</h2>
      <p className="text-gray-600 mb-6">
        First, give your family a name. This will be displayed on your task board.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          id="name"
          name="name"
          type="text"
          label="Family Name"
          placeholder="e.g., The Smith Family"
          required
          maxLength={100}
        />

        {createFamilyMutation.error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl">
            {getFriendlyErrorMessage(createFamilyMutation.error)}
          </div>
        )}

        <Button type="submit" isLoading={createFamilyMutation.isPending} fullWidth>
          Continue <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </form>
    </div>
  );
}

// Step 2: Add Members
function MembersStep({
  onComplete,
  onBack,
}: {
  onComplete: () => void;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);

  const membersQuery = useQuery({
    queryKey: ["members"],
    queryFn: () => getMembers(),
  });

  const addMemberMutation = useMutation({
    mutationFn: addMemberOnboarding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      setShowAddForm(false);
    },
  });

  const handleAddMember = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    addMemberMutation.mutate({
      data: {
        name: formData.get("name") as string,
        isParent: formData.get("isParent") === "true",
      },
    });
  };

  const members = membersQuery.data || [];
  const canContinue = members.length > 0;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Who's in your family?</h2>
      <p className="text-gray-600 mb-6">
        Add family members who will be completing tasks. You can add more later.
      </p>

      {/* Member List */}
      <div className="space-y-3 mb-6">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-medium text-gray-800">{member.name}</div>
                {member.isParent && (
                  <span className="text-xs text-gray-500">Parent/Guardian</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {members.length === 0 && !showAddForm && (
          <div className="text-center py-8 text-gray-500">
            No members added yet. Add at least one family member to continue.
          </div>
        )}
      </div>

      {/* Add Member Form */}
      {showAddForm ? (
        <form onSubmit={handleAddMember} className="space-y-4 p-4 bg-blue-50 rounded-xl mb-6">
          <Input id="name" name="name" type="text" label="Member Name" required />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isParent"
              name="isParent"
              value="true"
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="isParent" className="text-sm text-gray-600">
              This is a parent/guardian
            </label>
          </div>
          <div className="flex gap-3">
            <Button type="submit" isLoading={addMemberMutation.isPending}>
              Add Member
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors mb-6"
        >
          <Plus className="w-5 h-5" />
          Add Family Member
        </button>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack}>
          <ChevronLeft className="w-5 h-5 mr-2" /> Back
        </Button>
        <Button onClick={onComplete} disabled={!canContinue}>
          Continue <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// Step 3: Timeslots/Templates
function TimeslotsStep({
  onComplete,
  onBack,
}: {
  onComplete: () => void;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [isApplying, setIsApplying] = useState(false);

  const membersQuery = useQuery({
    queryKey: ["members"],
    queryFn: () => getMembers(),
  });

  const templatesQuery = useQuery({
    queryKey: ["templates"],
    queryFn: () => getTemplates(),
  });

  const timeslotsQuery = useQuery({
    queryKey: ["timeslots"],
    queryFn: () => getTimeslots({ data: {} }),
  });

  const applyTemplateMutation = useMutation({
    mutationFn: applyTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeslots"] });
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });

  const members = membersQuery.data || [];
  const templates = templatesQuery.data || [];
  const timeslots = timeslotsQuery.data || [];

  // Filter out "blank" template and already added routines
  const addedTemplateNames = timeslots.map((t) => t.name);
  const availableTemplates = templates.filter(
    (t) => t.id !== "blank" && !addedTemplateNames.includes(t.name)
  );

  const handleApplyTemplates = async () => {
    if (selectedTemplates.length === 0 || selectedMemberIds.length === 0) return;

    setIsApplying(true);
    try {
      // Apply each template sequentially
      for (const templateId of selectedTemplates) {
        await applyTemplateMutation.mutateAsync({
          data: {
            templateId,
            memberIds: selectedMemberIds,
          },
        });
      }
      setSelectedTemplates([]);
      setSelectedMemberIds([]);
    } finally {
      setIsApplying(false);
    }
  };

  const toggleTemplate = (templateId: string) => {
    setSelectedTemplates((prev) =>
      prev.includes(templateId)
        ? prev.filter((id) => id !== templateId)
        : [...prev, templateId]
    );
  };

  const toggleMember = (memberId: number) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const selectAllMembers = () => {
    setSelectedMemberIds(members.map((m) => m.id));
  };

  const totalTasks = selectedTemplates.reduce((sum, templateId) => {
    const template = templates.find((t) => t.id === templateId);
    return sum + (template?.todoCount || 0);
  }, 0);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Set up your routines</h2>
      <p className="text-gray-600 mb-6">
        Select the routines you want to add. Each routine comes with suggested tasks that you can customize later.
      </p>

      {/* Existing Timeslots */}
      {timeslots.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Added Routines</h3>
          <div className="space-y-2">
            {timeslots.map((timeslot) => (
              <div key={timeslot.id} className="p-3 bg-green-50 rounded-xl flex items-center gap-3">
                <Clock className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-medium text-gray-800">{timeslot.name}</div>
                  <div className="text-sm text-gray-500">
                    {timeslot.startTime} - {timeslot.endTime}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Template Selection - Multi-select */}
      {availableTemplates.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">
            Select Routines to Add
            {selectedTemplates.length > 0 && (
              <span className="ml-2 text-sm font-normal text-blue-600">
                ({selectedTemplates.length} selected)
              </span>
            )}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {availableTemplates.map((template) => {
              const isSelected = selectedTemplates.includes(template.id);
              return (
                <button
                  key={template.id}
                  onClick={() => toggleTemplate(template.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all relative ${
                    isSelected
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                      <CheckSquare className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className="font-semibold text-gray-800">{template.name}</div>
                  <div className="text-sm text-gray-500">{template.description}</div>
                  {template.todoCount > 0 && (
                    <div className="text-xs text-blue-600 mt-1">{template.todoCount} tasks included</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Member Selection - shown when templates are selected */}
      {selectedTemplates.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-800">Who should do these routines?</h4>
            {members.length > 1 && (
              <button
                onClick={selectAllMembers}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Select All
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {members.map((member) => (
              <button
                key={member.id}
                onClick={() => toggleMember(member.id)}
                className={`px-4 py-2 rounded-full text-sm transition-all ${
                  selectedMemberIds.includes(member.id)
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-300 text-gray-700 hover:border-blue-400"
                }`}
              >
                {member.name}
              </button>
            ))}
          </div>

          {/* Summary */}
          <div className="text-sm text-gray-600 mb-4">
            Adding <span className="font-semibold">{selectedTemplates.length}</span> routine{selectedTemplates.length !== 1 ? "s" : ""}
            {totalTasks > 0 && (
              <> with <span className="font-semibold">{totalTasks}</span> task{totalTasks !== 1 ? "s" : ""}</>
            )}
            {selectedMemberIds.length > 0 && (
              <> for <span className="font-semibold">{selectedMemberIds.length}</span> member{selectedMemberIds.length !== 1 ? "s" : ""}</>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleApplyTemplates}
              isLoading={isApplying}
              disabled={selectedMemberIds.length === 0}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add {selectedTemplates.length} Routine{selectedTemplates.length !== 1 ? "s" : ""}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setSelectedTemplates([]);
                setSelectedMemberIds([]);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* All templates added message */}
      {availableTemplates.length === 0 && timeslots.length > 0 && (
        <div className="mb-6 p-4 bg-green-50 rounded-xl text-center">
          <Sparkles className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <p className="text-green-700 font-medium">All routines have been added!</p>
          <p className="text-sm text-green-600">You can customize them later in the admin panel.</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button variant="secondary" onClick={onBack}>
          <ChevronLeft className="w-5 h-5 mr-2" /> Back
        </Button>
        <Button onClick={onComplete}>
          {timeslots.length > 0 ? "Continue" : "Skip for now"}{" "}
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// Step 4: Todos
function TodosStep({
  onComplete,
  onBack,
}: {
  onComplete: () => void;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);

  const todosQuery = useQuery({
    queryKey: ["todos"],
    queryFn: () => getTodos({ data: {} }),
  });

  const timeslotsQuery = useQuery({
    queryKey: ["timeslots"],
    queryFn: () => getTimeslots({ data: {} }),
  });

  const createTodoMutation = useMutation({
    mutationFn: createTodoOnboarding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      setShowAddForm(false);
    },
  });

  const todos = todosQuery.data || [];
  const timeslots = timeslotsQuery.data || [];

  const handleAddTodo = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const timeslotIds = formData.getAll("timeslotIds").map(Number);

    if (timeslotIds.length === 0) {
      return;
    }

    createTodoMutation.mutate({
      data: {
        title: formData.get("title") as string,
        points: parseInt(formData.get("points") as string) || 5,
        timeslotIds,
      },
    });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Add tasks</h2>
      <p className="text-gray-600 mb-6">
        {todos.length > 0
          ? "Here are the tasks you've added. You can add more or continue."
          : "Add tasks that family members need to complete. You can always add more later."}
      </p>

      {/* Todo List */}
      {todos.length > 0 && (
        <div className="space-y-2 mb-6">
          {todos.map((todo) => (
            <div key={todo.id} className="p-3 bg-gray-50 rounded-xl flex items-center gap-3">
              <CheckSquare className="w-5 h-5 text-green-600" />
              <div className="flex-1">
                <div className="font-medium text-gray-800">{todo.title}</div>
                <div className="text-sm text-gray-500">{todo.points} points</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Todo Form */}
      {showAddForm && timeslots.length > 0 ? (
        <form onSubmit={handleAddTodo} className="space-y-4 p-4 bg-blue-50 rounded-xl mb-6">
          <Input id="title" name="title" type="text" label="Task Name" required />
          <Input
            id="points"
            name="points"
            type="number"
            label="Points"
            defaultValue="5"
            min="1"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Which routines include this task?
            </label>
            <div className="space-y-2">
              {timeslots.map((timeslot) => (
                <label key={timeslot.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="timeslotIds"
                    value={timeslot.id}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-600">{timeslot.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <Button type="submit" isLoading={createTodoMutation.isPending}>
              Add Task
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : showAddForm ? (
        <div className="p-4 bg-yellow-50 rounded-xl mb-6 text-yellow-800">
          You need to create at least one routine before adding tasks.
          <Button variant="secondary" onClick={onBack} className="mt-2">
            Go back to add routines
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors mb-6"
        >
          <Plus className="w-5 h-5" />
          Add Custom Task
        </button>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack}>
          <ChevronLeft className="w-5 h-5 mr-2" /> Back
        </Button>
        <Button onClick={onComplete}>
          {todos.length > 0 ? "Continue" : "Skip for now"}{" "}
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// Step 5: Review
function ReviewStep({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const membersQuery = useQuery({
    queryKey: ["members"],
    queryFn: () => getMembers(),
  });

  const timeslotsQuery = useQuery({
    queryKey: ["timeslots"],
    queryFn: () => getTimeslots({ data: {} }),
  });

  const todosQuery = useQuery({
    queryKey: ["todos"],
    queryFn: () => getTodos({ data: {} }),
  });

  const completeMutation = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      router.navigate({ to: "/admin" });
    },
  });

  const members = membersQuery.data || [];
  const timeslots = timeslotsQuery.data || [];
  const todos = todosQuery.data || [];

  const canComplete = members.length > 0;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">You're all set!</h2>
      <p className="text-gray-600 mb-6">
        Here's a summary of your family setup. You can always make changes later in the admin
        panel.
      </p>

      {/* Summary */}
      <div className="space-y-4 mb-8">
        <div className="p-4 bg-blue-50 rounded-xl">
          <div className="flex items-center gap-2 text-blue-800 font-semibold mb-2">
            <Users className="w-5 h-5" />
            {members.length} Family Member{members.length !== 1 ? "s" : ""}
          </div>
          <div className="text-sm text-blue-600">
            {members.map((m) => m.name).join(", ") || "None added"}
          </div>
        </div>

        <div className="p-4 bg-purple-50 rounded-xl">
          <div className="flex items-center gap-2 text-purple-800 font-semibold mb-2">
            <Clock className="w-5 h-5" />
            {timeslots.length} Routine{timeslots.length !== 1 ? "s" : ""}
          </div>
          <div className="text-sm text-purple-600">
            {timeslots.map((t) => t.name).join(", ") || "None added"}
          </div>
        </div>

        <div className="p-4 bg-green-50 rounded-xl">
          <div className="flex items-center gap-2 text-green-800 font-semibold mb-2">
            <CheckSquare className="w-5 h-5" />
            {todos.length} Task{todos.length !== 1 ? "s" : ""}
          </div>
          <div className="text-sm text-green-600">
            {todos
              .slice(0, 5)
              .map((t) => t.title)
              .join(", ") || "None added"}
            {todos.length > 5 && ` and ${todos.length - 5} more`}
          </div>
        </div>
      </div>

      {!canComplete && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 mb-6">
          You need at least one family member to complete setup.
        </div>
      )}

      {completeMutation.error && (
        <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
          {completeMutation.error instanceof Error
            ? completeMutation.error.message
            : "An error occurred"}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack}>
          <ChevronLeft className="w-5 h-5 mr-2" /> Back
        </Button>
        <Button
          onClick={() => completeMutation.mutate({ data: undefined })}
          isLoading={completeMutation.isPending}
          disabled={!canComplete}
        >
          Go to Dashboard <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
