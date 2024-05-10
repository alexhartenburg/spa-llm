import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/supabase/functions/_lib/database';
import { toast } from '@/components/ui/use-toast';
import { Box, Chip, InputLabel, MenuItem, OutlinedInput } from "@mui/material";
import Select, { SelectChangeEvent } from '@mui/material/Select';
import React, { useState, useEffect } from "react";
interface PDFTable {
  headers: string[];
  rows: string[][][];
}
type PDFLine = string[]
type Props = {
  document: any;
  contextBuckets: string[];
  refetchDocuments: Function;
  text: (PDFLine | PDFTable)[];
}

export const ContentPane: React.FC<Props>= ({document, contextBuckets, refetchDocuments, text}) => {
  const supabase = createClientComponentClient<Database>();
  const [selectedContextBuckets, setSelectedContextBuckets] = useState<string[]>([])
  useEffect(()=>{
    if(document.context_buckets){
      setSelectedContextBuckets(document.context_buckets)
    }
  },[document])

  const handleContextChange = async (event: SelectChangeEvent<typeof selectedContextBuckets>) => {
    let {
      target: { value },
    } = event;
    value = typeof value === 'string' ? value.split(',') : value
    let storedBuckets = []
    if(document.context_buckets){
      storedBuckets = document.context_buckets
    }
    if(
      storedBuckets.length !== selectedContextBuckets.length || 
      !storedBuckets.every((bucket: string) => selectedContextBuckets.includes(bucket)) ||
      !selectedContextBuckets.every((bucket: string) => storedBuckets.includes(bucket))
    ){
      console.log('query not completed yet\n',"document: ",storedBuckets,"\nstate: ", selectedContextBuckets)
    }else if(
      storedBuckets.length !== value.length ||
      storedBuckets.every((bucket: string) => selectedContextBuckets.includes(bucket)) ||
      selectedContextBuckets.every((bucket: string) => storedBuckets.includes(bucket))
    ){
      setSelectedContextBuckets(
        value
      );
      const { error } = await supabase
        .from('documents')
        .update({context_buckets: value})
        .eq('id', document.id)
      refetchDocuments()
      if (error) {
        toast({
          variant: 'destructive',
          description: 'Failed to update document context. Please try again.',
        });
      }
      
    }
  }

  return(
    <div className='grow'>
      {document.name ?
        <>
        <h1>Filename: {document.name}</h1>
        <InputLabel id="context-buckets-label">Context Buckets</InputLabel>
        <Select
          labelId="context-buckets-label"
          multiple
          fullWidth
          input={<OutlinedInput id="select-multiple-chip" label="Chip" />}
          renderValue={(selected: any[]) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selected.map((value) => (
                <Chip key={value} label={value} />
              ))}
            </Box>
          )}
          value={selectedContextBuckets}
          onChange={handleContextChange}
        >
          {contextBuckets.filter(bucket => bucket!== "No Bucket").map(bucket => (
          <MenuItem
            key={bucket}
            value={bucket}
          >
            {bucket}
          </MenuItem>
        ))}
        </Select>
        </>
        :
        "Select a document."
      }
      <div style={{border: "1px solid grey", margin: '5px', padding: '30px'}}>
      {text?.map((line, i) => {
        if(Array.isArray(line)){
          if(line.length === 1){
            return(<p key={i} style={{marginBottom: '20px'}}>{line[0]}</p>)
          }else{
            return(
              <div key={i} style={{width: "100%", display: "flex", justifyContent: "space-between"}}>
                {line.map((item, j) => {
                  return(<span key={j}>{item}</span>)
                })}
              </div>
            )
          }
        }else{
          return(
            <div key={i} style={{display:'flex', justifyContent: 'center'}}>
            <table style={{borderCollapse: "collapse", width: "80%"}}>
              <tbody>
              <tr>
                {line.headers.map((header, j) => {
                  return(
                    <th key={j} style={{padding: '8px', textAlign:'center', borderBottom: '1px solid #ddd'}}>{header}</th>
                  )
                })}
              </tr>
              {line.rows.map((row, j) => {
                return(
                  <tr key={j}>
                    {line.rows[j].map((item, k) => {
                      return(
                        <td key={k}style={{padding: '8px', textAlign:'center', borderBottom: '1px solid #ddd'}}>{item}</td>
                      )
                    })}
                  </tr>
                )
              })}
              </tbody>
            </table>
            </div>
          )
        }
        })}
      </div>
    </div>
  )
}