import React from "react";
import Popover from "@mui/material/Popover";
import type { PopoverProps } from "@mui/material/Popover";
import Box from "@mui/material/Box";
import { AppointmentTooltip } from "@devexpress/dx-react-scheduler-material-ui";

export type ScheduleTooltipPopoverProps = {
  open: boolean;
  anchorEl: HTMLElement | null;
  /** Called when the popover should dismiss (backdrop, Escape, or close button). */
  onDismiss: () => void;
  showCloseButton?: boolean;
  commandButtonComponent: React.ComponentType<
    React.ComponentProps<typeof AppointmentTooltip.CommandButton>
  >;
  children: React.ReactNode;
};

/**
 * Shared non-blocking popover frame for schedule tooltips (same as calendar appointment popovers).
 */
export const ScheduleTooltipPopover: React.FC<ScheduleTooltipPopoverProps> = ({
  open,
  anchorEl,
  onDismiss,
  showCloseButton,
  commandButtonComponent: CommandButton,
  children,
}) => {
  const handlePopoverClose: NonNullable<PopoverProps["onClose"]> = (
    _event,
    _reason
  ) => {
    onDismiss();
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={handlePopoverClose}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      transformOrigin={{ vertical: "top", horizontal: "center" }}
      marginThreshold={0}
      PaperProps={{
        className: "schedule-tooltip-popover-paper",
        elevation: 8,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          p: 0,
          m: 0,
          gap: 0,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
        {showCloseButton ? (
          <Box
            sx={{
              flexShrink: 0,
              alignSelf: "flex-start",
              mt: 0.25,
              mr: 0.25,
            }}
          >
            <CommandButton id="close" onExecute={onDismiss} />
          </Box>
        ) : null}
      </Box>
    </Popover>
  );
};
