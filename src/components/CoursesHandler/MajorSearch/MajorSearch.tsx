import React from 'react';
import Select, { CSSObjectWithLabel } from 'react-select';
import majorsData from '../../../courses/depts_clean.json'; // Import the JSON data from the file

interface MajorSearchProps {
    selectedMajor: string | null;
    setSelectedMajor: React.Dispatch<React.SetStateAction<string | null>>;
}

const MajorSelect: React.FC<MajorSearchProps> = ({ selectedMajor, setSelectedMajor }) => {
  const options = majorsData.map((major) => ({ value: major, label: major }));

  const handleChange = (selectedOption: any) => {
    setSelectedMajor(selectedOption ? selectedOption.value : null);
  };

  return (
    <div>
      <Select
        options={options}
        isClearable={true}
        value={selectedMajor ? { value: selectedMajor, label: selectedMajor } : null}
        onChange={handleChange}
        theme={(theme) => ({
          ...theme,
          borderRadius: 6,
          colors: {
            ...theme.colors,
            primary25: '#E6E6E6',
            primary: '#B3B3B3',
          },
        })}
        placeholder="Select a department..."
        className="mb-4 text-black bg-gray-200 placeholder-gray-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors duration-500 w-[100%] h-8 rounded"
        menuPortalTarget={document.body} // Append the dropdown to the body element
        styles={{
          menuPortal: base => ({ ...base, zIndex: 999 }) as CSSObjectWithLabel, // Adjust the z-index to a value lower than the drawer's but higher than other elements
          control: (base) => ({
            ...base,
            borderRadius: "4px",  // Adjust this value to control the border radius of the control
          }) as CSSObjectWithLabel,
        }}
      />
    </div>
  );
};

export default MajorSelect;
