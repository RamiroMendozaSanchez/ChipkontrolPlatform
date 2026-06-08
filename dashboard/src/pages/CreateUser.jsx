import { useEffect, useState } from "react";
import client from "../api/client";
import MainLayout from "../layouts/MainLayout";
import { useNavigate } from "react-router-dom";

export default function CreateUser() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [group, setGroup] = useState("");
  const [groups, setGroups] = useState([]);
  const [role, setRole] = useState("user");

  const navigate = useNavigate();

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    const res = await client.get("/groups");
    setGroups(res.data);
  };

  const createUser = async () => {
   const isAdmin = !group || group.trim() === "";

  await client.post("/users", {
    username,
    password,
    grupo: isAdmin ? null : group,
    role: isAdmin ? "admin" : "user"
  });

    alert("Usuario creado");
    navigate("/");
  };

  return (
    <MainLayout>
      <div className="form-container">
        <h2>👤 Crear Usuario</h2>

        <input
          placeholder="Usuario"
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
        />

        <select onChange={(e) => setGroup(e.target.value)}>
          <option>Selecciona grupo</option>
          {groups.map((g) => (
            <option key={g.grupo} value={g.grupo}>
              {g.grupo}
            </option>
          ))}
        </select>

        <button onClick={createUser}>Crear</button>
      </div>
    </MainLayout>
  );
}