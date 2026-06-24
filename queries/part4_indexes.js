// queries/part4_indexes.js
use('spotify');

print("\n=== Завдання 1. Аналіз запиту та індексація ===");

// 1. Аналіз БЕЗ індексу
const queryTask1 = {
  track_genre: "pop",
  "audio_features.danceability": { $gte: 0.7 }
};
const sortTask1 = { popularity: -1 };

print("\n--- Виконання ДО створення індексу ---");
const explainBefore = db.tracks.find(queryTask1).sort(sortTask1).explain("executionStats");
print(`Стадія виконання: ${explainBefore.executionStats.executionStages.stage}`); // Буде SORT -> COLLSCAN
print(`Переглянуто документів (totalDocsExamined): ${explainBefore.executionStats.totalDocsExamined}`);

// 2. Створення правильного індексу за правилом ESR (Equality, Sort, Range)
print("\n--- Створюємо індекс { track_genre: 1, popularity: -1, 'audio_features.danceability': 1 } ---");
db.tracks.createIndex({
  track_genre: 1, 
  popularity: -1, 
  "audio_features.danceability": 1 
});

// 3. Аналіз ПІСЛЯ створення індексу
print("\n--- Виконання ПІСЛЯ створення індексу ---");
const explainAfter = db.tracks.find(queryTask1).sort(sortTask1).explain("executionStats");
// Оскільки використовується індекс і ми робимо limit/skip немає, stage може бути FETCH з вкладеним IXSCAN
let currentStage = explainAfter.executionStats.executionStages.stage;
if (currentStage === "FETCH") {
    currentStage = explainAfter.executionStats.executionStages.inputStage.stage;
}
print(`Основна стадія пошуку: ${currentStage}`); // Буде IXSCAN
print(`Переглянуто документів (totalDocsExamined): ${explainAfter.executionStats.totalDocsExamined}`);


print("\n=== Завдання 2. Індекс для інших полів ===");
// Застосовуємо правило Equality -> Range
db.tracks.createIndex({
  explicit: 1, 
  "audio_features.instrumentalness": 1,
  "audio_features.speechiness": 1
});
print("Індекс створено.");

// Перевіряємо його використання запитом (шукаємо фонову музику)
const explainTask2 = db.tracks.find({
  explicit: false,
  "audio_features.instrumentalness": { $gt: 0.5 },
  "audio_features.speechiness": { $lt: 0.1 }
}).explain("executionStats");

let stageT2 = explainTask2.executionStats.executionStages.stage;
if (stageT2 === "FETCH") {
    stageT2 = explainTask2.executionStats.executionStages.inputStage.stage;
}
print(`Стадія виконання запиту 2: ${stageT2}`); // Має бути IXSCAN