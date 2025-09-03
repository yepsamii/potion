import { Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";
import Login from "./pages/Login";
import Home from "./pages/Home";
import DocumentView from "./pages/DocumentView";
import Settings from "./pages/Settings";
import Trash from "./pages/Trash";
import { useConvexAuth } from "convex/react";

function App() {
  const { isLoading, isAuthenticated } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Layout>
      <Routes>
        <Route
          path="/"
          element={<Home />}
        />
        <Route
          path="/document/:id"
          element={<DocumentView />}
        />
        <Route
          path="/settings"
          element={<Settings />}
        />
        <Route
          path="/trash"
          element={<Trash />}
        />
      </Routes>
    </Layout>
  );
}

export default App;
