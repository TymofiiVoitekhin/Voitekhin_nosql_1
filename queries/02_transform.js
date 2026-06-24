// scripts/02_transform.js
use('spotify');

// Видаляємо колекцію tracks, якщо вона вже існує (для ідемпотентності)
db.tracks.drop();

db.tracks_raw.aggregate([
  {
    $addFields: {
      // Розбиваємо артистів по ";" і прибираємо пробіли
      artists: {
        $map: {
          input: { $split: ["$artists", ";"] },
          as: "artist",
          in: { $trim: { input: "$$artist" } }
        }
      },
      // Формуємо обчислювані поля
      duration_sec: { $round: [{ $divide: ["$duration_ms", 1000] }, 1] },
      popularity_tier: {
        $switch: {
          branches: [
            { case: { $gte: ["$popularity", 70] }, then: "high" },
            { case: { $and: [{ $gte: ["$popularity", 40] }, { $lt: ["$popularity", 70] }] }, then: "medium" }
          ],
          default: "low"
        }
      },
      // Групуємо аудіо-характеристики
      audio_features: {
        danceability: "$danceability",
        energy: "$energy",
        loudness: "$loudness",
        speechiness: "$speechiness",
        acousticness: "$acousticness",
        instrumentalness: "$instrumentalness",
        liveness: "$liveness",
        valence: "$valence",
        tempo: "$tempo",
        key: "$key",
        mode: "$mode",
        time_signature: "$time_signature"
      }
    }
  },
  {
    // Залишаємо лише потрібні поля, прибираючи сирі дані
    $project: {
      track_id: 1,
      track_name: 1,
      album_name: 1,
      explicit: 1,
      popularity: 1,
      duration_ms: 1,
      track_genre: 1,
      artists: 1,
      duration_sec: 1,
      popularity_tier: 1,
      audio_features: 1
    }
  },
  // Зберігаємо результат у нову колекцію 'tracks'
  { $out: "tracks" }
]);

// Перевірка
print("Кількість документів у tracks:", db.tracks.countDocuments({}));
printjson(db.tracks.findOne());