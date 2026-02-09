import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import axios from "axios";

import { scrapeImages } from "./scraper.js";
import { downloadSingleImage, mergeImages } from "./imageMerge.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Asegurar que los directorios existan
const outputDir = path.join(__dirname, "output");
const publicDir = path.join(__dirname, "public");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Servir archivos estáticos
app.use(express.static(publicDir));
app.use("/output", express.static(outputDir));

console.log("📁 Public dir:", publicDir);
console.log("📁 Output dir:", outputDir);

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

async function downloadImage(url, filename) {
    const response = await axios.get(url, { responseType: 'stream' });
    return new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(filename);
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

app.post("/api/merge", async (req, res) => {
  const { url, action } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL requerida" });
  }

  if (!action || !["download", "merge"].includes(action)) {
    return res.status(400).json({ error: "Acción inválida (download o merge)" });
  }

  try {
    // Scrapear imágenes del tweet
    const imageUrls = await scrapeImages(url);

    if (!imageUrls || imageUrls.length === 0) {
      return res.status(400).json({ error: "No se encontraron imágenes en el tweet" });
    }

    if (action === "download") {
      // Descargar cada imagen por separado
      const downloadedFiles = [];
      for (let i = 0; i < imageUrls.length; i++) {
        const imgUrl = imageUrls[i];
        const filename = `tweet_${Date.now()}_${i}.png`;
        const filepath = path.join(__dirname, "output", filename);

        await downloadSingleImage(imgUrl, filepath);
        downloadedFiles.push({ url: `/output/${filename}`, filename });
      }

      res.json({ images: downloadedFiles });
    } else if (action === "merge") {
      // Mergear si hay 2+ imágenes, si no, descargar la única
      if (imageUrls.length === 1) {
        const imgUrl = imageUrls[0];
        const filename = `tweet_${Date.now()}_single.png`;
        const filepath = path.join(__dirname, "output", filename);

        await downloadSingleImage(imgUrl, filepath);
        res.json({ image: `/output/${filename}` });
      } else {
        // Mergear múltiples imágenes
        const filename = `tweet_${Date.now()}_merged.png`;
        const filepath = path.join(__dirname, "output", filename);

        await mergeImages(imageUrls, filepath);
        res.json({ image: `/output/${filename}` });
      }
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Error procesando el tweet" });
  }
});

app.listen(3000, '0.0.0.0', () => {
  console.log("🔥 App corriendo en http://localhost:3000");
});
