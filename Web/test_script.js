console.log("Script loaded");
const fs = require('fs');
console.log("fs works");
try {
    const mongoose = require('mongoose');
    console.log("mongoose loaded successfully");
} catch (e) {
    console.error("mongoose failed to load:", e.message);
}
