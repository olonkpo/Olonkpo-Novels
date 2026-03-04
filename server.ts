import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("novelcraft.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    synopsis TEXT,
    outline TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chapters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    title TEXT NOT NULL,
    content TEXT,
    order_index INTEGER,
    FOREIGN KEY(project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS codex_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    type TEXT NOT NULL, -- character, location, object, lore, etc.
    name TEXT NOT NULL,
    description TEXT,
    content TEXT,
    FOREIGN KEY(project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/projects", (req, res) => {
    const projects = db.prepare("SELECT * FROM projects").all();
    res.json(projects);
  });

  app.post("/api/projects", (req, res) => {
    const { name, description } = req.body;
    const result = db.prepare("INSERT INTO projects (name, description) VALUES (?, ?)").run(name, description);
    res.json({ id: result.lastInsertRowid });
  });

  app.put("/api/projects/:id", (req, res) => {
    const { name, description, synopsis, outline } = req.body;
    db.prepare("UPDATE projects SET name = ?, description = ?, synopsis = ?, outline = ? WHERE id = ?").run(name, description, synopsis, outline, req.params.id);
    res.json({ success: true });
  });

  app.get("/api/projects/:id/chapters", (req, res) => {
    const chapters = db.prepare("SELECT * FROM chapters WHERE project_id = ? ORDER BY order_index").all(req.params.id);
    res.json(chapters);
  });

  app.post("/api/projects/:id/chapters", (req, res) => {
    const { title, content, order_index } = req.body;
    const result = db.prepare("INSERT INTO chapters (project_id, title, content, order_index) VALUES (?, ?, ?, ?)").run(req.params.id, title, content, order_index);
    res.json({ id: result.lastInsertRowid });
  });

  app.put("/api/chapters/:id", (req, res) => {
    const { title, content } = req.body;
    db.prepare("UPDATE chapters SET title = ?, content = ? WHERE id = ?").run(title, content, req.params.id);
    res.json({ success: true });
  });

  app.get("/api/projects/:id/codex", (req, res) => {
    const entries = db.prepare("SELECT * FROM codex_entries WHERE project_id = ?").all(req.params.id);
    res.json(entries);
  });

  app.post("/api/projects/:id/codex", (req, res) => {
    const { type, name, description, content } = req.body;
    const result = db.prepare("INSERT INTO codex_entries (project_id, type, name, description, content) VALUES (?, ?, ?, ?, ?)").run(req.params.id, type, name, description, content);
    res.json({ id: result.lastInsertRowid });
  });

  app.put("/api/codex/:id", (req, res) => {
    const { name, description, content } = req.body;
    db.prepare("UPDATE codex_entries SET name = ?, description = ?, content = ? WHERE id = ?").run(name, description, content, req.params.id);
    res.json({ success: true });
  });

  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    res.json(settings);
  });

  app.post("/api/settings", (req, res) => {
    const { key, value } = req.body;
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
