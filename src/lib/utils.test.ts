import { describe, it, expect } from "vitest";
import { cn, formatCurrency, formatDate, debounce } from "./utils";

describe("utils", () => {
  describe("cn", () => {
    it("should merge class names", () => {
      expect(cn("foo", "bar")).toBe("foo bar");
    });

    it("should handle empty strings", () => {
      expect(cn("foo", "", "bar")).toBe("foo bar");
    });

    it("should handle falsy values", () => {
      // eslint-disable-next-line no-constant-binary-expression
      expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
    });
  });

  describe("formatCurrency", () => {
    it("should format US dollars", () => {
      expect(formatCurrency(99.99)).toBe("$99.99");
    });

    it("should format whole numbers", () => {
      expect(formatCurrency(100)).toBe("$100.00");
    });
  });

  describe("formatDate", () => {
    it("should format a date", () => {
      const result = formatDate(new Date(2024, 0, 15));
      expect(result).toMatch(/Jan\s+15,\s+2024/);
    });
  });

  describe("debounce", () => {
    it("should debounce function calls", () => {
      let callCount = 0;
      const debouncedFn = debounce(() => {
        callCount++;
      }, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      expect(callCount).toBe(0);
    });
  });
});