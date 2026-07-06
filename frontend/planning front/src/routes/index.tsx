import { createFileRoute } from "@tanstack/react-router";
import ShiftPlanning from "@/components/shift-planning/ShiftPlanning";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Shift Planning · Workorders Week View" },
      {
        name: "description",
        content:
          "Plan and manage workorder shifts across the week with a clear, drag-friendly calendar dashboard.",
      },
      { property: "og:title", content: "Shift Planning · Workorders Week View" },
      {
        property: "og:description",
        content:
          "Plan and manage workorder shifts across the week with a clear calendar dashboard.",
      },
    ],
  }),
  component: ShiftPlanning,
});
