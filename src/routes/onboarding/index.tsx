import { createFileRoute, useRouter } from "@tanstack/react-router";
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
    createFamilyMutation.mutate({
      data: {
        name: formData.get("name") as string,
      },
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
        />

        {createFamilyMutation.error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl">
            {createFamilyMutation.error instanceof Error
              ? createFamilyMutation.error.message
              : "An error occurred"}
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
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);

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
      setSelectedTemplate(null);
      setSelectedMemberIds([]);
    },
  });

  const members = membersQuery.data || [];
  const templates = templatesQuery.data || [];
  const timeslots = timeslotsQuery.data || [];

  const handleApplyTemplate = () => {
    if (!selectedTemplate || selectedMemberIds.length === 0) return;
    applyTemplateMutation.mutate({
      data: {
        templateId: selectedTemplate,
        memberIds: selectedMemberIds,
      },
    });
  };

  const toggleMember = (memberId: number) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Set up your routines</h2>
      <p className="text-gray-600 mb-6">
        Choose from our pre-made templates or create your own schedule. Templates include both
        the timeslot and suggested tasks.
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

      {/* Template Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Add a Routine</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => setSelectedTemplate(template.id)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                selectedTemplate === template.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-blue-300"
              }`}
            >
              <div className="font-semibold text-gray-800">{template.name}</div>
              <div className="text-sm text-gray-500">{template.description}</div>
              {template.todoCount > 0 && (
                <div className="text-xs text-blue-600 mt-1">{template.todoCount} tasks included</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Member Selection for Template */}
      {selectedTemplate && (
        <div className="mb-6 p-4 bg-blue-50 rounded-xl">
          <h4 className="font-medium text-gray-800 mb-3">Who should do this routine?</h4>
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
          <div className="flex gap-3">
            <Button
              onClick={handleApplyTemplate}
              isLoading={applyTemplateMutation.isPending}
              disabled={selectedMemberIds.length === 0}
            >
              Add Routine
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setSelectedTemplate(null);
                setSelectedMemberIds([]);
              }}
            >
              Cancel
            </Button>
          </div>
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
      router.navigate({ to: "/" });
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
          Start Using Family Board <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
