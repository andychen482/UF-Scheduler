import React from "react";
import LinkedInProfileBadge from "react-linkedin-profile-badge";
import Footer from "../../components/Footer/Footer";
import "./AboutStyles.css";

const AboutPage: React.FC = () => {
  return (
    <>
      <header className="header flex gap-x-5 justify-end">
        <div className="mr-2">
          <a href="/">
            <span className="font-semibold text-blue-500">UF</span>
            <span className="font-semibold text-orange-500">
              Scheduler
            </span>
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
              marginBottom: "10px",
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
            Created by Andy Chen and Ronak Agarwal in June 2023.
          </p>
          <p
            style={{
              color: "white",
              lineHeight: "1.6",
              fontSize: "1.2em",
              marginBottom: "20px",
            }}
          >
            Maintained and updated weekly by Andy Chen since July 2023.{" "}
          </p>
          <p
            style={{
              color: "white",
              lineHeight: "1.6",
              fontSize: "1.2em",
              marginBottom: "20px",
            }}
          >
            UF Scheduler is a website that aims to help students plan their
            schedules. It is not affiliated with the University of Florida.
          </p>
          <h2
            style={{
              color: "white",
              fontSize: "1.75em",
              marginBottom: "10px",
              marginTop: "30px",
            }}
          >
            Credits
          </h2>
          <p
            style={{
              color: "white",
              lineHeight: "1.6",
              fontSize: "1.2em",
              marginBottom: "20px",
            }}
          >
            <a href="https://www.linkedin.com/in/danielurbonas/" target="_blank" rel="noreferrer" style={{ color: "white", textDecoration: "underline" }}>Daniel Urbonas</a> - AI chat assistant
          </p>
          <h2
            style={{
              color: "white",
              fontSize: "1.75em",
              marginBottom: "10px",
              marginTop: "30px",
            }}
          >
            Contact
          </h2>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "start",
            }}
          >
            <a
              href="mailto: andy.chen@ufl.edu"
              style={{ color: "white", lineHeight: "1.6", fontSize: "1.2em" }}
            >
              andy.chen@ufl.edu
            </a>
            <LinkedInProfileBadge
              profileId="andy-chen67"
              theme="dark"
              size="large"
              orientation="horizontal"
            />
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
};

export default AboutPage;
