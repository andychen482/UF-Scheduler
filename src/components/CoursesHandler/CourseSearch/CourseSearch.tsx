import React from "react";
import axios from "axios";
import "./styles.css";

let backendServer = process.env.REACT_APP_BACKEND_SERVER_IP as string; 

interface CourseSearchProps {
  setDebouncedSearchTerm: (searchTerm: string) => void;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  searchTrigger: boolean;
  setSearchTrigger: React.Dispatch<React.SetStateAction<boolean>>;
}

const CourseSearch: React.FC<CourseSearchProps> = ({
  setDebouncedSearchTerm,
  searchTerm,
  setSearchTerm,
  searchTrigger,
  setSearchTrigger,
}) => {
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchTerm(value); // Update the textbox in real-time
  };
  
  const handleSearchKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      const value = event.currentTarget.value;
      setDebouncedSearchTerm(value);
      setSearchTrigger(!searchTrigger);
      if (value !== "" && value.length == 8) {
        handleSearchMetrics(value);
      }
    }
  };

  const handleSearchMetrics = async (formattedInput: string) => {
    try {
      await axios.post(`https://${backendServer}/search`, {
        searchTerm: formattedInput,
      });
    } catch (error) {
      console.error("Error sending search metrics", error);
    }
  };

  return (
    <input
      type="text"
      placeholder="Search (Press Enter to Search)"
      id="search-input"
      value={searchTerm}
      onChange={handleSearchChange}
      onKeyDown={handleSearchKeyPress}
      autoCorrect="off"
      className="px-2 py-2 text-black bg-gray-200 rounded-md placeholder-gray-500 w-[100%]"
      style={{ zIndex: 998 }}
    />
  );
};

export default CourseSearch;
