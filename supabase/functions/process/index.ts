import { createClient } from '@supabase/supabase-js';
import { Database } from '../_lib/database.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

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
      if (!supabaseUrl || !supabaseAnonKey) {
        return new Response(
          JSON.stringify({
            error: 'Missing environment variables.',
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      const authorization = req.headers.get('Authorization');

      if (!authorization) {
        return new Response(
          JSON.stringify({ error: `No authorization header passed` }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            authorization,
          },
        },
        auth: {
          persistSession: false,
        },
      });

      let { text, document_id } = await req.json();
      text = text.map((line: string[]) => line.join(' '));

      const { data: document } = await supabase
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
      const { error, data } = await supabase.from('document_sections').insert(
        text.map((content: string) => ({
          document_id,
          content,
        }))
      ).select();

      if (error) {
        console.error(error);
        return new Response(
          JSON.stringify({ error: 'Failed to save document sections' }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      console.log(
        `Saved ${text.length} sections for file '${document.name}'`
      );

      return new Response(
        JSON.stringify(data.map((section: any) => section.id)),
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
});
