import React from "react";
import Popover from "@mui/material/Popover";
import Box from "@mui/material/Box";
import type {
  AppointmentModel,
  FormatterFn,
  ValidResourceInstance,
} from "@devexpress/dx-react-scheduler";
import { AppointmentTooltip } from "@devexpress/dx-react-scheduler-material-ui";

type LayoutProps = React.ComponentProps<typeof AppointmentTooltip.Layout>;

type TooltipBodyProps = {
  appointmentData: AppointmentModel;
  appointmentResources: ValidResourceInstance[];
  formatDate: FormatterFn;
  recurringIconComponent: React.ComponentType<object>;
};

/**
 * Single-row layout: body + close — avoids the default separate header strip and extra top gap.
 */
export const ScheduleAppointmentTooltipLayout: React.FC<LayoutProps> = ({
  contentComponent: Content,
  commandButtonComponent: CommandButton,
  appointmentMeta,
  appointmentResources,
  formatDate,
  onHide,
  recurringIconComponent,
  showCloseButton,
  visible,
}) => {
  const target = appointmentMeta?.target;
  const data = (appointmentMeta?.data ?? {}) as AppointmentModel;
  const Body = Content as React.ComponentType<TooltipBodyProps>;

  return (
    <Popover
      open={!!visible}
      anchorEl={(target as HTMLElement) ?? null}
      onClose={onHide}
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
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Body
            appointmentData={data}
            appointmentResources={appointmentResources}
            formatDate={formatDate}
            recurringIconComponent={recurringIconComponent}
          />
        </Box>
        {showCloseButton ? (
          <Box
            sx={{
              flexShrink: 0,
              alignSelf: "flex-start",
              mt: 0.25,
              mr: 0.25,
            }}
          >
            <CommandButton id="close" onExecute={onHide} />
          </Box>
        ) : null}
      </Box>
    </Popover>
  );
};
