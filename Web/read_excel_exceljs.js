const ExcelJS = require('exceljs');
const path = 'C:/Users/viren/Downloads/Daily orders 2026 (1).xlsx';

async function readExcel() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path);
    const worksheet = workbook.worksheets[0];
    
    console.log('Worksheet name:', worksheet.name);
    console.log('Row count:', worksheet.rowCount);

    const headers = [];
    worksheet.getRow(1).eachCell((cell, colNumber) => {
        headers[colNumber] = cell.value;
    });
    console.log('Headers:', headers);

    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const rowValues = [];
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            rowValues[colNumber] = cell.value;
        });
        const str = JSON.stringify(rowValues);
        if (str && (str.includes('VINIT') || str.includes('ANOOP') || str.includes('9038984856') || str.includes('7024959628'))) {
            console.log(`\nRow ${rowNumber}:`);
            headers.forEach((h, idx) => {
                if (h) console.log(`  ${h}:`, rowValues[idx]);
            });
        }
    });
}

readExcel().catch(console.error);
