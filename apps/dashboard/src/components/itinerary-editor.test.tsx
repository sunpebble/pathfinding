import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ItineraryEditor } from "./itinerary-editor";
import * as convexReact from "convex/react";

// Create a controlled promise
let resolveMutation: any;
const pendingMutation = new Promise((resolve) => {
  resolveMutation = resolve;
});

// Mock convex/react hooks
const mockMutate = vi.fn().mockReturnValue(pendingMutation);

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => mockMutate),
}));

// Mock api object
vi.mock("@pathfinding/convex-client", () => ({
  api: {
    itineraries: {
      getById: "getById",
    },
    itineraryItems: {
      create: "create",
      update: "update",
      remove: "remove",
      reorder: "reorder",
    },
    pois: {
      search: "search",
    },
  },
}));

// Mock Lucide icons
vi.mock("lucide-react", async () => {
  const actual = await vi.importActual("lucide-react");
  return {
    ...actual,
    Loader2: (props: any) => <div data-testid="loader" {...props} />,
  };
});

describe("ItineraryEditor Accessibility", () => {
  const mockDays = [
    {
      _id: "day-1",
      dayNumber: 1,
      date: "2023-10-27",
      items: [
        {
          _id: "item-1",
          poiId: "poi-1",
          orderIndex: 0,
          startTime: "10:00",
          endTime: "12:00",
          transportMode: "walking",
          notes: "Walk to the park",
          poi: {
            id: "poi-1",
            name: "Central Park",
            category: "attraction",
            latitude: 0,
            longitude: 0,
            address: "New York, NY",
            rating: 4.5,
          },
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (convexReact.useQuery as any).mockImplementation((query: any) => {
      if (query === "getById") {
        return {
          _id: "itinerary-1",
          cityId: "city-1",
          days: mockDays,
        };
      }
      if (query === "search") {
        return [];
      }
      return undefined;
    });
  });

  it("renders search input and category select with accessible labels", async () => {
    render(
      <ItineraryEditor
        isOpen={true}
        onClose={() => {}}
        itineraryId="itinerary-1"
        days={mockDays}
        userId="user-1"
      />,
    );

    // Find the "Add POI" button in Day 1 section
    const addPoiButtons = screen.getAllByRole("button", { name: /Add POI/i });
    expect(addPoiButtons[0]).toHaveAttribute("aria-expanded", "false");

    // Click "Add POI" to reveal search inputs
    fireEvent.click(addPoiButtons[0]);

    // Check if aria-expanded toggled
    const cancelButtons = screen.getAllByRole("button", { name: /Cancel/i });
    expect(cancelButtons[0]).toHaveAttribute("aria-expanded", "true");

    // Check for accessible labels
    expect(
      screen.getByLabelText(/Search points of interest/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Filter by category/i)).toBeInTheDocument();
  });

  it("associates labels with inputs in ItemEditor", async () => {
    render(
      <ItineraryEditor
        isOpen={true}
        onClose={() => {}}
        itineraryId="itinerary-1"
        days={mockDays}
        userId="user-1"
      />,
    );

    // Find Expand button for the item
    const expandButtons = screen.getAllByRole("button", { name: /Expand/i });
    fireEvent.click(expandButtons[0]);

    // Check if inputs are accessible by label text
    expect(screen.getByLabelText(/Start Time/i)).toHaveAttribute(
      "type",
      "time",
    );
    expect(screen.getByLabelText(/End Time/i)).toHaveAttribute("type", "time");
    expect(screen.getByLabelText(/Transport Mode/i)).toHaveValue("walking");
    expect(screen.getByLabelText(/Notes/i)).toBeInTheDocument();
  });

  it("shows loading state when saving", async () => {
    render(
      <ItineraryEditor
        isOpen={true}
        onClose={() => {}}
        itineraryId="itinerary-1"
        days={mockDays}
        userId="user-1"
      />,
    );

    // Expand item
    const expandButtons = screen.getAllByRole("button", { name: /Expand/i });
    fireEvent.click(expandButtons[0]);

    // Find Save button
    const saveButton = screen.getByRole("button", { name: /Save Changes/i });
    expect(saveButton).toBeInTheDocument();

    // Trigger save
    fireEvent.click(saveButton);

    // Should show loading text "Saving..." and disabled state
    expect(screen.getByText("Saving...")).toBeInTheDocument();
    expect(saveButton).toBeDisabled();
    expect(screen.getByTestId("loader")).toBeInTheDocument();
  });
});
