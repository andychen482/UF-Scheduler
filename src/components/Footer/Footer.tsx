const Footer = () => {
  function displayLastUpdatedTime() {
    const lastScrapedTime = new Date();
    lastScrapedTime.setMinutes(0, 0, 0);

    function updateTime() {
      const currentTime = new Date();
      const lastScrapedTimeMs = lastScrapedTime.getTime();
      const currentTimeMs = currentTime.getTime();
      const differenceInMinutes = Math.floor(
        (currentTimeMs - lastScrapedTimeMs) / 60000
      );

      let message = `Last updated ${differenceInMinutes} minutes ago`;
      if (differenceInMinutes < 1) {
        message = "Last updated less than a minute ago";
      }
      else if (differenceInMinutes < 2) {
        message = "Last updated 1 minute ago";
      }

      const lastUpdatedElement = document.getElementById("lastUpdated");
      if (lastUpdatedElement) {
        lastUpdatedElement.textContent = message;
      }
    }

    setInterval(updateTime, 60000);
    updateTime();
  }

  displayLastUpdatedTime();

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
        Fall 2024 | <span id="lastUpdated"></span> | Created by Andy Chen |{" "}
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
