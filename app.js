const express = require("express");
const axios = require("axios");
const xml2js = require("xml2js");
const fs = require("fs");
const path = require("path");
const cron = require("node-cron");
require("dotenv").config();

const app = express();
const port = 3000;

const xmlUrls = process.env.XML_URLS.split(","); // Fetch XML URLs from env variable
const outputFilePath = path.join(__dirname, "public", "channel.m3u8");

// Function to fetch and process XML files
async function fetchAndProcessXML() {
  let channels = [];

  for (const url of xmlUrls) {
    try {
      const response = await axios.get(url);
      const xmlContent = response.data;

      const result = await xml2js.parseStringPromise(xmlContent);
      const channelList = result.tv.channel;

      channelList.forEach((channel) => {
        const displayName = channel["display-name"][0]._;
        const icon = channel.icon[0].$.src;
        const channelUrl = channel.url[0];

        channels.push({
          name: displayName,
          icon: icon,
          url: channelUrl,
        });
      });
    } catch (error) {
      console.error(`Failed to fetch or parse XML from ${url}:`, error);
    }
  }

  return channels;
}

// Function to generate M3U8 file
async function generateM3U8() {
  const channels = await fetchAndProcessXML();
  let m3u8Content = "#EXTM3U\n";

  channels.forEach((channel) => {
    m3u8Content += `#EXTINF:-1 tvg-logo="${channel.icon}",${channel.name}\n`;
    m3u8Content += `${channel.url}\n`;
  });

  fs.writeFileSync(outputFilePath, m3u8Content);
  console.log("M3U8 file generated successfully!");
}

// Endpoint to manually trigger M3U8 generation
app.get("/generate", async (req, res) => {
  await generateM3U8();
  res.send("M3U8 file generated!");
});

// Serve the M3U8 file
app.use("/channel.m3u8", express.static(outputFilePath));

// Schedule the cron job to run daily at 1 AM
cron.schedule("0 1 * * *", async () => {
  await generateM3U8();
  console.log("Cron job executed: M3U8 file generated!");
});

// Start the Express server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
