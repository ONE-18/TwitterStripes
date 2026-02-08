import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

import { scrapeImages } from "./scraper.js";
import { mergeImages } from "./imageMerge.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static("public"));
app.use("/output", express.static(path.join(__dirname, "output")));

app.post("/api/merge", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL requerida" });

    const images = await scrapeImages(url);

    if (images.length < 2) {
      return res.status(400).json({ error: "No se encontraron suficientes imágenes" });
    }

    if (!fs.existsSync("output")) fs.mkdirSync("output");

    const timestamp = Date.now();
    const outputFile = path.join(__dirname, "output", `${timestamp}.png`);
    await mergeImages(images, outputFile);
    console.log("Imagen guardada en:", outputFile);

    res.json({ image: `/output/${timestamp}.png` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error procesando el tweet" });
  }
});

app.listen(3000, () => {
  console.log("🔥 App corriendo en http://localhost:3000");
});
