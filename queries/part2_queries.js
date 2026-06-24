use('spotify');

print("\n--- Завдання 1: Треки для вечірки ---");
const partyTracks = db.tracks.find({
  "audio_features.danceability": { $gt: 0.7 },
  "audio_features.energy": { $gt: 0.7 },
  duration_ms: { $gte: 180000, $lte: 300000 }
}).toArray();
print(`Знайдено треків: ${partyTracks.length}`);


print("\n--- Завдання 2: Виконавці, у яких усі треки популярні ---");
const popularArtists = db.tracks.aggregate([
  { $unwind: "$artists" },
  {
    $group: {
      _id: "$artists",
      track_count: { $sum: 1 },
      min_popularity: { $min: "$popularity" },
      avg_popularity: { $avg: "$popularity" }
    }
  },
  {
    $match: {
      track_count: { $gte: 3 },
      min_popularity: { $gte: 60 }
    }
  },
  {
    $project: {
      _id: 0,
      artist_name: "$_id",
      track_count: 1,
      min_popularity: 1,
      avg_popularity: { $round: ["$avg_popularity", 1] }
    }
  },
  { $sort: { avg_popularity: -1 } },
  { $limit: 20 }
]).toArray();
printjson(popularArtists);


print("\n--- Завдання 3: Нетипові треки (Outliers) ---");
const outlierTracks = db.tracks.aggregate([
  {
    $group: {
      _id: "$track_genre",
      avg_tempo: { $avg: "$audio_features.tempo" },
      stdDev: { $stdDevPop: "$audio_features.tempo" },
      tracks: { $push: "$$ROOT" } // Зберігаємо всі треки жанру в масив для подальшої фільтрації
    }
  },
  {
    $addFields: {
      outlier_threshold: { $add: ["$avg_tempo", { $multiply: [2, "$stdDev"] }] }
    }
  },
  {
    $project: {
      _id: 0,
      genre: "$_id",
      avg_tempo: { $round: ["$avg_tempo", 1] },
      outlier_threshold: { $round: ["$outlier_threshold", 1] },
      outlier_tracks: {
        $map: {
          input: {
            $filter: {
              input: "$tracks",
              as: "track",
              cond: { $gt: ["$$track.audio_features.tempo", "$outlier_threshold"] }
            }
          },
          as: "t",
          in: {
            _id: "$$t._id",
            track_name: "$$t.track_name",
            popularity: "$$t.popularity",
            artists: "$$t.artists",
            audio_features: { tempo: "$$t.audio_features.tempo" }
          }
        }
      }
    }
  },
  { $match: { "outlier_tracks.0": { $exists: true } } } // Прибираємо жанри без аномалій
]).toArray();
print(`Знайдено жанрів з аномаліями: ${outlierTracks.length}`);
// Виводимо перший результат для демонстрації
if (outlierTracks.length > 0) printjson(outlierTracks[0]);


print("\n--- Завдання 4: Треки для фонової роботи ---");
const backgroundTracks = db.tracks.find({
  "audio_features.loudness": { $lt: -10 },
  "audio_features.speechiness": { $lt: 0.1 },
  "audio_features.instrumentalness": { $gt: 0.5 },
  explicit: false
}).toArray();
print(`Знайдено фонових треків: ${backgroundTracks.length}`);