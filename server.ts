import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { initializeApp, getApps, getApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import fs from "fs";

// Read config manually
const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));

async function startServer() {
  console.log(">>> [SERVER] Starting initialization...");
  const app = express();
  const PORT = 3000;

  try {
    console.log(">>> [FIREBASE] Initializing Admin SDK for project:", firebaseConfig.projectId);
    
    let firestore: any;

    try {
      if (getApps().length === 0) {
        initializeApp({
          projectId: firebaseConfig.projectId
        });
        console.log(">>> [FIREBASE] Admin SDK initialized.");
      }
      
      const db = firebaseConfig.firestoreDatabaseId 
        ? getFirestore(getApp(), firebaseConfig.firestoreDatabaseId)
        : getFirestore();
      
      firestore = db;
    } catch (firebaseError) {
      console.warn(">>> [FIREBASE] WARNING: Could not initialize Admin. Admin APIs will be disabled.", firebaseError);
    }

    app.use(cors());
    app.use(express.json({ limit: '50mb' }));

    app.get("/api/health", (req, res) => {
      res.json({ status: "ok", project: firebaseConfig.projectId });
    });

    // Admin Login via Civil ID -> Returns Firebase Custom Token
    app.post("/api/admin/login", async (req, res) => {
      const { secret } = req.body;
      if (secret !== "1068575628") return res.status(403).json({ error: "Unauthorized" });

      try {
        const adminEmail = "aborakan8885@gmail.com";
        const authAdmin = getAuth();
        
        // Create or get user to ensure UID exists
        let userRecord;
        try {
          userRecord = await authAdmin.getUserByEmail(adminEmail);
        } catch (e: any) {
          if (e.code === 'auth/user-not-found') {
            userRecord = await authAdmin.createUser({
              email: adminEmail,
              displayName: "مدير النظام الرئيسي",
            });
          } else {
            throw e;
          }
        }

        // Generate Custom Token with email claim to satisfy firestore.rules
        const customToken = await authAdmin.createCustomToken(userRecord.uid, {
          admin: true,
          role: 'admin',
          email: adminEmail
        });

        return res.json({ success: true, token: customToken });
      } catch (e: any) {
        console.error(">>> [LOGIN ERROR]", e);
        res.status(500).json({ error: e.message });
      }
    });

    app.post("/api/admin/sync-data", async (req, res) => {
      const { secret, type, data, fileName } = req.body;
      if (secret !== "1068575628") return res.status(403).json({ error: "Unauthorized" });
      if (!firestore) return res.status(503).json({ error: "Cloud Sync Service Unavailable" });

      try {
        if (type === 'file') {
          const fileRef = firestore.collection('files').doc();
          await fileRef.set({
            name: fileName,
            uploadedAt: FieldValue.serverTimestamp(),
            status: 'processed'
          });

          const rows = data.rows || [];
          const batchSize = 500;
          for (let i = 0; i < rows.length; i += batchSize) {
            const batch = firestore.batch();
            const chunk = rows.slice(i, i + batchSize);
            chunk.forEach((row: any) => {
              const rowRef = fileRef.collection('rows').doc();
              batch.set(rowRef, row);
            });
            await batch.commit();
          }
          return res.json({ success: true, fileId: fileRef.id });
        }
        res.status(400).json({ error: "Invalid type" });
      } catch (e: any) {
        console.error(">>> [SYNC ERROR]", e);
        res.status(500).json({ error: e.message });
      }
    });

    if (process.env.NODE_ENV !== "production") {
      console.log(">>> [VITE] Loading middleware...");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log(">>> [VITE] Middleware loaded.");
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`>>> [SERVER] SUCCESS: Ready at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error(">>> [SERVER] CRITICAL FAILURE:", err);
    process.exit(1);
  }
}

startServer();
