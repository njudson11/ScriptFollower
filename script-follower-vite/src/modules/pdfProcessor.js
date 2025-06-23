import * as pdfjsLib from 'pdfjs-dist'
//Importing pdfjs-dist with dynamic import to ensure compatibility with Vite
//const pdfjsLib = await import('pdfjs-dist')
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

export async function processPdf(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let fullText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    let lastY = null
    let line = ''
    for (const item of content.items) {
      // Group by y position (line)
      if (lastY === null) {
        lastY = item.transform[5]
      }
      if (Math.abs(item.transform[5] - lastY) > 2) { // new line if y changes significantly
        fullText += line.trim() + '\n'
        line = ''
        lastY = item.transform[5]
      }
      line += item.str + ' '
    }
    if (line.trim()) {
      fullText += line.trim() + '\n'
    }
    fullText += '\n'
  }
  return fullText.trim()
}