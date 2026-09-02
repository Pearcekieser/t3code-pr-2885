import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { TimestampFormat } from "@t3tools/contracts/settings";
import { CheckIcon, ClockIcon, PinIcon } from "lucide-react";

import { cn } from "~/lib/utils";
import { Popover, PopoverTrigger } from "./ui/popover";
import { resolveSnoozePresets, type SnoozePreset } from "./Sidebar.snooze";
import {
  SIDEBAR_SWIPE_ACTION_WIDTH,
  clampSidebarSwipeOffset,
  resolveSidebarSwipeIntent,
  shouldOpenSidebarSwipe,
  type SidebarSwipeIntent,
} from "./Sidebar.swipe";
import { SidebarSnoozePresetList } from "./SidebarSnoozePresetList";

export function useMobileSidebarRowSwipe(props: {
  enabled: boolean;
  open: boolean;
  revealWidth: number;
  onOpenChange: (open: boolean) => void;
}) {
  const { enabled, open, revealWidth, onOpenChange } = props;
  const restingOffset = open ? -revealWidth : 0;
  const [offset, setOffset] = useState(restingOffset);
  const offsetRef = useRef(restingOffset);
  const [dragging, setDragging] = useState(false);
  const gestureRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originOffset: number;
    intent: SidebarSwipeIntent;
  } | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    if (!dragging) {
      offsetRef.current = restingOffset;
      setOffset(restingOffset);
    }
  }, [dragging, restingOffset]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled || !event.isPrimary || event.button !== 0) return;
      if ((event.target as HTMLElement).closest("button, a, input")) return;
      // Whole-row dnd listeners live on the parent <li>. Mobile horizontal
      // swipes own this pointer; vertical scrolling remains native via pan-y.
      event.stopPropagation();
      gestureRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originOffset: restingOffset,
        intent: "pending",
      };
      suppressClickRef.current = false;
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [enabled, restingOffset],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const gesture = gestureRef.current;
      if (gesture === null || gesture.pointerId !== event.pointerId) return;
      const deltaX = event.clientX - gesture.startX;
      const deltaY = event.clientY - gesture.startY;
      if (gesture.intent === "pending") {
        gesture.intent = resolveSidebarSwipeIntent(deltaX, deltaY);
        if (gesture.intent === "vertical") {
          gestureRef.current = null;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          return;
        }
      }
      if (gesture.intent !== "horizontal") return;
      event.preventDefault();
      setDragging(true);
      suppressClickRef.current = true;
      const nextOffset = clampSidebarSwipeOffset({
        originOffset: gesture.originOffset,
        deltaX,
        revealWidth,
      });
      offsetRef.current = nextOffset;
      setOffset(nextOffset);
    },
    [revealWidth],
  );

  const finishGesture = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const gesture = gestureRef.current;
      if (gesture === null || gesture.pointerId !== event.pointerId) return;
      gestureRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (gesture.intent !== "horizontal") return;
      const nextOpen = shouldOpenSidebarSwipe({ offset: offsetRef.current, revealWidth });
      setDragging(false);
      offsetRef.current = nextOpen ? -revealWidth : 0;
      setOffset(offsetRef.current);
      onOpenChange(nextOpen);
    },
    [onOpenChange, revealWidth],
  );

  const cancelGesture = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const gesture = gestureRef.current;
      if (gesture === null || gesture.pointerId !== event.pointerId) return;
      gestureRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      setDragging(false);
      suppressClickRef.current = false;
      offsetRef.current = restingOffset;
      setOffset(restingOffset);
    },
    [restingOffset],
  );

  const consumeSuppressedClick = useCallback(() => {
    if (!suppressClickRef.current) return false;
    suppressClickRef.current = false;
    return true;
  }, []);

  return {
    consumeSuppressedClick,
    dragging,
    offset,
    onPointerCancel: cancelGesture,
    onPointerDown,
    onPointerMove,
    onPointerUp: finishGesture,
  };
}

export function MobileSidebarSwipeActions(props: {
  open: boolean;
  showSettle: boolean;
  showSnooze: boolean;
  showPin: boolean;
  isPinned: boolean;
  timestampFormat: TimestampFormat;
  onSettle: () => void;
  onSnooze: (preset: SnoozePreset) => void;
  onPinToggle: () => void;
  onClose: () => void;
}) {
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const presets = useMemo(
    () => (snoozeOpen ? resolveSnoozePresets(new Date(), props.timestampFormat) : []),
    [props.timestampFormat, snoozeOpen],
  );
  useEffect(() => {
    if (!props.open) setSnoozeOpen(false);
  }, [props.open]);
  const actionClassName =
    "flex h-full shrink-0 cursor-pointer flex-col items-center justify-center gap-1 text-[11px] font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/80";
  const actionStyle = { width: SIDEBAR_SWIPE_ACTION_WIDTH };
  return (
    <div
      role="group"
      aria-label="Thread swipe actions"
      className="absolute inset-y-0.5 right-0 flex overflow-hidden rounded-r-md"
      inert={!props.open}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {props.showSettle ? (
        <button
          type="button"
          aria-label="Settle thread"
          style={actionStyle}
          onClick={(event) => {
            event.stopPropagation();
            props.onClose();
            props.onSettle();
          }}
          className={cn(actionClassName, "bg-emerald-600 active:bg-emerald-700")}
        >
          <CheckIcon aria-hidden className="size-5" />
          <span>Settle</span>
        </button>
      ) : null}
      {props.showSnooze ? (
        <Popover open={snoozeOpen} onOpenChange={setSnoozeOpen}>
          <PopoverTrigger
            render={
              <button
                type="button"
                aria-label="Snooze thread"
                style={actionStyle}
                onClick={(event) => event.stopPropagation()}
                className={cn(actionClassName, "bg-amber-700 active:bg-amber-800")}
              />
            }
          >
            <ClockIcon aria-hidden className="size-5" />
            <span>Snooze</span>
          </PopoverTrigger>
          <SidebarSnoozePresetList
            presets={presets}
            rowSize="touch"
            onSelect={(preset) => {
              setSnoozeOpen(false);
              props.onClose();
              props.onSnooze(preset);
            }}
          />
        </Popover>
      ) : null}
      {props.showPin ? (
        <button
          type="button"
          aria-label={props.isPinned ? "Unpin thread" : "Pin thread"}
          style={actionStyle}
          onClick={(event) => {
            event.stopPropagation();
            props.onClose();
            props.onPinToggle();
          }}
          className={cn(actionClassName, "bg-blue-600 active:bg-blue-700")}
        >
          <PinIcon aria-hidden className="size-5" />
          <span>{props.isPinned ? "Unpin" : "Pin"}</span>
        </button>
      ) : null}
    </div>
  );
}
