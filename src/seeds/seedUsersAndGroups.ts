import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/User";
import Group from "../models/Group";

dotenv.config({ path: path.join(__dirname, "../../.env") });

function parseCSV(filePath: string): Record<string, string>[] {
  const content = fs.readFileSync(filePath, "utf-8").replace(/﻿/, "");
  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((h, i) => [h, values[i]?.trim() ?? ""]));
  });
}

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI!);

  const usersData = parseCSV(path.join(__dirname, "users.csv"));

  for (const u of usersData) {
    const exists = await User.findOne({ $or: [{ email: u.email }, { username: u.username }] });
    if (!exists) {
      await User.create({
        username: u.username,
        email: u.email,
        password: u.password,
        email_verified: true,
        isAdmin: u.isAdmin.toLowerCase() === "true",
      });
      console.log(`✓ Usuario creado: ${u.username}`);
    } else {
      console.log(`→ Ya existe: ${u.username}`);
    }
  }

  const admin = await User.findOne({ username: "admin" });
  if (!admin) {
    console.error("No se encontró el usuario admin");
    process.exit(1);
  }

  const allSeededUsers = await User.find({
    username: { $in: usersData.map((u) => u.username) },
  });

  const groupsData = parseCSV(path.join(__dirname, "groups.csv"));

  for (const g of groupsData) {
    const exists = await Group.findOne({ invite_code: g.invite_code.toUpperCase() });
    if (!exists) {
      await Group.create({
        name: g.name,
        invite_code: g.invite_code.toUpperCase(),
        created_by: admin._id,
        members: allSeededUsers.map((u) => u._id),
      });
      console.log(`✓ Grupo creado: ${g.name} (código: ${g.invite_code.toUpperCase()})`);
    } else {
      console.log(`→ Ya existe: ${g.name}`);
    }
  }

  console.log("✓ Seed completado");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
