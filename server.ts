import express from "express";
import path from "path";
import cors from "cors";
import fs from "fs/promises";
import { createServer as createViteServer } from "vite";

import multer from "multer";

const app = express();
const PORT = 3000;

// Local DB Paths
const DB_DIR = path.join(process.cwd(), "data");
const UPLOADS_DIR = path.join(DB_DIR, "uploads");
const FILES_DB = path.join(DB_DIR, "files.json");
const FEEDBACK_DB = path.join(DB_DIR, "feedback.json");

// Configure Multer for local storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Sanitize filename and add timestamp to avoid collisions
    const safeName = file.originalname.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

async function initDB() {
  try {
    await fs.mkdir(DB_DIR, { recursive: true });
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    try { await fs.access(FILES_DB); } catch { await fs.writeFile(FILES_DB, "[]"); }
    try { await fs.access(FEEDBACK_DB); } catch { await fs.writeFile(FEEDBACK_DB, "[]"); }
    console.log(">>> [LOCAL DB] Initialized successfully.");
  } catch (err) {
    console.error(">>> [LOCAL DB] Init failed:", err);
  }
}

async function startServer() {
  console.log(">>> [SERVER] Starting initialization in LOCAL MODE...");
  await initDB();
  
  app.use(cors());
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // --- DIAGNOSTIC LOGGING ---
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  // --- LOCAL AUTH API ---
  app.post("/api/admin/login", (req, res) => {
    const { secret } = req.body;
    if (secret === "1068575628") {
      return res.json({ 
        success: true, 
        bypass: true, 
        user: { 
          id: 'admin-local', 
          role: 'admin', 
          email: 'aborakan8885@gmail.com' 
        } 
      });
    }
    res.status(403).json({ error: "Unauthorized" });
  });

  // --- LOCAL UPLOAD API (Standard Multipart) ---
  app.post("/api/admin/upload", upload.single('file'), async (req, res) => {
    const { secret, metadata } = req.body;
    if (secret !== "1068575628") return res.status(403).json({ error: "Unauthorized" });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    try {
      const fileMetadata = JSON.parse(metadata || '{}');
      const dbContent = await fs.readFile(FILES_DB, "utf-8");
      const dbData = JSON.parse(dbContent);

      const newFileMapping = {
        ...fileMetadata,
        id: fileMetadata.id || Date.now().toString(),
        filename: req.file.originalname,
        localPath: req.file.path,
        serverFilename: req.file.filename,
        uploadedAt: new Date().toISOString()
      };

      // Add to database
      dbData.push(newFileMapping);
      await fs.writeFile(FILES_DB, JSON.stringify(dbData, null, 2));

      console.log(`>>> [LOCAL DB] File uploaded & mapped: ${req.file.originalname}`);
      res.json({ success: true, file: newFileMapping });
    } catch (e: any) {
      console.error("Upload process error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // --- LOCAL FILES API ---
  app.get("/api/files", async (req, res) => {
    try {
      const data = await fs.readFile(FILES_DB, "utf-8");
      res.json(JSON.parse(data));
    } catch (e) {
      res.status(500).json({ error: "Failed to load files" });
    }
  });

  app.post("/api/admin/sync-data", async (req, res) => {
    const { secret, type, file } = req.body;
    if (secret !== "1068575628") return res.status(403).json({ error: "Unauthorized" });

    try {
      if (type === 'file') {
        const dbContent = await fs.readFile(FILES_DB, "utf-8");
        const dbData = JSON.parse(dbContent);
        
        // Find if file already exists to update it
        const existingIndex = dbData.findIndex((f: any) => f.id === file.id || f.filename === file.filename);
        if (existingIndex >= 0) {
            dbData[existingIndex] = { ...dbData[existingIndex], ...file, updatedAt: new Date().toISOString() };
        } else {
            dbData.push({ 
                ...file, 
                id: file.id || Date.now().toString(),
                uploadedAt: new Date().toISOString() 
            });
        }
        
        await fs.writeFile(FILES_DB, JSON.stringify(dbData, null, 2));
        console.log(`>>> [LOCAL DB] File saved: ${file.filename}`);
        return res.json({ success: true });
      }
      res.status(400).json({ error: "Invalid sync type" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/admin/files/:id", async (req, res) => {
    const { secret } = req.query;
    if (secret !== "1068575628") return res.status(403).json({ error: "Unauthorized" });

    try {
      const dbData = JSON.parse(await fs.readFile(FILES_DB, "utf-8"));
      const fileToDelete = dbData.find((f: any) => f.id === req.params.id);
      
      // Delete physical file if it exists
      if (fileToDelete && fileToDelete.localPath) {
        try {
          await fs.unlink(fileToDelete.localPath);
          console.log(`>>> [LOCAL DB] Physical file deleted: ${fileToDelete.localPath}`);
        } catch (err) {
          console.warn(`>>> [LOCAL DB] Could not delete physical file: ${fileToDelete.localPath}`, err);
        }
      }

      const filtered = dbData.filter((f: any) => f.id !== req.params.id);
      await fs.writeFile(FILES_DB, JSON.stringify(filtered, null, 2));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Delete failed" });
    }
  });

  // --- LOCAL FEEDBACK API ---
  app.post("/api/feedback", async (req, res) => {
    try {
      const dbData = JSON.parse(await fs.readFile(FEEDBACK_DB, "utf-8"));
      dbData.push({ ...req.body, id: Date.now().toString(), createdAt: new Date().toISOString() });
      await fs.writeFile(FEEDBACK_DB, JSON.stringify(dbData, null, 2));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Feedback failed" });
    }
  });

  app.delete("/api/admin/feedback/:id", async (req, res) => {
    const { secret } = req.query;
    if (secret !== "1068575628") return res.status(403).json({ error: "Unauthorized" });

    try {
      const dbData = JSON.parse(await fs.readFile(FEEDBACK_DB, "utf-8"));
      const filtered = dbData.filter((f: any) => f.id !== req.params.id);
      await fs.writeFile(FEEDBACK_DB, JSON.stringify(filtered, null, 2));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Delete failed" });
    }
  });

  app.get("/api/admin/feedback", async (req, res) => {
    const { secret } = req.query;
    if (secret !== "1068575628") return res.status(403).json({ error: "Unauthorized" });
    const data = await fs.readFile(FEEDBACK_DB, "utf-8");
    res.json(JSON.parse(data));
  });

  // --- APP SERVING ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`>>> [SERVER] SUCCESS: Local DB Mode running at http://localhost:${PORT}`);
  });
}

startServer();
