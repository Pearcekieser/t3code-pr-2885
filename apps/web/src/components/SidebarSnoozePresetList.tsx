import { cn } from "~/lib/utils";
import type { SnoozePreset } from "./Sidebar.snooze";
import { PopoverPopup } from "./ui/popover";

export function SidebarSnoozePresetList(props: {
  presets: ReadonlyArray<SnoozePreset>;
  rowSize?: "compact" | "touch";
  onSelect: (preset: SnoozePreset) => void;
}) {
  return (
    <PopoverPopup side="bottom" align="end" className="w-56" viewportClassName="p-1">
      {props.presets.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            props.onSelect(preset);
          }}
          className={cn(
            "flex w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-xs text-foreground/90 hover:bg-accent hover:text-foreground",
            props.rowSize === "touch" ? "py-2" : "py-1.5",
          )}
        >
          <span className="flex-1">{preset.label}</span>
          <span className="font-mono text-[10px] text-muted-foreground/60 tabular-nums">
            {preset.whenLabel}
          </span>
        </button>
      ))}
    </PopoverPopup>
  );
}
