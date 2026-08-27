import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { AppLayout } from "../AppLayout";

describe("AppLayout", () => {
  it("renders the brand and all ten navigation links", () => {
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>,
    );

    expect(screen.getByText("Haven")).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(10);
  });
});
