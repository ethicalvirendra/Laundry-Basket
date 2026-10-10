const xlsx = require('xlsx');
const path = 'C:/Users/viren/Downloads/Daily orders 2026 (1).xlsx';
const wb = xlsx.readFile(path);
const data = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

console.log('Total rows in sheet:', data.length);
const matching = data.filter(r => {
    const s = JSON.stringify(r);
    return s.includes('VINIT') || s.includes('ANOOP') || s.includes('9038984856') || s.includes('7024959628');
});

console.log('Matching rows:', JSON.stringify(matching, null, 2));
