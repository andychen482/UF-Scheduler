import React, { useEffect, useState } from 'react';

const Footer = () => {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  function fetchLastCommitTime() {
    const url = 'https://api.github.com/repos/andychen482/UF-Scheduler-Backend/commits?path=courses&per_page=1';

    fetch(url)
      .then(response => response.json())
      .then(commits => {
        if (commits && commits.length > 0) {
          const lastCommitDate = new Date(commits[0].commit.author.date);
          setLastUpdated(lastCommitDate);
        }
      })
      .catch(error => console.error('Error fetching commit data: ', error));
  }

  useEffect(() => {
    fetchLastCommitTime();
    const apiIntervalId = setInterval(fetchLastCommitTime, 600000); // API call every 10 minutes
    const displayIntervalId = setInterval(() => {
      setLastUpdated(prev => new Date(prev!.getTime())); // Trigger re-render every minute
    }, 60000);
    return () => {
      clearInterval(apiIntervalId);
      clearInterval(displayIntervalId);
    }; // Cleanup intervals on component unmount
  }, []);

  function displayLastUpdatedTime() {
    if (!lastUpdated) return 'Calculating...';

    const currentTime = new Date();
    const differenceInMinutes = Math.floor((currentTime.getTime() - lastUpdated.getTime()) / 60000);

    if (differenceInMinutes < 1) return "Updated less than a minute ago";
    else if (differenceInMinutes === 1) return "Updated 1 minute ago";
    else return `Updated ${differenceInMinutes} minutes ago`;
  }

  return (
    <div
      className="about text-white text-xs w-full"
      style={{
        position: "fixed",
        bottom: "0px",
        left: "50%",
        transform: "translate(-50%, 0%)",
        textAlign: "center",
        zIndex: 1000,
      }}
    >
      <p>
        Fall 2024 | <span id="lastUpdated">{displayLastUpdatedTime()}</span> | By Andy Chen |{" "}
        <a
          href="/about"
          style={{ color: "inherit", textDecoration: "underline" }}
        >
          About
        </a>
      </p>
    </div>
  );
};

export default Footer;
