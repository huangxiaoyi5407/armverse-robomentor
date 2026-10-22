import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "@/app/page";

describe("project foundation", () => {
  it("exposes the RoboMentor UR5 page title", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { level: 1, name: "RoboMentor UR5" })).toBeVisible();
  });

  it("clearly identifies demo mode without an AI key", () => {
    render(<HomePage />);

    expect(screen.getByRole("status", { name: "运行模式" })).toHaveTextContent("Demo 演示模式");
    expect(screen.getByRole("status", { name: "运行模式" })).toHaveTextContent("无需 AI 密钥");
  });
});
