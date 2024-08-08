import { addDays, startOfWeek } from "date-fns";
import { SelectedCalendarType } from "./Calendar";

const getCurrentWeekDayDate = (dayIndex: number) => {
  const start = startOfWeek(new Date(), { weekStartsOn: 0 });
  return addDays(start, dayIndex);
};

const adjustAppointmentsToCurrentWeek = (appointments: any[]) => {
  return appointments.map((appointment) => {
    const dayOfWeek = new Date(appointment.startDate).getDay();
    const currentWeekDate = getCurrentWeekDayDate(dayOfWeek);
    const startTime = new Date(appointment.startDate)
      .toISOString()
      .split("T")[1];
    const endTime = new Date(appointment.endDate).toISOString().split("T")[1];

    const newStartDate = `${
      currentWeekDate.toISOString().split("T")[0]
    }T${startTime}`;
    const newEndDate = `${
      currentWeekDate.toISOString().split("T")[0]
    }T${endTime}`;

    return {
      ...appointment,
      startDate: newStartDate,
      endDate: newEndDate,
    };
  });
};

const calendarMainFunc = (storedValue: any) => {
  if (storedValue) {
    try {
      const parsedValue: SelectedCalendarType = JSON.parse(storedValue);
      if (
        parsedValue &&
        Array.isArray(parsedValue.appointments) &&
        Array.isArray(parsedValue.combination)
      ) {
        const adjustedAppointments = adjustAppointmentsToCurrentWeek(
          parsedValue.appointments
        );
        return {
          combination: parsedValue.combination,
          appointments: adjustedAppointments,
        };
      }
    } catch (error) {
      return null;
    }
  }
  return null;
};

describe("adjustAppointmentsToCurrentWeek", () => {
  it("should adjust appointments to the current week", () => {
    const appointments = [
      {
        startDate: "2024-08-01T20:20:00Z",
        endDate: "2024-08-01T22:10:00Z",
      },
    ];

    // Mock the getCurrentWeekDayDate function
    //   jest.spyOn(global, 'Date').mockImplementation(() => new Date('2024-08-08T00:00:00Z'));

    const adjustedAppointments = adjustAppointmentsToCurrentWeek(appointments);

    expect(adjustedAppointments[0].startDate).toBe("2024-08-08T20:20:00.000Z");
    expect(adjustedAppointments[0].endDate).toBe("2024-08-08T22:10:00.000Z");
  });
});
