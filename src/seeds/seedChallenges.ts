import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Challenge from "../models/Challenge";

dotenv.config({ path: path.join(__dirname, "../../.env") });

function parseCSV(filePath: string) {
  const content = fs.readFileSync(filePath, "utf-8").replace(/﻿/, "");
  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .filter((l) => !l.startsWith("sep=") && !l.startsWith("description"));

  return lines.map((line) => {
    const values = line.split(",");
    return {
      description: values[0],
      scheduled_date: values[1],
      is_weekend_special: values[2]?.trim().toLowerCase() === "true",
    };
  });
}

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI!);

  const csvPath = path.join(__dirname, "challenges.csv");
  const challenges = parseCSV(csvPath);

  console.log(`Insertando ${challenges.length} retos...`);

  for (const c of challenges) {
    await Challenge.findOneAndUpdate({ scheduled_date: c.scheduled_date }, c, { upsert: true });
  }

  console.log(`✓ ${challenges.length} retos insertados`);
  console.log(`  Desde: ${challenges[0].scheduled_date}`);
  console.log(`  Hasta: ${challenges[challenges.length - 1].scheduled_date}`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
