export default {
  server: {
    port: 3000,
    cors: {
      origin: ["http://localhost:3002", "http://localhost:3000"],
      credentials: true,
    },
  },
};
