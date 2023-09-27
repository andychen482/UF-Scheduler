import React from "react";
import Footer from "../../components/Footer/Footer";
import "../About/AboutStyles.css"

const Fourohfour: React.FC = () => {
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
            How did you get here?
          </h1>
          <p
            style={{
              color: "white",
              lineHeight: "1.6",
              fontSize: "1.2em",
              marginBottom: "20px",
            }}
          >
            404 not found.
          </p>
        </div>
        <Footer />
      </div>
    </>
  );
};

export default Fourohfour;
