import React, { useState, useEffect } from "react";
import fullTables from "../../data/fullTables.json";
import { MajorPlans } from "./planTypes";
import Select, { CSSObjectWithLabel } from "react-select";
// import ReactGA from "react-ga4";
import "./planStyles.css";
import axios from "axios";

let backendServer = process.env.REACT_APP_BACKEND_SERVER_IP as string;


const ModelPlan: React.FC = () => {
  const [selectedMajor, setSelectedMajor] = useState<string>("");

  useEffect(() => {
    const storedSelectedMajor = localStorage.getItem("selectedMajorPlan");
    if (storedSelectedMajor) {
      setSelectedMajor(storedSelectedMajor);
    }
  }, []);

  useEffect(() => {
    if (selectedMajor) {
      localStorage.setItem("selectedMajorPlan", selectedMajor);
    }
    else {
      localStorage.removeItem("selectedMajorPlan");
    }
  }, [selectedMajor]);

  const options = Object.keys(fullTables).map((major) => ({
    value: major,
    label: major,
  }));

  const sendMajorMetrics = async (major: string) => {
    try {
      await axios.post(
        `https://${backendServer}/major`,
        {
          major: major,
        }
      );
    } catch (error) {
      console.error("Error sending major metrics", error);
    }
  };

  const handleMajorChange = (selectedOption: any) => {
    const selectedMajorValue = selectedOption ? selectedOption.value : null;
    setSelectedMajor(selectedMajorValue);

    // ReactGA.event({
    //   category: "Model Plan",
    //   action: "Select Major",
    //   label: selectedMajorValue,
    // });

    sendMajorMetrics(selectedMajorValue);
  };

  const renderTable = (major: string) => {
    const plans: MajorPlans = fullTables;
    if (!plans[major]) return null;

    let lastRowColor = "gray";

    return (
      <table className="model-plan">
        <tbody>
          <tr>
            <td
              colSpan={2}
              style={{
                textAlign: "center",
                fontWeight: "600",
                fontSize: "18px",
                borderTop: "2px solid white",
                borderBottom: "2px solid white",
              }}
            >
              Semester One
            </td>
            <td
              colSpan={1}
              style={{
                textAlign: "center",
                fontWeight: "600",
                fontSize: "18px",
                borderTop: "2px solid white",
                borderBottom: "2px solid white",
              }}
            >
              Credits
            </td>
          </tr>
          {plans[major].map((course, index) => {
            let courseText = course["Semester One"];
            let descriptionText = course["Semester One.1"];
            let creditsText = course["Credits"];

            let courseSpan = 1;
            let descriptionSpan = 1;
            let creditsSpan = 1;

            let semesterText = false;

            let rowStyle = {
              backgroundColor: index % 2 === 0 ? "black" : "rgb(28, 28, 28)",
            };

            // Check for merging conditions
            if (
              courseText === descriptionText &&
              descriptionText === creditsText
            ) {
              courseSpan = 3;
              descriptionSpan = 0; // Skip rendering
              creditsSpan = 0; // Skip rendering
              semesterText = true;
              lastRowColor = index % 2 === 0 ? "black" : "rgb(28, 28, 28)";
            } else if (courseText === descriptionText) {
              courseSpan = 2;
              descriptionSpan = 0; // Skip rendering
              lastRowColor = index % 2 === 0 ? "black" : "rgb(28, 28, 28)";
            } else if (descriptionText === creditsText) {
              descriptionSpan = 2;
              creditsSpan = 0; // Skip rendering
              lastRowColor = index % 2 === 0 ? "black" : "rgb(28, 28, 28)";
            } else if (!courseText && descriptionText) {
              courseSpan = 2;
              courseText = descriptionText;
              descriptionSpan = 0; // Skip rendering
              creditsSpan = 1;
              lastRowColor = index % 2 === 0 ? "black" : "rgb(28, 28, 28)";
            } else if (!creditsText && descriptionText) {
              descriptionSpan = 2;
              creditsSpan = 0;
              descriptionText = courseText + ": " + descriptionText;
              courseText = "";
              courseSpan = 1;
              rowStyle = {
                backgroundColor: lastRowColor,
              };
            }

            const isLastRow = index === plans[major].length - 1;
            const rowClassName = semesterText ? "thicker-border" : "";

            return semesterText ? (
              <tr key={index} className={rowClassName} style={isLastRow ? { fontWeight: "bold" } : rowStyle}>
                <td
                  colSpan={2}
                  style={{
                    textAlign: "center",
                    fontWeight: "600",
                    fontSize: "18px",
                  }}
                >
                  {courseText}
                </td>
                <td
                  colSpan={1}
                  style={{
                    textAlign: "center",
                    fontWeight: "600",
                    fontSize: "18px",
                  }}
                ></td>
              </tr>
            ) : (
              <tr key={index} style={isLastRow ? { fontWeight: "bold" } : rowStyle}>
                {courseSpan > 0 && <td colSpan={courseSpan}>{courseText}</td>}
                {descriptionSpan > 0 && (
                  <td colSpan={descriptionSpan}>{descriptionText}</td>
                )}
                {creditsSpan > 0 && (
                  <td colSpan={creditsSpan} style={{ textAlign: "center" }}>
                    {creditsText}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  return (
    <div className="model-plan-container overflow-y-scroll">
      <h1 className="text-[26px] font-[600] text-white mt-2">
        Model Semester Plans
      </h1>
      <Select
        options={options}
        isClearable={true}
        value={
          selectedMajor ? { value: selectedMajor, label: selectedMajor } : null
        }
        onChange={handleMajorChange}
        placeholder="Select a major..."
        className="mb-4 text-black bg-gray-200 placeholder-gray-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors duration-500 w-[80%] h-8 rounded"
        menuPortalTarget={document.body} // Append the dropdown to the body element
        styles={{
          menuPortal: (base) =>
            ({ ...base, zIndex: 999 } as CSSObjectWithLabel), // Adjust the z-index to a value lower than the drawer's but higher than other elements
          control: (base) =>
            ({
              ...base,
              borderRadius: "4px", // Adjust this value to control the border radius of the control
            } as CSSObjectWithLabel),
        }}
      />
      {selectedMajor && renderTable(selectedMajor)}
    </div>
  );
};

export default ModelPlan;
