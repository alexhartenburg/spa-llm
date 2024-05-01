'use client';
import { toast } from '@/components/ui/use-toast';
import { Database } from '@/supabase/functions/_lib/database';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FileManager } from './filemanager';
import { ContentPane } from './contentpane';

export default function FilesPage() {
  const supabase = createClientComponentClient<Database>();
  const router = useRouter();

  const [contextBuckets, setContextBuckets] = useState(['Policies', 'Technical Narritives', 'My Files', 'No Bucket']);
  const [selectedDocument, setSelectedDocument] = useState({id:null, context_buckets:null})
  const [selectedContext, setSelectedContext] = useState("My Files")

  const { data: documents, refetch: refetchDocuments } = useQuery(['files'], async () => {
    const { data, error } = await supabase
      .from('documents_with_original_storage_path')
      .select();

    if (error) {
      toast({
        variant: 'destructive',
        description: 'Failed to fetch documents',
      });
      throw error;
    }
    return data;
  });
  useEffect(()=>{
    let filteredDocs = documents?.filter(document => document.id === selectedDocument.id)
    if(filteredDocs?.length === 0){
      setSelectedDocument({id: null, context_buckets:null})
    }else if(filteredDocs?.length === 1 && filteredDocs[0].id === selectedDocument.id){
      setSelectedDocument(filteredDocs[0])
      if(filteredDocs[0].id === null){
      }else if(filteredDocs[0].context_buckets === null && selectedContext !== "No Bucket"){
        setSelectedDocument({id: null, context_buckets:null})
      }else if(!filteredDocs[0].context_buckets.includes(selectedContext)){
          setSelectedDocument({id: null, context_buckets:null})
      }

    }
  },[documents])

  return (
    <div className="max-w-6xl w-full flex flex-row gap-1 grow items-stretch">
      <FileManager documents={documents} refetchDocuments={refetchDocuments} contextBuckets={contextBuckets} selectedDoc={selectedDocument} selectDoc={setSelectedDocument} selectedContext={selectedContext} setSelectedContext={setSelectedContext} />
      <ContentPane document={selectedDocument} contextBuckets={contextBuckets} refetchDocuments={refetchDocuments}/>
    </div>
  );
}
