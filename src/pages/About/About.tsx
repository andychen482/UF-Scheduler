import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import "./AboutStyles.css";

const AboutPage: React.FC = () => {
  return (
    <>
      <header className="header flex gap-x-5 justify-end">
        <div className="mr-2">
        <a href="/">
            <span className="title font-semibold text-blue-500">UF</span>
            <span className="title font-semibold text-orange-500">Scheduler</span>
          </a>
        </div>
      </header>
      <div
        className="animated-background"
        style={{ minHeight: "100vh", padding: "50px" }}
      >
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <h1
            style={{
              color: "white",
              fontSize: "2.5em",
              marginBottom: "20px",
              marginTop: "40px",
            }}
          >
            About
          </h1>
          <p
            style={{
              color: "white",
              lineHeight: "1.6",
              fontSize: "1.2em",
              marginBottom: "20px",
            }}
          >
            Created by Andy Chen, Surya Karthikeyan Vijayalakshmi, and Ronak
            Agarwal in June 2023.
          </p>
          <p
            style={{
              color: "white",
              lineHeight: "1.6",
              fontSize: "1.2em",
              marginBottom: "20px",
            }}
          >
            Maintained and updated daily by Andy Chen since July 2023.{" "}
          </p>
          <p
            style={{
              color: "white",
              lineHeight: "1.6",
              fontSize: "1.2em",
              marginBottom: "20px",
            }}
          >
            UF Scheduler is an open source project that aims to help students
            plan their schedules. It is not affiliated with the University of
            Florida.
          </p>
          <p style={{ color: "white", lineHeight: "1.6", fontSize: "1.2em" }}>
            Check out the project on{" "}
            <FontAwesomeIcon icon={faGithub} style={{ marginLeft: "5px" }} />{" "}
            <a
              href="https://github.com/andychen482/UF-Scheduler"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#58a6ff" }}
            >
              GitHub
            </a>
            .
          </p>
        </div>
      </div>
    </>
  );
};

export default AboutPage;
