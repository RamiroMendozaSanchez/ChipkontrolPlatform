import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(form.username, form.password);
    navigate("/");
  };

  return (
  <div className="login-container">
    <form className="login-box" onSubmit={handleSubmit}>
      <h2>🚀 SITRACK</h2>

      <input
        placeholder="Usuario"
        onChange={(e) =>
          setForm({ ...form, username: e.target.value })
        }
      />

      <input
        type="password"
        placeholder="Password"
        onChange={(e) =>
          setForm({ ...form, password: e.target.value })
        }
      />

      <button>Entrar</button>
    </form>
  </div>
);
}