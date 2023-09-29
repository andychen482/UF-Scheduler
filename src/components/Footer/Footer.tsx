const Footer = () => {
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
        Updated to Spring 2024 | Created by Andy Chen |{" "}
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
