import db from "./db.js";

const spots = db.prepare("SELECT * FROM spots").all();

console.log(spots);