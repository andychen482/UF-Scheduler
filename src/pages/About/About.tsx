import React from 'react';
import "./AboutStyles.css"

const AboutPage: React.FC = () => {
    return (
        <>
    <header className="header flex gap-x-5 justify-end">
      <div className="mr-2">
        <span className="title font-semibold text-blue-500">UF</span>
        <span className="title font-semibold text-orange-500">Scheduler</span>
      </div>
    </header>
    <div className="animated-background" style={{ minHeight: '100vh', padding: '50px' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <h1 style={{ color: 'white', fontSize: '2.5em', marginBottom: '20px', marginTop: '40px'}}>About</h1>
                <p style={{ color: 'white', lineHeight: '1.6', fontSize: '1.2em', marginBottom: '20px' }}>
                    Conceived by Andy Chen, Surya Karthikeyan Vijayalakshmi, and Ronak Agarwal in June 2023.
                </p>
                <p style={{ color: 'white', lineHeight: '1.6', fontSize: '1.2em', marginBottom: '20px'}}>
                Maintained by Andy Chen since July 2023.                </p>
                <p style={{ color: 'white', lineHeight: '1.6', fontSize: '1.2em' }}>
                    UF Scheduler is an open source project that aims to help students plan their schedules. It is not affiliated with the University of Florida.
                </p>
            </div>
        </div>
    </>
    );
}

export default AboutPage;
