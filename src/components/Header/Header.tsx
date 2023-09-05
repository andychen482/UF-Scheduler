import "./HeaderStyles.css";
import { AiOutlineCalendar } from "react-icons/ai";
import { PiGraphFill } from "react-icons/pi";

interface HeaderProps {
  calendarView: () => void;
  graphView: () => void;
  showDisplayWrite: boolean;
}

const Header: React.FC<HeaderProps> = ({ calendarView, graphView, showDisplayWrite }) => {
  return (
    <header className="header flex flex-row-reverse gap-x-10">
      <div className="mr-2">
        <h1>UFScheduler</h1>
      </div>
      <div className="button-container gap-x-4">
        <button
          className={`Button cursor-pointer text-gray-400 ${showDisplayWrite ? "show" : "grayed"}`}
          onClick={graphView}
        >
          <div className="button-content">
            <div className="icon-text-container">
              <PiGraphFill />
              <span className="text-[1.0rem] ml-2 overflow-hidden">Graph</span>
            </div>
          </div>
        </button>
        <button
          className={`Button cursor-pointer text-gray-400 ${showDisplayWrite ? "grayed" : "show"}`}
          onClick={calendarView}
        >
          <div className="button-content">
            <div className="icon-text-container">
              <AiOutlineCalendar />
              <span className="text-[1.0rem] ml-2">Calendar</span>
            </div>
          </div>
        </button>
      </div>
    </header>
  );
};

export default Header;
