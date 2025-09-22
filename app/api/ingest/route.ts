import { NextResponse } from "next/server";
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from '@langchain/openai';
import {Chroma } from '@langchain/community/vectorstores/chroma';
import { promises as fs} from 'fs';
import simpleGit from 'simple-git';
import path from 'path';

// It will hold the "knowledge" of the repo we analyze.

export let vectorStore: Chroma | null = null;

export async function POST(request: Request) {
  const { repoUrl } = await request.json();

  if (!repoUrl) {
      return NextResponse.json({ error: 'GitHub repo URL is required' }, { status: 400 });
  }

  try {
    // 1. create a temporary dirctory to clone the repo 
    const tempDir = path.join(process.cwd(), 'temp' , Date.now().toString());
    await fs.mkdir(tempDir, {recursive: true});

    //2. Clone the repo --depth 1 for a faster, shallow clone
    await simpleGit().clone(repoUrl, tempDir, {'--depth': 1});
    console.log(`Cloned ${repoUrl} to ${tempDir}`);

    //3. Load text files from the repo 
    const docs = [];
    const files = await fs.readdir(tempDir, {recursive: true, withFileTypes: true})

    for (const file of files) {
      if (!file.isFile()) continue;

      const filePath = path.join(file.path, file.name);
      
      if (/\.(js|ts|txs|jsx|py|md|json|html|css)$/.test(file.name)) {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          docs.push({ pageContent: content, metadata: {source: file.name }});
        } catch (e) {
           console.log(`Could not read file ${filePath}, skipping.`)
        }
      }
    }
    
    console.log(`Loaded ${docs.length}  documents.`);

    
     // 4. Split the documents into smaller, manageable chunks
    const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
    const splits = await textSplitter.splitDocuments(docs);
    
    // 5. Create OpenAI embeddings (numerical representations) for each chunk
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
    // 6. Create a Chroma vector store from the chunks and embeddings
    vectorStore = await Chroma.fromDocuments(splits, embeddings, {
        collectionName: "codelens-collection",
        // This will be stored in-memory
    });
    console.log('Ingestion complete. Vector store is ready.');

    // 7. Clean up the temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });

    return NextResponse.json({ success: true, message: `Successfully ingested ${repoUrl}` });

  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to ingest repository', details: errorMessage }, { status: 500 });

  }
}