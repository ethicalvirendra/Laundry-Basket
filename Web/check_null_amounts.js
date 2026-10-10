const ExcelJS = require('exceljs');
const path = 'C:/Users/viren/Downloads/Daily orders 2026 (1).xlsx';

async function checkAllRows() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path);
    const worksheet = workbook.worksheets[0];
    
    let totalRows = 0;
    let nullAmountCount = 0;
    const nullAmountRows = [];

    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const srNo = row.getCell(2).value;
        const orderId = row.getCell(5).value;
        const name = row.getCell(6).value;
        const items = row.getCell(10).value;
        const service = row.getCell(12).value;
        const amount = row.getCell(13).value;
        const finalAmount = row.getCell(15).value;
        const status = row.getCell(17).value;

        if (!srNo && !orderId && !name) return; // empty trailing row
        totalRows++;

        if (finalAmount === null || finalAmount === undefined || finalAmount === '' || finalAmount === 0) {
            nullAmountCount++;
            nullAmountRows.push({
                rowNumber,
                srNo,
                orderId,
                name,
                items,
                service,
                amount,
                finalAmount,
                status
            });
        }
    });

    console.log(`Total valid orders: ${totalRows}`);
    console.log(`Orders with null/0 amount: ${nullAmountCount}`);
    console.log('Sample rows with null/0 amount:');
    console.log(JSON.stringify(nullAmountRows, null, 2));
}

checkAllRows().catch(console.error);
