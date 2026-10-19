export type BoardRecord = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: "low" | "medium" | "high";
  assignee: string;
  due: string;
  amount: number;
  project: string;
};
export const tasksSeed: BoardRecord[] = [
  {
    id: "task-1",
    title: "Refine the onboarding flow",
    description:
      "Review the first three steps and make room for clearer guidance.",
    status: "todo",
    priority: "high",
    assignee: "Isabel Torres",
    due: "2026-10-21",
    amount: 0,
    project: "Product",
  },
  {
    id: "task-2",
    title: "Document the color tokens",
    description: "Include semantic names, both themes and usage examples.",
    status: "todo",
    priority: "medium",
    assignee: "Alex Morgan",
    due: "2026-10-23",
    amount: 0,
    project: "Design",
  },
  {
    id: "task-3",
    title: "Build the customer table",
    description: "Sorting, filtering, pagination and selection states.",
    status: "progress",
    priority: "high",
    assignee: "Leo Martin",
    due: "2026-10-20",
    amount: 0,
    project: "Engineering",
  },
  {
    id: "task-4",
    title: "Explore the new dashboard",
    description: "A quieter layout with a clearer hierarchy.",
    status: "progress",
    priority: "medium",
    assignee: "Isabel Torres",
    due: "2026-10-22",
    amount: 0,
    project: "Design",
  },
  {
    id: "task-5",
    title: "Review keyboard navigation",
    description: "Test dialogs, menus, forms and the command palette.",
    status: "review",
    priority: "high",
    assignee: "Noor Ahmed",
    due: "2026-10-19",
    amount: 0,
    project: "Product",
  },
  {
    id: "task-6",
    title: "Set up local demo adapters",
    description: "Keep persistence and example data out of the UI primitives.",
    status: "done",
    priority: "medium",
    assignee: "Leo Martin",
    due: "2026-10-16",
    amount: 0,
    project: "Engineering",
  },
  {
    id: "task-7",
    title: "Define the editorial type scale",
    description:
      "Use Manrope for UI and Instrument Serif for selected headings.",
    status: "done",
    priority: "low",
    assignee: "Alex Morgan",
    due: "2026-10-15",
    amount: 0,
    project: "Design",
  },
  {
    id: "task-8",
    title: "Write the release notes",
    description: "Describe what changed, why, and how to adopt it.",
    status: "todo",
    priority: "low",
    assignee: "Noor Ahmed",
    due: "2026-10-25",
    amount: 0,
    project: "Product",
  },
];
export const dealsSeed: BoardRecord[] = [
  {
    id: "deal-1",
    title: "Northstar Studio",
    description: "Design system for a growing product team.",
    status: "lead",
    priority: "medium",
    assignee: "Alex Morgan",
    due: "2026-10-27",
    amount: 24800,
    project: "Design system",
  },
  {
    id: "deal-2",
    title: "Forma Collective",
    description: "A complete commerce workspace.",
    status: "lead",
    priority: "low",
    assignee: "Isabel Torres",
    due: "2026-11-03",
    amount: 12600,
    project: "Commerce",
  },
  {
    id: "deal-3",
    title: "Layers Platform",
    description: "Platform expansion and account workflows.",
    status: "qualified",
    priority: "high",
    assignee: "Leo Martin",
    due: "2026-10-24",
    amount: 18600,
    project: "Platform",
  },
  {
    id: "deal-4",
    title: "Arc Labs",
    description: "A focused analytics application.",
    status: "qualified",
    priority: "medium",
    assignee: "Alex Morgan",
    due: "2026-10-29",
    amount: 32000,
    project: "Analytics",
  },
  {
    id: "deal-5",
    title: "Sisyphus Systems",
    description: "Enterprise rollout with a shared design language.",
    status: "proposal",
    priority: "high",
    assignee: "Isabel Torres",
    due: "2026-10-22",
    amount: 42500,
    project: "Enterprise",
  },
  {
    id: "deal-6",
    title: "Circo Studio",
    description: "Customer relationships and team collaboration.",
    status: "proposal",
    priority: "medium",
    assignee: "Noor Ahmed",
    due: "2026-10-26",
    amount: 16400,
    project: "CRM",
  },
  {
    id: "deal-7",
    title: "Goodform",
    description: "A considered start for their new product.",
    status: "won",
    priority: "medium",
    assignee: "Alex Morgan",
    due: "2026-10-15",
    amount: 28400,
    project: "SaaS",
  },
];
export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  category: "design" | "product" | "team";
  description: string;
};
export const calendarSeed: CalendarEvent[] = [
  {
    id: "event-1",
    title: "Design review",
    date: "2026-10-19",
    time: "10:00",
    duration: 60,
    category: "design",
    description: "Review the next set of component patterns.",
  },
  {
    id: "event-2",
    title: "Product planning",
    date: "2026-10-20",
    time: "09:30",
    duration: 45,
    category: "product",
    description: "Choose the next small, meaningful improvements.",
  },
  {
    id: "event-3",
    title: "Team check-in",
    date: "2026-10-22",
    time: "11:00",
    duration: 30,
    category: "team",
    description: "A shared look at the week.",
  },
  {
    id: "event-4",
    title: "Customer interviews",
    date: "2026-10-23",
    time: "14:00",
    duration: 90,
    category: "product",
    description: "Learn from people using the demo product.",
  },
  {
    id: "event-5",
    title: "Library handoff",
    date: "2026-10-27",
    time: "15:00",
    duration: 60,
    category: "design",
    description: "Connect the design decisions to implementation.",
  },
  {
    id: "event-6",
    title: "October retrospective",
    date: "2026-10-30",
    time: "16:00",
    duration: 60,
    category: "team",
    description: "Keep what worked. Improve what didn’t.",
  },
];
export type MailRecord = {
  id: string;
  from: string;
  email: string;
  subject: string;
  body: string;
  date: string;
  read: boolean;
  starred: boolean;
  folder: "inbox" | "sent" | "archive" | "drafts";
};
export const mailSeed: MailRecord[] = [
  {
    id: "mail-1",
    from: "Isabel Torres",
    email: "isabel@studio.demo",
    subject: "A little clarity on the next release",
    body: "Hi Alex,\n\nI’ve put together a few thoughts on the onboarding flow. The new hierarchy feels much clearer, and the smaller details are starting to belong together.\n\nCould we review the three remaining states in our design session tomorrow?\n\nThanks,\nIsabel",
    date: "2026-10-18T10:30:00-05:00",
    read: false,
    starred: true,
    folder: "inbox",
  },
  {
    id: "mail-2",
    from: "Leo Martin",
    email: "leo@studio.demo",
    subject: "The customer table is ready for review",
    body: "Hi team,\n\nSorting, filtering and bulk actions are now connected to the local demo adapter. I’ve also added the empty and error states.\n\nI’d appreciate a keyboard review before we wrap up.\n\nLeo",
    date: "2026-10-18T09:15:00-05:00",
    read: false,
    starred: false,
    folder: "inbox",
  },
  {
    id: "mail-3",
    from: "Noor Ahmed",
    email: "noor@studio.demo",
    subject: "Notes from this week’s customer conversations",
    body: "Hi Alex,\n\nThree themes kept coming up: clearer setup, fewer distractions and better examples. The new documentation should address all three.\n\nI’ve included the findings in our local project notes.\n\nNoor",
    date: "2026-10-17T14:20:00-05:00",
    read: true,
    starred: false,
    folder: "inbox",
  },
  {
    id: "mail-4",
    from: "Studio Updates",
    email: "updates@studio.demo",
    subject: "Your weekly workspace digest",
    body: "A thoughtful look back at your week.\n\n8 tasks updated\n3 design reviews completed\n2 new component patterns explored\n\nAll figures in this message are illustrative demo data.",
    date: "2026-10-16T08:00:00-05:00",
    read: true,
    starred: false,
    folder: "inbox",
  },
  {
    id: "mail-5",
    from: "Alex Morgan",
    email: "alex@studio.demo",
    subject: "Re: Design system handoff",
    body: "Thanks for the review. The semantic token names and component descriptions are now ready for the next handoff.",
    date: "2026-10-15T11:00:00-05:00",
    read: true,
    starred: false,
    folder: "sent",
  },
  {
    id: "mail-6",
    from: "Forma Collective",
    email: "hello@forma.demo",
    subject: "A good start to the project",
    body: "Hi Alex,\n\nThank you for the thoughtful kickoff. We’re looking forward to bringing the next version of our product to life.\n\nThe Forma team",
    date: "2026-10-12T09:00:00-05:00",
    read: true,
    starred: true,
    folder: "archive",
  },
];
export type ChatRecord = {
  id: string;
  room: string;
  author: string;
  body: string;
  time: string;
};
export const chatSeed: ChatRecord[] = [
  {
    id: "chat-1",
    room: "general",
    author: "Isabel Torres",
    body: "A good day to build. The new overview is ready for a closer look.",
    time: "09:20",
  },
  {
    id: "chat-2",
    room: "general",
    author: "Leo Martin",
    body: "The customer table feels much calmer now. I’ll connect the filters next.",
    time: "09:24",
  },
  {
    id: "chat-3",
    room: "general",
    author: "Alex Morgan",
    body: "Thanks both. Let’s keep the next round focused on the details that help people move forward.",
    time: "09:28",
  },
  {
    id: "chat-4",
    room: "design",
    author: "Isabel Torres",
    body: "I’ve refined the type scale and the dark theme tokens.",
    time: "10:10",
  },
  {
    id: "chat-5",
    room: "engineering",
    author: "Leo Martin",
    body: "The adapter boundary is in place. UI components stay independent from persistence.",
    time: "10:15",
  },
];
export type SupportTicket = {
  id: string;
  subject: string;
  customer: string;
  email: string;
  status: "open" | "progress" | "resolved";
  priority: "low" | "medium" | "high";
  message: string;
  created: string;
  reply: string;
};
export const ticketsSeed: SupportTicket[] = [
  {
    id: "AF-1042",
    subject: "Help importing design tokens",
    customer: "Olivia Rhye",
    email: "olivia@layers.demo",
    status: "open",
    priority: "high",
    message:
      "How can I keep the color tokens in sync between Figma and the application?",
    created: "2026-10-18",
    reply: "",
  },
  {
    id: "AF-1041",
    subject: "A question about team seats",
    customer: "Phoenix Baker",
    email: "phoenix@sisyphus.demo",
    status: "progress",
    priority: "medium",
    message: "Can we add a fifth team member to the workspace preview?",
    created: "2026-10-17",
    reply: "We’re reviewing the team settings together.",
  },
  {
    id: "AF-1040",
    subject: "Changing the application locale",
    customer: "Lana Steiner",
    email: "lana@catalog.demo",
    status: "resolved",
    priority: "low",
    message: "Where can I switch the interface to Spanish?",
    created: "2026-10-16",
    reply:
      "Use the language selector in the header, or Preferences under Settings.",
  },
  {
    id: "AF-1039",
    subject: "Keyboard shortcut for search",
    customer: "Demi Wilkinson",
    email: "demi@circo.demo",
    status: "open",
    priority: "low",
    message: "Is there a quick way to navigate between screens?",
    created: "2026-10-15",
    reply: "",
  },
  {
    id: "AF-1038",
    subject: "Exporting the customer list",
    customer: "Drew Cano",
    email: "drew@northstar.demo",
    status: "progress",
    priority: "medium",
    message: "I’d like to download a CSV of the current customers.",
    created: "2026-10-14",
    reply: "",
  },
];
