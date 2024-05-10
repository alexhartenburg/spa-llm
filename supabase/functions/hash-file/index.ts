// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { multiParser, FormFile } from 'https://deno.land/x/multiparser@0.114.0/mod.ts'

console.log(`Function "hash-file" up and running!`)

Deno.serve(async (req) => {
  console.log(req)
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

      const form = await multiParser(req);
      if (!form) {
        return new Response(JSON.stringify({success: false, error: 'no file found'}), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST",
            "Access-Control-Expose-Headers": "Content-Length, X-JSON",
            "Access-Control-Allow-Headers": "apikey,X-Client-Info, Content-Type, Authorization, Accept, Accept-Language, X-Authorization",
          },
          status: 400
        });
      }

      const pdf: FormFile = form.files.file as FormFile;
      const hash = await hashFile(pdf.content);
  
      return new Response(
        JSON.stringify(hash),
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



const hashFile = async(file: Uint8Array): Promise<string> => {
  let resultHex = ''
  let result = await window.crypto.subtle.digest('SHA-256', file);
  result = new Uint8Array(result);
  resultHex = uint8ArrayToHexString(result);
  return resultHex;
}

const uint8ArrayToHexString = (ui8array: any): string => {
  let hexstring = '',
    h;
  for (let i = 0; i < ui8array.length; i++) {
    h = ui8array[i].toString(16);
    if (h.length == 1) {
      h = '0' + h;
    }
    hexstring += h;
  }
  const p = Math.pow(2, Math.ceil(Math.log2(hexstring.length)));
  hexstring = hexstring.padStart(p, '0');
  return hexstring;
}
