import React from "react";
import axios from "axios";
import "./styles.css";
import { FaSearch } from "react-icons/fa";
import { useAuth } from "react-oidc-context";

import { BACKEND_URLS, getAuthHeaders } from "../../../config/api";

interface CourseSearchProps {
  setDebouncedSearchTerm: (searchTerm: string) => void;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  searchTrigger: boolean;
  setSearchTrigger: React.Dispatch<React.SetStateAction<boolean>>;
  selectedValue: string;
  handleTermChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

const CourseSearch: React.FC<CourseSearchProps> = ({
  setDebouncedSearchTerm,
  searchTerm,
  setSearchTerm,
  searchTrigger,
  setSearchTrigger,
  selectedValue,
  handleTermChange,
}) => {
  const auth = useAuth();

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchTerm(value);
  };

  const handleSearchKeyPress = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter") {
      const value = event.currentTarget.value;
      setDebouncedSearchTerm(value);
      setSearchTrigger(!searchTrigger);
      if (value !== "" && value.length === 8) {
        handleSearchMetrics(value);
      }
    }
  };

  const handleSearchMetrics = async (formattedInput: string) => {
    try {
      await axios.post(
        BACKEND_URLS.SEARCH_METRICS,
        { search_term: formattedInput },
        { headers: getAuthHeaders(auth) }
      );
    } catch (error) {
      // Metrics send failed silently
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="search-container flex-grow">
        <FaSearch className="search-icon" />
        <input
          type="text"
          placeholder="Search courses"
          id="search-input"
          value={searchTerm}
          onChange={handleSearchChange}
          onKeyDown={handleSearchKeyPress}
          autoCorrect="off"
          className="search-input"
          style={{ zIndex: 998 }}
        />
      <select
        value={selectedValue}
        onChange={handleTermChange}
        className="term-year-dropdown bg-[#f0f0f0] text-base text-[#6d727e] font-sans font-semibold"
      >
        <option value="summer 26">Summer 26</option>
        <option value="fall 26">Fall 26</option>
        <option value="spring 26">Spring 26</option>
      </select>
      </div>
    </div>
  );
};

export default CourseSearch;
