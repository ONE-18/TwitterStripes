import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

import { scrapeImages } from "./scraper.js";
import { downloadSingleImage, mergeImages } from "./imageMerge.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static("public"));
app.use("/output", express.static(path.join(__dirname, "output")));

app.get("/api/images", (req, res) => {
  try {
    if (!fs.existsSync("output")) {
      return res.json({ images: [] });
    }

    const files = fs.readdirSync("output").filter(f => f.endsWith(".png"));
    const images = files.map(f => ({
      url: `/output/${f}`,
      id: f.replace(".png", "")
    }));

    res.json({ images });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error listando imágenes" });
  }
});

app.post("/api/merge", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL requerida" });

    // Extraer el ID del post de la URL (Twitter: https://twitter.com/usuario/status/ID)
    const match = url.match(/status\/(\d+)/);
    if (!match) return res.status(400).json({ error: "No se pudo extraer el ID del post" });
    const postId = match[1];

    if (!fs.existsSync("output")) fs.mkdirSync("output");

    const outputFile = path.join(__dirname, "output", `${postId}.png`);
    
    // Verificar si la imagen ya existe antes de scrapear
    if (fs.existsSync(outputFile)) {
      console.log("✅ Imagen ya existe para el post:", postId);
      return res.json({ image: `/output/${postId}.png`, exists: true });
    }

    console.log("🔄 Iniciando procesamiento para post:", postId);
    console.time("⏱️  Total - Scraping");
    const images = await scrapeImages(url);
    console.timeEnd("⏱️  Total - Scraping");

    if (images.length === 0) {
      return res.status(400).json({ error: "No se encontraron imágenes" });
    }

    if (images.length === 1) {
      console.time("⏱️  Total - Descargar imagen");
      await downloadSingleImage(images[0], outputFile);
      console.timeEnd("⏱️  Total - Descargar imagen");
      console.log("💾 Imagen guardada en:", outputFile);

      return res.json({ image: `/output/${postId}.png`, exists: false });
    }

    console.time("⏱️  Total - Merge imágenes");
    await mergeImages(images, outputFile);
    console.timeEnd("⏱️  Total - Merge imágenes");
    console.log("💾 Imagen guardada en:", outputFile);

    res.json({ image: `/output/${postId}.png`, exists: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error procesando el tweet" });
  }
});

app.listen(3000, () => {
  console.log("🔥 App corriendo en http://localhost:3000");
});
