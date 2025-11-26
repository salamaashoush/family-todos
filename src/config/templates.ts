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
      { title: "Wake Up", symbol: "sun", points: 5 },
      { title: "Brush Teeth", symbol: "sparkles", points: 5 },
      { title: "Get Dressed", symbol: "shirt", points: 5 },
      { title: "Eat Breakfast", symbol: "utensils", points: 5 },
      { title: "Pack Bag", symbol: "backpack", points: 5 },
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
      { title: "Reading", symbol: "book-open", points: 10 },
      { title: "Math Practice", symbol: "calculator", points: 10 },
      { title: "Writing", symbol: "pencil", points: 10 },
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
      { title: "Bath Time", symbol: "bath", points: 5 },
      { title: "Brush Teeth", symbol: "sparkles", points: 5 },
      { title: "Put on Pajamas", symbol: "moon", points: 5 },
      { title: "Story Time", symbol: "book", points: 5 },
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
      { title: "Make Bed", symbol: "bed-single", points: 5 },
      { title: "Clean Room", symbol: "sparkles", points: 10 },
      { title: "Put Away Toys", symbol: "toy-brick", points: 5 },
      { title: "Help with Laundry", symbol: "shirt", points: 10 },
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
      { title: "Unpack Bag", symbol: "backpack", points: 5 },
      { title: "Have a Snack", symbol: "apple", points: 5 },
      { title: "Share About Day", symbol: "message-circle", points: 5 },
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
