import { Server } from "http";
import app from "./app";
import config from "./app/config";
import { prisma } from "./app/db_connection";

let server: Server;

const PORT = config.PORT || 5000;

const startServer = async () => {
  try {
    console.log(`Environment: ${config.NODE_ENV}`);
    // Start server
    server = app.listen(PORT, () => {
      console.log(`Server running on port:- ${PORT}
http://localhost:5000/
        `);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Start server
(async()=>{
  await startServer();
})()

process.on("unhandledRejection", async (err) => {
  console.error("Unhandled Rejection Detected... server shutting down...", err);

  if (server) {
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(1);
    });
  } else {
    await prisma.$disconnect();
    process.exit(1);
  }
});

process.on("uncaughtException", async (err) => {
  console.error("Uncaught Exception Detected... server shutting down...", err);

  if (server) {
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(1);
    });
  } else {
    await prisma.$disconnect();
    process.exit(1);
  }
});

process.on("SIGTERM", async () => {
  console.log("SIGTERM signal received... shutting down gracefully");

  if (server) {
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  }
});

process.on("SIGINT", async () => {
  console.log("SIGINT signal received... shutting down gracefully");

  if (server) {
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  }
});
