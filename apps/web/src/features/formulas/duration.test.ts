import { describe, expect, test } from "bun:test";
import { formatClock, formatDuration, formatPace, joinDuration, parseIsoDuration, splitDuration } from "./duration";

describe("parseIsoDuration", () => {
  test("reads hours, minutes and seconds", () => {
    expect(parseIsoDuration("PT27M40S")).toBe(1660);
    expect(parseIsoDuration("PT2H40M")).toBe(9600);
    expect(parseIsoDuration("PT120M")).toBe(7200);
    expect(parseIsoDuration("PT45S")).toBe(45);
  });

  test("reads days, weeks and decimal parts", () => {
    expect(parseIsoDuration("P3D")).toBe(259_200);
    expect(parseIsoDuration("P2W")).toBe(1_209_600);
    expect(parseIsoDuration("P1DT12H")).toBe(129_600);
    expect(parseIsoDuration("PT1.5H")).toBe(5400);
    expect(parseIsoDuration("PT10.5S")).toBe(10.5);
  });

  test("rejects anything that is not a fixed-length ISO 8601 duration", () => {
    for (const text of ["", "P", "PT", "P1DT", "27:40", "PT27M40", "pt27m", "P1Y", "P6M", " PT5M", "PT5M ", "PT-5M", "PT5M30H"]) {
      expect(parseIsoDuration(text)).toBeUndefined();
    }
  });
});

describe("formatDuration", () => {
  test("shows minutes and seconds under an hour", () => {
    expect(formatDuration(1660)).toBe("27:40");
    expect(formatDuration(3599)).toBe("59:59");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(2700)).toBe("45 min");
  });

  test("shows hours and minutes from an hour up", () => {
    expect(formatDuration(9600)).toBe("2 h 40 min");
    expect(formatDuration(7200)).toBe("2 h");
    expect(formatDuration(3725)).toBe("1 h 2 min 5 s");
    expect(formatDuration(95_400)).toBe("26 h 30 min");
  });

  test("shows whole days as days and short times in seconds", () => {
    expect(formatDuration(259_200)).toBe("3 days");
    expect(formatDuration(86_400)).toBe("1 day");
    expect(formatDuration(45)).toBe("45 s");
    expect(formatDuration(10.5)).toBe("10.5 s");
  });
});

describe("splitDuration and joinDuration", () => {
  test("round-trip whole seconds", () => {
    expect(splitDuration(9640)).toEqual({ hours: 2, minutes: 40, seconds: 40 });
    expect(joinDuration(splitDuration(9640))).toBe(9640);
    expect(splitDuration(259_200)).toEqual({ hours: 72, minutes: 0, seconds: 0 });
  });
});

describe("formatClock and formatPace", () => {
  test("show minutes and seconds, with hours when needed", () => {
    expect(formatClock(300)).toBe("5:00");
    expect(formatClock(332.4)).toBe("5:32");
    expect(formatClock(3725)).toBe("1:02:05");
    expect(formatPace(330, "km")).toBe("5:30/km");
  });
});
