import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("agent API route", () => {
  it("rejects malformed requests", async () => {
    const response = await POST(new Request("http://localhost/api/agent", { method: "POST", body: JSON.stringify({ agent: "hacker", prompt: "run code" }) }));
    expect(response.status).toBe(400);
  });

  it("returns a validated response and never serializes configured secrets", async () => {
    const previous = process.env.AI_API_KEY;
    delete process.env.AI_API_KEY;
    try {
      const response = await POST(new Request("http://localhost/api/agent", { method: "POST", body: JSON.stringify({ agent: "tutor", prompt: "解释正运动学" }) }));
      const text = await response.text();
      expect(response.status).toBe(200);
      expect(text).toContain("Demo 演示模式");
      expect(text).not.toContain("AI_API_KEY");
    } finally {
      if (previous) process.env.AI_API_KEY = previous;
    }
  });
});
