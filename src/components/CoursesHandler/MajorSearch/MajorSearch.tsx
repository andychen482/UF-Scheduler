import React from 'react';
import Select from 'react-select';
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
        value={selectedMajor ? { value: selectedMajor, label: selectedMajor } : null}
        onChange={handleChange}
        placeholder="Select a major..."
        className="mb-4 text-black bg-gray-200 rounded-md placeholder-gray-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors duration-500 w-[20rem] sm:w-[20rem] md:w-[24rem] lg:w-[28rem] xl:w-[32rem]"
      />
    </div>
  );
};

export default MajorSelect;
