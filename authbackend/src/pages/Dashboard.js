import React from 'react';
import { useAuth } from '../components/AuthContext';

const Dashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Welcome, {user?.name}!</h1>
        <button onClick={logout} className="logout-btn">
          Logout
        </button>
      </header>
      <main className="dashboard-content">
        <p>This is your protected dashboard.</p>
        <div className="user-info">
          <h3>User Information:</h3>
          <p><strong>Name:</strong> {user?.name}</p>
          <p><strong>Email:</strong> {user?.email}</p>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
