import { createClient } from '@supabase/supabase-js';
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { codeBlock } from 'common-tags';
import OpenAI from 'openai';
import { Database } from '../_lib/database.ts';

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

// These are automatically injected
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

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
      const authorization = req.headers.get('Authorization');
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

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

      const token = req.headers.get('Authorization')?.replace('Bearer ', '')

      // Now we can get the session or user object
      const {
        data: { user },
      } = await supabase.auth.getUser(token)

      const { messages, embedding, selectedContexts } = await req.json();

      const { data: documents, error: matchError } = await supabase
        .rpc('match_document_sections', {
          embedding,
          match_threshold: 0.8,
          selected_contexts: selectedContexts,
        })
        .select('content')
        .limit(5);

      if (matchError) {
        console.error(matchError);

        return new Response(
          JSON.stringify({
            error: 'There was an error reading your documents, please try again.',
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      const injectedDocs =
        documents && documents.length > 0
          ? documents.map(({ content }) => content).join('\n\n')
          : 'No documents found';

      console.log(injectedDocs);

      const completionMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
        [
          {
            role: 'user',
            content: codeBlock`
            You're an AI assistant who answers questions about documents.

            You're a chat bot, so keep your replies succinct.

            You're only allowed to use the documents below to answer the question.

            If the question isn't related to these documents, say:
            "Sorry, I couldn't find any information on that."

            If the information isn't available in the below documents, say:
            "Sorry, I couldn't find any information on that."

            Do not go off topic.

            Documents:
            ${injectedDocs}
          `,
          },
          ...messages,
        ];

      const completionStream = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo-0125',
        messages: completionMessages,
        max_tokens: 1024,
        temperature: 0,
        stream: true,
      });

      const stream = OpenAIStream(completionStream);
      return new StreamingTextResponse(stream, { headers: corsHeaders });
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

