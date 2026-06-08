import { createContext, useState, useEffect } from "react";
import client from "../api/client";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const savedSessionId = localStorage.getItem("session_id");
    
    if (savedUser && savedSessionId) {
      setUser(JSON.parse(savedUser));
    }
    
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const res = await client.post("/login", { username, password });

    const userData = {
      username: res.data.username,
      role: res.data.role,
      grupo: res.data.grupo
    };

    setUser(userData);
    localStorage.setItem("session_id", res.data.session_id);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("session_id");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};