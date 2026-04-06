import React from "react";
import type {
  AppointmentModel,
  FormatterFn,
  ValidResourceInstance,
} from "@devexpress/dx-react-scheduler";
import { AppointmentTooltip } from "@devexpress/dx-react-scheduler-material-ui";
import { ScheduleTooltipPopover } from "./ScheduleTooltipPopover";

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
    <ScheduleTooltipPopover
      open={!!visible}
      anchorEl={(target as HTMLElement) ?? null}
      onDismiss={() => {
        onHide?.();
      }}
      showCloseButton={showCloseButton}
      commandButtonComponent={CommandButton}
    >
      <Body
        appointmentData={data}
        appointmentResources={appointmentResources}
        formatDate={formatDate}
        recurringIconComponent={recurringIconComponent}
      />
    </ScheduleTooltipPopover>
  );
};
