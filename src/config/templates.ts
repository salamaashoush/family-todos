export type TemplateTodo = {
  title: string;
  symbol: string;
  points: number;
};

export type Template = {
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  recurrenceType: "daily" | "weekly" | "monthly" | "none";
  recurrenceDays: string;
  todos: TemplateTodo[];
};

export const TEMPLATES = {
  "morning-routine": {
    name: "Morning Routine",
    description: "Start the day right with a healthy morning routine",
    startTime: "07:00",
    endTime: "08:30",
    recurrenceType: "weekly",
    recurrenceDays: "1,2,3,4,5",
    todos: [
      { title: "Wake Up", symbol: "\u{1F31E}", points: 5 },
      { title: "Brush Teeth", symbol: "\u{1FAA5}", points: 5 },
      { title: "Get Dressed", symbol: "\u{1F455}", points: 5 },
      { title: "Eat Breakfast", symbol: "\u{1F373}", points: 5 },
      { title: "Pack Bag", symbol: "\u{1F392}", points: 5 },
    ],
  },
  homework: {
    name: "Homework Time",
    description: "After school study and homework session",
    startTime: "16:00",
    endTime: "17:30",
    recurrenceType: "weekly",
    recurrenceDays: "1,2,3,4",
    todos: [
      { title: "Reading", symbol: "\u{1F4D6}", points: 10 },
      { title: "Math Practice", symbol: "\u{1F4F1}", points: 10 },
      { title: "Writing", symbol: "\u{270F}\u{FE0F}", points: 10 },
    ],
  },
  bedtime: {
    name: "Bedtime Routine",
    description: "Wind down for a good night's sleep",
    startTime: "19:30",
    endTime: "20:30",
    recurrenceType: "daily",
    recurrenceDays: "0,1,2,3,4,5,6",
    todos: [
      { title: "Bath Time", symbol: "\u{1F6C1}", points: 5 },
      { title: "Brush Teeth", symbol: "\u{1FAA5}", points: 5 },
      { title: "Put on Pajamas", symbol: "\u{1F319}", points: 5 },
      { title: "Story Time", symbol: "\u{1F4DA}", points: 5 },
    ],
  },
  chores: {
    name: "Weekend Chores",
    description: "Help around the house on weekends",
    startTime: "10:00",
    endTime: "12:00",
    recurrenceType: "weekly",
    recurrenceDays: "6",
    todos: [
      { title: "Make Bed", symbol: "\u{1F6CF}\u{FE0F}", points: 5 },
      { title: "Clean Room", symbol: "\u{2728}", points: 10 },
      { title: "Put Away Toys", symbol: "\u{1F9F8}", points: 5 },
      { title: "Help with Laundry", symbol: "\u{1F9FA}", points: 10 },
    ],
  },
  "after-school": {
    name: "After School",
    description: "Tasks to complete after getting home from school",
    startTime: "15:00",
    endTime: "16:00",
    recurrenceType: "weekly",
    recurrenceDays: "1,2,3,4,5",
    todos: [
      { title: "Unpack Bag", symbol: "\u{1F392}", points: 5 },
      { title: "Have a Snack", symbol: "\u{1F34E}", points: 5 },
      { title: "Share About Day", symbol: "\u{1F4AC}", points: 5 },
    ],
  },
  blank: {
    name: "Custom Routine",
    description: "Create your own routine from scratch",
    startTime: "09:00",
    endTime: "10:00",
    recurrenceType: "daily",
    recurrenceDays: "1,2,3,4,5",
    todos: [],
  },
} as const satisfies Record<string, Template>;

export type TemplateId = keyof typeof TEMPLATES;

export const TEMPLATE_IDS = Object.keys(TEMPLATES) as TemplateId[];
