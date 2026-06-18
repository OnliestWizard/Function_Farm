// Client SDK: sdk/index.js
import { record } from "./recorder.js";

export class VoiceVault {
  constructor({ apiUrl, apiKey }) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
  }

  async enroll() {
    const audio = await record();
    return this.#send("/enroll", audio);
  }

  async verify() {
    const audio = await record();
    return this.#send("/verify", audio);
  }

  async #send(path, audio) {
    const form = new FormData();
    form.append("audio", audio);

    const res = await fetch(this.apiUrl + path, {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey
      },
      body: form
    });

    return res.json();
  }
}

// Server Module: server/index.js
import express from "express";
import multer from "multer";

import { createEmbedding } from "../core/embedding.js";
import { cosineSimilarity } from "../core/similarity.js";

const upload = multer();
const app = express();

const db = new Map(); // replace with real DB later

// enroll
app.post("/enroll", upload.single("audio"), async (req, res) => {
  const embedding = await createEmbedding(req.file.buffer);
  db.set(req.headers["x-api-key"], embedding);

  res.json({ success: true });
});

// verify
app.post("/verify", upload.single("audio"), async (req, res) => {
  const stored = db.get(req.headers["x-api-key"]);
  if (!stored) return res.json({ success: false });

  const embedding = await createEmbedding(req.file.buffer);

  const score = cosineSimilarity(stored, embedding);

  res.json({
    match: score > 0.85,
    confidence: score
  });
});

app.listen(3001, () =>
  console.log("Voice Vault running on :3001")
);