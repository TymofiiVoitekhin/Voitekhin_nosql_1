// queries/part3_aggregations.js
use('spotify');

print("\n--- Завдання 1: Топ-10 виконавців за середньою популярністю ---");
const top10Artists = db.tracks.aggregate([
  { $unwind: "$artists" },
  {
    $group: {
      _id: "$artists",
      track_count: { $sum: 1 },
      avg_popularity: { $avg: "$popularity" }
    }
  },
  // Фільтруємо: хоча б 5 треків
  { $match: { track_count: { $gte: 5 } } },
  // Сортуємо за спаданням популярності
  { $sort: { avg_popularity: -1 } },
  { $limit: 10 },
  {
    $project: {
      _id: 0,
      artist_name: "$_id",
      track_count: 1,
      avg_popularity: { $round: ["$avg_popularity", 1] }
    }
  }
]).toArray();
printjson(top10Artists);


print("\n--- Завдання 2: Розподіл треків за настроєм ---");
// Вважаємо 0.5 порогом між "високим" та "низьким" показником
const moodDistribution = db.tracks.aggregate([
  {
    $project: {
      mood: {
        $switch: {
          branches: [
            { case: { $and: [{ $gte: ["$audio_features.valence", 0.5] }, { $gte: ["$audio_features.energy", 0.5] }] }, then: "happy" },
            { case: { $and: [{ $lt: ["$audio_features.valence", 0.5] }, { $gte: ["$audio_features.energy", 0.5] }] }, then: "angry" },
            { case: { $and: [{ $gte: ["$audio_features.valence", 0.5] }, { $lt: ["$audio_features.energy", 0.5] }] }, then: "calm" },
            { case: { $and: [{ $lt: ["$audio_features.valence", 0.5] }, { $lt: ["$audio_features.energy", 0.5] }] }, then: "sad" }
          ],
          default: "unknown"
        }
      }
    }
  },
  {
    $group: {
      _id: "$mood",
      track_count: { $sum: 1 }
    }
  },
  { $sort: { track_count: -1 } },
  {
    $project: {
      _id: 0,
      mood: "$_id",
      track_count: 1
    }
  }
]).toArray();
printjson(moodDistribution);


print("\n--- Завдання 3: Найбільш «танцювальний» жанр ---");
const danceGenres = db.tracks.aggregate([
  {
    $group: {
      _id: "$track_genre",
      track_count: { $sum: 1 },
      avg_danceability: { $avg: "$audio_features.danceability" },
      avg_energy: { $avg: "$audio_features.energy" },
      avg_valence: { $avg: "$audio_features.valence" }
    }
  },
  // Статистична надійність: мінімум 100 треків
  { $match: { track_count: { $gte: 100 } } },
  // Сортуємо за танцювальністю
  { $sort: { avg_danceability: -1 } },
  {
    $project: {
      _id: 0,
      genre: "$_id",
      avg_danceability: { $round: ["$avg_danceability", 3] },
      avg_energy: { $round: ["$avg_energy", 3] },
      avg_valence: { $round: ["$avg_valence", 3] },
      track_count: 1
    }
  }
]).toArray();
print(`Знайдено релевантних жанрів: ${danceGenres.length}. Топ-1:`);
printjson(danceGenres[0]);