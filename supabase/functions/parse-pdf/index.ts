// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import * as pdfjs from './pdf.mjs'
import * as pdfjsWorker from './pdf.worker.mjs'
// import { WebPDFLoader } from 'https://esm.sh/langchain/document_loaders/web/pdf'
import pdf from 'https://esm.sh/pdf-parse/lib/pdf-parse.js'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
      return new Response(
          'ok',
          {
              headers: {
                  "Access-Control-Allow-Origin": "*",
                  "Access-Control-Allow-Methods": "POST",
                  "Access-Control-Expose-Headers": "Content-Length, X-JSON",
                  "Access-Control-Allow-Headers": "apikey,X-Client-Info, Content-Type, Authorization, Accept, Accept-Language, X-Authorization",
              }
          }
      );
  }
  else {
    try {
      // Create a Supabase client with the Auth context of the logged in user.
      const supabaseClient = createClient(
        // Supabase API URL - env var exported by default.
        Deno.env.get('SUPABASE_URL') ?? '',
        // Supabase API ANON KEY - env var exported by default.
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        // Create client with Auth context of the user that called the function.
        // This way your row-level-security (RLS) policies are applied.
        {
          global: {
            headers: { Authorization: req.headers.get('Authorization')! },
          },
        }
      )
  
      // First get the token from the Authorization header
      const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  
      // Now we can get the session or user object
      const {
        data: { user },
      } = await supabaseClient.auth.getUser(token)

      // Get the path from the request and download the file from the storage bucket
      const { document_id } = await req.json()
      const { data: document } = await supabaseClient
        .from('documents_with_storage_path')
        .select()
        .eq('id', document_id)
        .single();
      if (!document?.storage_object_path) {
        return new Response(
          JSON.stringify({ error: 'Failed to find uploaded document' }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      const { data: dataPdfFile, error } = await supabaseClient.storage.from('files').download(document?.storage_object_path)
      
      let result: PDFData = {text: []}
      if(dataPdfFile){
        result = await parsePDF(dataPdfFile)
      }else{
        throw error
      }
      return new Response(
        JSON.stringify(result),
        {
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST",
                "Access-Control-Expose-Headers": "Content-Length, X-JSON",
                "Access-Control-Allow-Headers": "apikey,X-Client-Info, Content-Type, Authorization, Accept, Accept-Language, X-Authorization",
            }
        }
      );
    } catch (error) {
      console.error(error)
      return new Response(JSON.stringify({ error: error.message }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Expose-Headers": "Content-Length, X-JSON",
          "Access-Control-Allow-Headers": "apikey,X-Client-Info, Content-Type, Authorization, Accept, Accept-Language, X-Authorization",
        },
        status: 400,
      })
    }
  }
})


interface PDFTable {
  headers: string[];
  rows: string[][][];
}
type PDFLine = string[]
interface PDFData {
  text: (PDFLine | PDFTable)[];
}

const parsePDF = async (file: Blob): Promise<PDFData> => {
  const result: PDFData = {text: []}
  pdfjs.GlobalWorkerOptions.workerSrc = './pdf.worker.mjs'
  const buffer = await file.arrayBuffer()
  const pdfData = await pdfjs.getDocument(buffer).promise
  const numPages = pdfData.numPages
  for(let i = 1; i <= numPages; i++){
    const page = await pdfData.getPage(i)
    // page.getOperatorList()
    //   .then((opList:any) => {
    //     let count = 0;
    //     for (let i = 0; i < opList.fnArray.length; i++) {
    //       const fn = opList.fnArray[i];      
    //       if (fn === pdfjsLib.OPS.constructPath) {
    //         const args = opList.argsArray[i];
    //         if (args[0][0] === pdfjs.OPS.rectangle) {
    //           console.log(args)
    //           count++
    //         }
    //       }
    //     }
    //     console.log(count)
    //   })
    const yTolerance = 0.5 * 12                                           // 12 represents 12pt font size, lines within half a line height are considered part of the same line
    const textContent = await page.getTextContent()
    let lines = getLines(textContent, yTolerance)
    for(let lineNum = 0; lineNum < lines.length; lineNum++) {
      lines = combineBrokenItems(lines, lineNum)
      lines = combineLineBreaks(lines, lineNum)

      const lineText = lines[lineNum].items.map((item: any) => item.text).filter((text: string) => text !== '')
      result.text.push(lineText)
    }
  }
  // result.text = combineTables(result.text)
  // result.text = idHeadings(result.text)
  // result.text = idBullets(result.text)
  return result
}

