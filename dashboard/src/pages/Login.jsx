import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import logo from "../assets/chipkontrol-logo.png";

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.username.trim()) {
      toast.error("Ingresa tu usuario");
      return;
    }

    if (!form.password.trim()) {
      toast.error("Ingresa tu contraseña");
      return;
    }

    try {
      setLoading(true);

      await login(
        form.username,
        form.password
      );

      navigate("/");

    } catch (error) {
      toast.error(
        "Usuario o contraseña incorrectos"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      <div className="login-background"></div>

      <form
        className="login-card"
        onSubmit={handleSubmit}
      >

        <div className="login-logo">
          <img
            src={logo}
            alt="ChipKontrol"
          />
        </div>

        <div className="form-group">
          <label>Usuario</label>

          <input
            className="form-control"
            placeholder="Ingresa tu usuario"
            value={form.username}
            onChange={(e) =>
              setForm({
                ...form,
                username: e.target.value,
              })
            }
          />
        </div>

        <div className="form-group">
          <label>Contraseña</label>

          <input
            className="form-control"
            type="password"
            placeholder="********"
            value={form.password}
            onChange={(e) =>
              setForm({
                ...form,
                password: e.target.value,
              })
            }
          />
        </div>

        <button
          className="btn btn-primary login-btn"
          disabled={loading}
        >
          {loading
            ? "Ingresando..."
            : "Entrar"}
        </button>

        <div className="login-footer">
          © {new Date().getFullYear()} SITRACK
        </div>

      </form>

    </div>
  );
}