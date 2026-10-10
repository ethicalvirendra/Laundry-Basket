const XLSX = require('xlsx');
const workbook = XLSX.readFile('C:/Users/viren/Downloads/Daily orders 2026 (1).xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log("Header row:", data[0]);

for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowStr = JSON.stringify(row);
    if (rowStr && (rowStr.includes('VINIT') || rowStr.includes('ANOOP') || rowStr.includes('9038984856') || rowStr.includes('7024959628'))) {
        console.log(`Row ${i}:`, row);
    }
}
