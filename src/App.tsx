import { Analytics } from '@vercel/analytics/react';

function App() {
  return (
    <>
      <div className="app">
        <h1>DMF Music Platform</h1>
        <p>Powered by Da'Riyah</p>
      </div>
      <Analytics />
    </>
  );
}

export default App;