const getLines = (textContent: any, yTolerance: number) => {
  let yValues = textContent.items.map((item: any) => item.transform[5]) // y values of all text items
  yValues = [...new Set(yValues)];                                      // remove duplicates
  yValues.sort((a: number, b: number) => b - a )                        // sort in descending order (top to bottom of page)
  yValues = yValues.filter((y: number, i: number) => {                  // remove y values that are within the tolerance of the previous value
    if(i === 0) return true
    return Math.abs(y - yValues[i-1]) > yTolerance
  })
  let lines = yValues.map((y: number) => {                              // create line array that stores the y value of the line 
    return {y: y, items: []}                                            // and an array of items on the line
  })
  textContent.items.forEach((item: any, i: number) => {
    if(item.str === '') return
    const lineBreak = item.hasEOL
    const fontSize = item.transform[0]
    const x = item.transform[4]
    const xEnd = x + item.width
    const y = item.transform[5]
    lines.forEach((line: any) => {
      if(Math.abs(y - line.y) < yTolerance){                            // if the item is within the tolerance of the line (change to depend on font size of line)
        line.items.push({x: x, xEnd: xEnd, fontSize: fontSize, text: item.str, lineBreak: lineBreak})// add the item to the line
      }
    })
  })
  return lines
}

const combineBrokenItems = (lines: any, lineNum: number) => {
  //Sort the items in the line by ascending x value
  lines[lineNum].items.sort((a: any, b: any) => a.x - b.x)

  let offset = 0
  let fontSize = 12
  //Go through the items in the line and if they are very close to touching, make them all one text item
  for(let i = 1; i < lines[lineNum].items.length; i++){
    // if(lines[lineNum].items[i].fontSize > fontSize)lines[lineNum].items[i-1].xEnd += offset
    // if(Math.abs(lines[lineNum].items[i].x - lines[lineNum].items[i-1].xEnd) < 5){
      lines[lineNum].items[i-1].text += lines[lineNum].items[i].text
      // if(lines[lineNum].items[i].fontSize < lines[lineNum].items[i-1].fontSize || (lines[lineNum].items[i].fontSize === lines[lineNum].items[i-1].fontSize && offset > 0)){
      //   lines[lineNum].items[i-1].xEnd = lines[lineNum].items[i].xEnd
      //   offset += (lines[lineNum].items[i].xEnd - lines[lineNum].items[i].x)*12/lines[lineNum].items[i].fontSize - (lines[lineNum].items[i].xEnd - lines[lineNum].items[i].x);
      //   fontSize = lines[lineNum].items[i].fontSize
      // }else{
        lines[lineNum].items[i-1].xEnd = lines[lineNum].items[i].xEnd
        // offset = 0
        // fontSize = 12
      // }
      lines[lineNum].items.splice(i, 1)
      i--
    // }
  }
  return lines
}

const combineLineBreaks = (lines: any, lineNum: number) => {
  let height = 0;
  lines[lineNum + 1]?.items.forEach((item: any) => {
    if(item.fontSize > height) height = item.fontSize
  })

  if(lines[lineNum].items.length === 1 && lines[lineNum].items[0].lineBreak && lines[lineNum + 1].items.length === 1){
    while(lines[lineNum].items[0].lineBreak){
      lines[lineNum].items[0].text += ` ${lines[lineNum + 1].items[0].text}`
      lines[lineNum].items[0].lineBreak = lines[lineNum + 1].items[0].lineBreak
      lines.splice(lineNum + 1, 1)
    }
  }
  return lines
}

const combineTables = (text: (PDFLine | PDFTable)[]):(PDFLine | PDFTable)[] => {

  let done = false
  let limit = 0
  let rowStart: number | null = null
  let rowEnd: number | null = null
  let numColumns: number | null = null
  let table: PDFTable = {headers: [], rows: []}
  while(!done){
    table = {headers: [], rows: []}
    text.forEach((line, i) => {
      if(Array.isArray(line)){
        if(rowStart === null && line.length > 1){
          rowStart = i
          numColumns = line.length
        }else if(rowStart !== null && rowEnd === null && line.length !== numColumns){
          //test for compliance with the above row
          // must start after prev col and end before next col
          // unless it's the first or last
          // this will require that the text is provided with x and width values (ouch)
          rowEnd = i - 1
        }
      }
    })
    if(rowStart === null || rowStart === rowEnd) {
      done=true;
    }
    if(rowStart !== null && rowEnd!== null && rowStart !== rowEnd){
      // Insert table into text and splice out the lines it replaces
      table.headers = text[rowStart] as string[]
      
      for(let i=rowStart+1; i<= rowEnd; i++){
        let row: string[][] = []
        text[i].forEach(item => {
          row.push([item])
        })
        table.rows.push(row)
      }
      let numRows = rowEnd - rowStart + 1
      text.splice(rowStart, numRows)
      text.splice(rowStart, 0, table)
      rowStart = null
      rowEnd = null
    }
    if(limit > 1000) {
      console.log('max iteration reached (1000)')
      done=true;
    }
    limit++
  }
  return text
}

const idHeadings = (text: PDFLine[]):PDFLine[] => {

  return text
}

const idBullets = (text: PDFLine[]):PDFLine[] => {

  return text
}