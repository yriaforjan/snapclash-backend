import dotenv from "dotenv";
dotenv.config();

import connectDB from "./config/db";
import app from "./app";
import { startCronJobs } from "./jobs/notifications";

const PORT = process.env.PORT || 8080;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
      startCronJobs();
    });
  })
  .catch((err) => {
    console.error("Error conectando a MongoDB:", err);
    process.exit(1);
  });
