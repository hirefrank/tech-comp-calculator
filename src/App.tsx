import React from 'react';
import PackageComparison from './components/calculator/PackageComparison';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 mx-auto">
      <div className="container max-w-7xl mx-auto px-4">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Tech Compensation Calculator</h1>
          <p className="text-gray-600 mt-2">
            Project and compare total compensation packages including salary growth and bonuses
          </p>
        </header>
        <main>
          <PackageComparison />
        </main>
      </div>
    </div>
  );
}

export default App;