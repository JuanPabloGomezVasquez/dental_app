import { vi } from "vitest";

// Allow importing server-only modules in unit tests
vi.mock("server-only", () => ({}));

// Make React.cache a pass-through so cached functions call the real implementation each time
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    cache: <T extends (...args: unknown[]) => unknown>(fn: T): T => fn,
  };
});
