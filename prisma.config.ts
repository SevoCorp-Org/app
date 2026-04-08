import { defineConfig } from "@prisma/config";
import { config } from "dotenv";

config(); // load .env so DATABASE_URL is available to Prisma CLI

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
