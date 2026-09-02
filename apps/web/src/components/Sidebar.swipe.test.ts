import { describe, expect, it } from "vite-plus/test";

import {
  clampSidebarSwipeOffset,
  resolveSidebarSwipeOpenThreadKey,
  resolveSidebarSwipeIntent,
  shouldOpenSidebarSwipe,
} from "./Sidebar.swipe";

describe("resolveSidebarSwipeIntent", () => {
  it("waits for enough movement before claiming a gesture", () => {
    expect(resolveSidebarSwipeIntent(-7, 0)).toBe("pending");
    expect(resolveSidebarSwipeIntent(3, 7)).toBe("pending");
  });

  it("claims only clearly horizontal movement", () => {
    expect(resolveSidebarSwipeIntent(-30, 8)).toBe("horizontal");
    expect(resolveSidebarSwipeIntent(-20, 18)).toBe("vertical");
  });

  it("keeps vertical scroll gestures vertical", () => {
    expect(resolveSidebarSwipeIntent(2, 20)).toBe("vertical");
    expect(resolveSidebarSwipeIntent(-8, 30)).toBe("vertical");
  });
});

describe("clampSidebarSwipeOffset", () => {
  it("reveals left-side movement without changing row geometry", () => {
    expect(clampSidebarSwipeOffset({ originOffset: 0, deltaX: -60, revealWidth: 216 })).toBe(-60);
  });

  it("does not drag beyond the tray or past the closed position", () => {
    expect(clampSidebarSwipeOffset({ originOffset: 0, deltaX: -300, revealWidth: 216 })).toBe(-216);
    expect(clampSidebarSwipeOffset({ originOffset: -216, deltaX: 300, revealWidth: 216 })).toBe(0);
  });
});

describe("shouldOpenSidebarSwipe", () => {
  it("opens after a deliberate reveal and otherwise settles closed", () => {
    expect(shouldOpenSidebarSwipe({ offset: -76, revealWidth: 216 })).toBe(true);
    expect(shouldOpenSidebarSwipe({ offset: -75, revealWidth: 216 })).toBe(false);
  });
});

describe("resolveSidebarSwipeOpenThreadKey", () => {
  it("opens the changed row and replaces any previously open row", () => {
    expect(
      resolveSidebarSwipeOpenThreadKey({
        currentThreadKey: "thread-a",
        changedThreadKey: "thread-b",
        open: true,
      }),
    ).toBe("thread-b");
  });

  it("only lets the currently open row close itself", () => {
    expect(
      resolveSidebarSwipeOpenThreadKey({
        currentThreadKey: "thread-a",
        changedThreadKey: "thread-b",
        open: false,
      }),
    ).toBe("thread-a");
    expect(
      resolveSidebarSwipeOpenThreadKey({
        currentThreadKey: "thread-a",
        changedThreadKey: "thread-a",
        open: false,
      }),
    ).toBeNull();
  });
});
