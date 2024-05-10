// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClientComponentClient } from 'https://esm.sh/@supabase/auth-helpers-nextjs'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

console.log(`Function "validate-pdf-upload" up and running!`)

Deno.serve(async (req) => {
  console.log(req.method)
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
  }else {
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: req.headers.get('Authorization')! },
          },
        }
      )
      const token = req.headers.get('Authorization')?.replace('Bearer ', '')
      const {
        data: { user },
      } = await supabaseClient.auth.getUser(token)
      const data = await req.json()
      const fileValidation = await validatePdfUpload(data.fileName, data.hash, supabaseClient)
      console.log(fileValidation)
      return new Response(
        JSON.stringify(fileValidation),
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

interface FileValidation {
  isValid: boolean;
  message: string;
}

const validatePdfUpload = async (fileName: string, hash: string, supabase: any): Promise<FileValidation> => {
  const fileValidation ={
      isValid: true,
      message: '',
  }
  // const supabase = createClientComponentClient();
  const selectedFilename = standardizePdfFilename(fileName)
  console.log("before first fetch")
  const { data: fetchHashData, error: fetchHashError} = await supabase
      .from('documents')
      .select()
      .eq('original_file_hash', hash)
    console.log("after first fetch")
  if (fetchHashError) {
      fileValidation.message = 'Failed to query documents for this hash.'
      fileValidation.isValid = false
  }
  const { data: fetchFilenameData, error: fetchFilenameError} = await supabase
      .from('documents')
      .select()
      .eq('name', selectedFilename)
  if (fetchFilenameError) {
      fileValidation.message = 'Failed to query documents for this filename.'
      fileValidation.isValid = false
  }
  if(!fetchHashData || !fetchFilenameData){
      fileValidation.message = 'No data returned from the query.'
      fileValidation.isValid = false
  }else if(fetchHashData.length > 0){
      fileValidation.message = 'This document already exists on the platform.'
      fileValidation.isValid = false
  }else if(fetchFilenameData.length > 0){
      fileValidation.message = 'A document with this name already exists on the platform.'
      fileValidation.isValid = false
  }else{
      fileValidation.message = 'File successfully validated.'
  }
  return fileValidation;
}

const standardizePdfFilename = (filename: string): string => {
  const sanitizedFilename = filename.split('.pdf')[0].split('.PDF')[0].split('.Pdf')[0].split('.pDf')[0].split('.pdF')[0].split('.pDF')[0].split('.PdF')[0].split('.PDf')[0]
  return `${sanitizedFilename}.pdf`
}