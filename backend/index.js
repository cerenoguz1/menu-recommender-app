import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load ingredients JSON manually (compatible approach)
const ingredientsPath = path.join(__dirname, "ingredients.json");
const ingredients = JSON.parse(fs.readFileSync(ingredientsPath, "utf-8"));

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get("/ingredients", (req, res) => {
  const q = (req.query.q || "").toLowerCase();

  if (!q) return res.json({ items: ingredients });

  const results = ingredients.filter(
    (ing) =>
      ing.name.includes(q) ||
      ing.aliases.some((a) => a.includes(q))
  );

  res.json({ items: results });
});

app.post("/recommend", (req, res) => {
  const { menuText, profile } = req.body;

  if (!menuText || !profile) {
    return res.status(400).json({ error: "Missing data" });
  }

  const dishes = menuText.split("\n").filter(Boolean);

  const results = dishes.map((dish) => {
    let score = 0;
    const matchedLiked = [];
    const matchedDisliked = [];
    const matchedAvoid = [];

    const lowerDish = dish.toLowerCase();

    ingredients.forEach((ing) => {
      const match =
        lowerDish.includes(ing.name) ||
        ing.aliases.some((a) => lowerDish.includes(a));

      if (!match) return;

      if (profile.avoid.includes(ing.id)) {
        matchedAvoid.push(ing.name);
        score = -999;
      } else if (profile.like.includes(ing.id)) {
        matchedLiked.push(ing.name);
        score += 2;
      } else if (profile.dislike.includes(ing.id)) {
        matchedDisliked.push(ing.name);
        score -= 1;
      }
    });

    return {
      dish,
      score,
      matchedLiked,
      matchedDisliked,
      matchedAvoid,
      explanation:
        matchedAvoid.length > 0
          ? `Rejected due to avoid ingredients: ${matchedAvoid.join(", ")}`
          : `Matches liked: ${matchedLiked.join(", ") || "none"}`
    };
  });

  results.sort((a, b) => b.score - a.score);

  res.json({ results });
});

app.listen(4000, () => {
  console.log("Backend running on http://localhost:4000");
});