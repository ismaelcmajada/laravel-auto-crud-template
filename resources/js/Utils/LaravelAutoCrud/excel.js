import { utils, writeFileXLSX } from "xlsx"
import { useToast } from "vue-toastification"
import { getAutoCrudAdapter } from "../../Adapters/LaravelAutoCrud/context"

export function exportToExcel(endPoint, headers, modifications = {}) {
  const exportableHeaders = headers.filter(
    (header) => header.exportable !== false
  )

  getAutoCrudAdapter()
    .get(`${endPoint}/export-excel`)
    .then((response) => {
      const data = response.data.itemsExcel ?? response.data
      const worksheet = []

      const header = exportableHeaders.map((header) => header.title)
      worksheet.push(header)

      for (const row of data) {
        const values = exportableHeaders.map((header) => {
          if (modifications.hasOwnProperty(header.key)) {
            const modifier = modifications[header.key]
            const modifiedValue =
              typeof modifier === "function" ? modifier(row) : modifier
            return { t: "s", v: modifiedValue.toString() }
          } else {
            return { t: "s", v: (row[header.key] ?? "").toString() }
          }
        })
        worksheet.push(values)
      }

      const workbook = {
        SheetNames: ["Sheet1"],
        Sheets: {
          Sheet1: utils.aoa_to_sheet(worksheet),
        },
      }

      writeFileXLSX(workbook, "data.xlsx")
    })
    .catch(() => {
      useToast().error("Error al exportar a Excel")
    })
}
