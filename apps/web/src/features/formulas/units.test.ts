import { describe, expect, test } from "bun:test";
import { convert, groupOf, isCurrency, isMeasure } from "./units";

describe("units", () => {
  test("converts within a dimension with fixed factors", () => {
    expect(convert(1, "mi", "km")).toBeCloseTo(1.609344, 6);
    expect(convert(2.5, "kg", "lb")).toBeCloseTo(5.5116, 4);
    expect(convert(750, "ml", "l")).toBe(0.75);
    expect(convert(5, "km", "km")).toBe(5);
  });

  test("never converts across dimensions", () => {
    expect(convert(1, "km", "kg")).toBeUndefined();
    expect(convert(1, "l", "m")).toBeUndefined();
  });

  test("groups measures by dimension and money by ISO code only", () => {
    expect(groupOf("mi")).toBe("length");
    expect(groupOf("oz")).toBe("mass");
    expect(groupOf("EUR")).toBe("EUR");
    expect(groupOf("eur")).toBeUndefined();
    expect(groupOf("miles")).toBeUndefined();
    expect(isCurrency("GBP")).toBe(true);
    expect(isCurrency("XYZ")).toBe(false);
    expect(isMeasure("km")).toBe(true);
    expect(isMeasure("KM")).toBe(false);
  });
});
