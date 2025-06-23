import mammoth from 'mammoth'
//const mammoth = await import('mammoth')

export async function processDocx(file) {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}