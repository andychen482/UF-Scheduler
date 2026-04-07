import React from 'react';
import Select, { CSSObjectWithLabel } from 'react-select';
import majorsData from '../../../courses/depts_clean.json'; // Import the JSON data from the file

interface MajorSearchProps {
    selectedMajor: string | null;
    setSelectedMajor: React.Dispatch<React.SetStateAction<string | null>>;
    inputId?: string;
}

const MajorSelect: React.FC<MajorSearchProps> = ({ selectedMajor, setSelectedMajor, inputId }) => {
  const options = majorsData.map((major) => ({ value: major, label: major }));

  const handleChange = (selectedOption: any) => {
    setSelectedMajor(selectedOption ? selectedOption.value : null);
  };

  return (
    <div className="major-select-root">
      <Select
        inputId={inputId}
        options={options}
        isClearable={true}
        value={selectedMajor ? { value: selectedMajor, label: selectedMajor } : null}
        onChange={handleChange}
        theme={(theme) => ({
          ...theme,
          borderRadius: 8,
          colors: {
            ...theme.colors,
            primary25: "rgba(0, 33, 165, 0.12)",
            primary50: "rgba(0, 33, 165, 0.18)",
            primary: "#0021a5",
          },
        })}
        placeholder="Search departments…"
        className="major-select w-full text-left font-sans"
        classNamePrefix="major-select"
        menuPortalTarget={document.body}
        styles={{
          menuPortal: (base) => ({ ...base, zIndex: 9999 }) as CSSObjectWithLabel,
          control: (base, state) => ({
            ...base,
            minHeight: 42,
            boxShadow: state.isFocused
              ? "0 0 0 1px rgba(0, 33, 165, 0.45)"
              : "none",
            border: state.isFocused
              ? "1px solid rgba(0, 33, 165, 0.55)"
              : "1px solid rgba(255, 255, 255, 0.14)",
            borderRadius: 8,
            backgroundColor: "#141414",
            cursor: "pointer",
          }) as CSSObjectWithLabel,
          menu: (base) => ({
            ...base,
            backgroundColor: "#1a1a1a",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: 8,
            overflow: "hidden",
          }) as CSSObjectWithLabel,
          menuList: (base) => ({
            ...base,
            padding: 4,
          }) as CSSObjectWithLabel,
          option: (base, state) => ({
            ...base,
            cursor: "pointer",
            borderRadius: 6,
            backgroundColor: state.isSelected
              ? "rgba(0, 33, 165, 0.35)"
              : state.isFocused
                ? "rgba(255, 255, 255, 0.06)"
                : "transparent",
            color: "#e8e8e8",
          }) as CSSObjectWithLabel,
          singleValue: (base) => ({
            ...base,
            color: "#f2f2f2",
            fontWeight: 500,
          }) as CSSObjectWithLabel,
          input: (base) => ({
            ...base,
            color: "#f2f2f2",
          }) as CSSObjectWithLabel,
          placeholder: (base) => ({
            ...base,
            color: "#8a8a8a",
          }) as CSSObjectWithLabel,
          indicatorSeparator: (base) => ({
            ...base,
            backgroundColor: "rgba(255,255,255,0.12)",
          }) as CSSObjectWithLabel,
          dropdownIndicator: (base) => ({
            ...base,
            color: "#a3a3a3",
          }) as CSSObjectWithLabel,
          clearIndicator: (base) => ({
            ...base,
            color: "#a3a3a3",
          }) as CSSObjectWithLabel,
        }}
      />
    </div>
  );
};

export default MajorSelect;
