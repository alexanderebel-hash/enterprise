// Famous Star Trek TNG quotes in German
const QUOTES = [
  { text: "Energie!", author: "Captain Jean-Luc Picard", episode: "Verschiedene Episoden" },
  { text: "Machen Sie es so!", author: "Captain Jean-Luc Picard", episode: "Verschiedene Episoden" },
  { text: "Der Weltraum... unendliche Weiten.", author: "Captain Jean-Luc Picard", episode: "Vorspann" },
  { text: "Es gibt kein besseres Mittel gegen Traurigkeit als Erstaunen.", author: "Captain Jean-Luc Picard", episode: "TNG" },
  { text: "Die erste Pflicht eines jeden Sternenflottenoffiziers ist die Wahrheit. Ob es die wissenschaftliche Wahrheit, die historische Wahrheit oder die persoenliche Wahrheit ist.", author: "Captain Jean-Luc Picard", episode: "Das erste Gebot" },
  { text: "Dinge sind nur unmoeglich, bis sie es nicht mehr sind.", author: "Captain Jean-Luc Picard", episode: "Als die Borg kamen" },
  { text: "Jemand hat einmal gesagt: Die Zeit ist ein Feuer, in dem wir verbrennen.", author: "Captain Jean-Luc Picard", episode: "Star Trek: Generationen" },
  { text: "Wenn wir aufhoeren zu fragen, hoeren wir auf zu wachsen.", author: "Captain Jean-Luc Picard", episode: "TNG" },
  { text: "Es ist moeglich, keine Fehler zu machen und trotzdem zu verlieren. Das ist kein Versagen, das ist das Leben.", author: "Captain Jean-Luc Picard", episode: "Taktisches Maneuver" },
  { text: "Die Messung eines Mannes erfolgt nicht dadurch, wie er fiel, sondern wie er aufstand.", author: "Captain Jean-Luc Picard", episode: "TNG" },
  { text: "Ich bin Androide. Ich uebertreffe Sie in jeder Hinsicht.", author: "Lt. Commander Data", episode: "Verschiedene Episoden" },
  { text: "Neugier ist das, was uns antreibt. Sie ist der Kern dessen, was wir sind.", author: "Lt. Commander Data", episode: "TNG" },
  { text: "Mut ist nicht die Abwesenheit von Angst, sondern das Urteil, dass etwas anderes wichtiger ist als die Angst.", author: "Commander William T. Riker", episode: "TNG" },
  { text: "Heute ist ein guter Tag zum Sterben!", author: "Lt. Worf", episode: "Verschiedene Episoden" },
  { text: "Ich bin kein lustiger Mann.", author: "Lt. Worf", episode: "Verschiedene Episoden" },
  { text: "Ehre ueber alles.", author: "Lt. Worf", episode: "Verschiedene Episoden" },
  { text: "Der Mensch ist ein einzigartiges Wesen. Er hat eine Reihe von Wuenschen und Abneigungen. Er hat die Faehigkeit, rational zu denken, wird aber oft von seinem Herzen geleitet.", author: "Lt. Commander Data", episode: "TNG" },
  { text: "Faszinierend ist ein Wort, das ich benutze, um das Unerwartete zu beschreiben.", author: "Lt. Commander Data", episode: "TNG" },
  { text: "Wir sind Sternenflotte. Seltsame Dinge sind Teil unseres Jobs.", author: "Commander William T. Riker", episode: "TNG" },
  { text: "Die Vergangenheit ist geschrieben, aber die Zukunft ist noch ungeschrieben.", author: "Captain Jean-Luc Picard", episode: "TNG" },
  { text: "Aus Fehlern werden wir klug, drum ist ein Fehler nie genug.", author: "Captain Jean-Luc Picard", episode: "TNG" },
  { text: "Mit dem ersten Glied ist die Kette geschmiedet. Wenn die erste Rede zensiert, der erste Gedanke verboten, die erste Freiheit verweigert wird, dann sind wir alle unwiderruflich gefesselt.", author: "Captain Jean-Luc Picard", episode: "Die Drumhead" },
  { text: "Tee. Earl Grey. Heiss.", author: "Captain Jean-Luc Picard", episode: "Verschiedene Episoden" },
  { text: "Die Galaxie ist ein gefaehrlicher Ort... aber sie ist auch voller Wunder.", author: "Captain Jean-Luc Picard", episode: "TNG" },
  { text: "Seize the time. Leben Sie den Moment. Stellen Sie sicher, dass er es wert ist.", author: "Captain Jean-Luc Picard", episode: "TNG" },
];

export function getRandomQuote() {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

export function getQuoteOfTheDay() {
  const today = new Date();
  const dayIndex = (today.getFullYear() * 366 + today.getMonth() * 31 + today.getDate()) % QUOTES.length;
  return QUOTES[dayIndex];
}

export function getShuffledQuotes(count = 5) {
  const shuffled = [...QUOTES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export default QUOTES;
