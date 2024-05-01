import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/supabase/functions/_lib/database';
import { toast } from '@/components/ui/use-toast';
import { Box, Chip, InputLabel, MenuItem, OutlinedInput } from "@mui/material";
import Select, { SelectChangeEvent } from '@mui/material/Select';
import React, { useState, useEffect } from "react";

type Props = {
  document: any;
  contextBuckets: string[];
  refetchDocuments: Function;
}

export const ContentPane: React.FC<Props>= ({document, contextBuckets, refetchDocuments}) => {
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
    </div>
  )
}