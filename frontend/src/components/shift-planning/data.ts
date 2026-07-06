export type Accent = "purple" | "cyan" | "green" | "yellow";
export type Status = "Open" | "Planned" | "In progress" | "Closed";

export interface WorkOrder {
  id: string;
  person: string;
  initials: string;
  avatarBg: string;
  title: string;
  hours: string;
  accent: Accent;
  system: string;
  datetime: string;
  status: Status;
}

export interface DayColumn {
  weekday: string;
  date: number;
  off?: boolean;
  orders: WorkOrder[];
}

export const days: DayColumn[] = [
  {
    weekday: "Monday",
    date: 15,
    orders: [
      {
        id: "m1",
        person: "John Mal...",
        initials: "JM",
        avatarBg: "#fbbf80",
        title: "Oil pump valved inspection",
        hours: "2 hr",
        accent: "green",
        system: "Conveyor belt system",
        datetime: "15.01.2020 09:00am",
        status: "Planned",
      },
      {
        id: "m2",
        person: "Andy Dick...",
        initials: "AD",
        avatarBg: "#8ec5ff",
        title: "Conveyor belt-system inspection",
        hours: "1 hr",
        accent: "cyan",
        system: "Conveyor belt system",
        datetime: "15.01.2020 11:30am",
        status: "Open",
      },
      {
        id: "m3",
        person: "John Mal...",
        initials: "JM",
        avatarBg: "#fbbf80",
        title: "Oil pump valved inspection",
        hours: "2 hr",
        accent: "green",
        system: "Oil pump unit",
        datetime: "15.01.2020 02:00pm",
        status: "Planned",
      },
    ],
  },
  {
    weekday: "Tuesday",
    date: 16,
    orders: [
      {
        id: "t1",
        person: "Kitya Sino...",
        initials: "KS",
        avatarBg: "#c4a5ff",
        title: "Main water pump repair work",
        hours: "3 hr",
        accent: "purple",
        system: "Water pump station",
        datetime: "16.01.2020 08:30am",
        status: "In progress",
      },
      {
        id: "t2",
        person: "Andy Dick...",
        initials: "AD",
        avatarBg: "#8ec5ff",
        title: "Conveyor belt-system inspection",
        hours: "1 hr",
        accent: "cyan",
        system: "Conveyor belt system",
        datetime: "16.01.2020 01:00pm",
        status: "Open",
      },
    ],
  },
  {
    weekday: "Wednesday",
    date: 17,
    orders: [
      {
        id: "w1",
        person: "David Ha...",
        initials: "DH",
        avatarBg: "#7dd3c0",
        title: "Monthly generator inspection",
        hours: "2 hr",
        accent: "cyan",
        system: "Generator room",
        datetime: "17.01.2020 10:00am",
        status: "Planned",
      },
    ],
  },
  {
    weekday: "Thursday",
    date: 18,
    orders: [
      {
        id: "th1",
        person: "Kitya Sino...",
        initials: "KS",
        avatarBg: "#c4a5ff",
        title: "Main water pump repair work",
        hours: "3 hr",
        accent: "purple",
        system: "Water pump station",
        datetime: "18.01.2020 08:30am",
        status: "In progress",
      },
      {
        id: "th2",
        person: "John Mal...",
        initials: "JM",
        avatarBg: "#fbbf80",
        title: "Oil pump valved inspection",
        hours: "1 hr",
        accent: "green",
        system: "Conveyor belt system",
        datetime: "18.01.2020 10:30pm",
        status: "Open",
      },
    ],
  },
  { weekday: "Friday", date: 19, off: true, orders: [] },
  { weekday: "Saturday", date: 20, off: true, orders: [] },
  {
    weekday: "Sunday",
    date: 21,
    orders: [
      {
        id: "s1",
        person: "Kitya Sino...",
        initials: "KS",
        avatarBg: "#c4a5ff",
        title: "Main water pump repair work",
        hours: "3 hr",
        accent: "purple",
        system: "Water pump station",
        datetime: "21.01.2020 09:00am",
        status: "In progress",
      },
      {
        id: "s2",
        person: "David Ha...",
        initials: "DH",
        avatarBg: "#fcd34d",
        title: "Monthly generator inspection",
        hours: "1 hr",
        accent: "yellow",
        system: "Generator room",
        datetime: "21.01.2020 03:00pm",
        status: "Planned",
      },
    ],
  },
];

export const calendarWeeks: (number | null)[][] = [
  [null, null, 1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10, 11, 12],
  [13, 14, 15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24, 25, 26],
  [27, 28, 29, 30, 31, null, null],
];

export const months = ["JANUARY 2020", "FEBRUARY 2020", "MARCH 2020"];
