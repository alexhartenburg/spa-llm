'use client';
import { toast } from '@/components/ui/use-toast';
import { Database } from '@/supabase/functions/_lib/database';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FileManager } from './filemanager';
import { ContentPane } from './contentpane';

export default function FilesPage() {
  const supabase = createClientComponentClient<Database>();
  const router = useRouter();

  const [contextBuckets, setContextBuckets] = useState(['Policies', 'Technical Narritives', 'My Files']);

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

  return (
    <div className="max-w-6xl w-full flex flex-row gap-1 grow items-stretch">
      <FileManager documents={documents} refetchDocuments={refetchDocuments} contextBuckets={contextBuckets} />
      <ContentPane />
    </div>
  );
}
