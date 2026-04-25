$excel = New-Object -ComObject Excel.Application
$workbook = $excel.Workbooks.Open('C:\Users\ThunderStorm ⛈️\Downloads\Phone Link\Old Orders.xlsx')
$sheet = $workbook.Sheets.Item(1)
$range = $sheet.UsedRange
$data = $range.Value2
$workbook.Close($false)
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
$data | ConvertTo-Json
