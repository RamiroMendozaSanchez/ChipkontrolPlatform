import axios from "axios";

const client = axios.create({
  baseURL:
    "/api"
});

client.interceptors.request.use(
 config => {

  const sessionId =
    localStorage.getItem(
      "session_id"
    );

  if (sessionId) {

    config.headers[
      "x-session"
    ] = sessionId;
  }

  return config;
 }
);

export default client;