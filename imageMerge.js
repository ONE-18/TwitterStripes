import fs from "fs";
import path from "path";
import axios from "axios";
import sharp from "sharp";

export async function mergeImages(urls, outputPath) {
  const buffers = [];

  for (const url of urls) {
    const res = await axios({
      url,
      responseType: "arraybuffer"
    });
    buffers.push(res.data);
  }

  const images = await Promise.all(
    buffers.map(b => sharp(b).metadata())
  );

  const width = Math.max(...images.map(i => i.width));
  const height = images.reduce((sum, i) => sum + i.height, 0);

  let yOffset = 0;

  const composites = buffers.map((buf, i) => {
    const comp = { input: buf, left: 0, top: yOffset };
    yOffset += images[i].height;
    return comp;
  });

  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: "#000"
    }
  })
    .composite(composites)
    .png()
    .toFile(outputPath);
}
