import React from 'react';
import './HomePageStyles.css';

const HomePage: React.FC = () => {
  return (
    <div className="home-page sora-unique">
      <header className="home-header">
        <h1 className="text-4xl font-bold mb-4">Welcome to UF Scheduler</h1>
        <p className="text-lg mb-8">Your ultimate tool for course planning and scheduling.</p>
      </header>
      <main className="home-main">
        <section className="features mb-12">
          <h2 className="text-3xl font-semibold mb-4">Features</h2>
          <ul className="list-disc list-inside">
            <li className="mb-2">Interactive Calendar</li>
            <li className="mb-2">Course Graph Visualization</li>
            <li className="mb-2">Map Integration</li>
            <li className="mb-2">Customizable Plans</li>
          </ul>
        </section>
        <section className="get-started">
          <h2 className="text-3xl font-semibold mb-4">Get Started</h2>
          <p className="text-lg mb-4">Click below to start creating your schedule.</p>
          <a href="/create" className="get-started-button bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-300 ease-in-out">Create Schedule</a>
        </section>
      </main>
      <footer className="home-footer mt-12">
        <p className="text-sm">&copy; 2025 UF Scheduler. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default HomePage; 