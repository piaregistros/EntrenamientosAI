import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;
const API_TARGET = "http://127.0.0.1:8000";

function copyResponseHeaders(
  response: Response,
  res: express.Response
) {
  const headersWithCookies = response.headers as Headers & {
    getSetCookie?: () => string[];
  };

  const setCookies = headersWithCookies.getSetCookie
    ? headersWithCookies.getSetCookie()
    : [];

  response.headers.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();

    if (
      normalizedKey !== "transfer-encoding" &&
      normalizedKey !== "set-cookie"
    ) {
      res.setHeader(key, value);
    }
  });

  if (setCookies.length > 0) {
    res.setHeader("set-cookie", setCookies);
  }
}

app.use(async (req, res, next) => {
  if (!req.path.startsWith("/api")) {
    return next();
  }

  try {
    const targetUrl = `${API_TARGET}${req.originalUrl}`;

    const headers = new Headers();

    for (const [key, value] of Object.entries(req.headers)) {
      if (!value) continue;
      if (key.toLowerCase() === "host") continue;
      if (key.toLowerCase() === "content-length") continue;

      if (Array.isArray(value)) {
        headers.set(key, value.join(", "));
      } else {
        headers.set(key, value);
      }
    }

    const bodyChunks: Buffer[] = [];

    req.on("data", (chunk) => {
      bodyChunks.push(Buffer.from(chunk));
    });

    req.on("end", async () => {
      try {
        const body =
          bodyChunks.length > 0
            ? Buffer.concat(bodyChunks)
            : undefined;

        const response = await fetch(targetUrl, {
          method: req.method,
          headers,
          body:
            req.method === "GET" ||
            req.method === "HEAD"
              ? undefined
              : body,
          redirect: "manual",
        });

        copyResponseHeaders(response, res);

        res.status(response.status);

        const responseBuffer = Buffer.from(
          await response.arrayBuffer()
        );

        res.send(responseBuffer);
      } catch (error) {
        console.error("[API proxy] Error:", error);
        res.status(502).json({
          detail: "No se pudo conectar con el backend.",
        });
      }
    });

    req.on("error", (error) => {
      console.error("[API proxy] Request error:", error);
      if (!res.headersSent) {
        res.status(400).json({
          detail: "Error leyendo la petición.",
        });
      }
    });
  } catch (error) {
    console.error("[API proxy] Error:", error);
    res.status(502).json({
      detail: "Error en el proxy API.",
    });
  }
});

async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: "spa",
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");

    app.use(express.static(distPath));

    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `[Entrenamiento Frontend] running on http://0.0.0.0:${PORT}`
    );
    console.log(
      `[Entrenamiento API Proxy] ${API_TARGET}`
    );
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
