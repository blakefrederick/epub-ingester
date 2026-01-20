import fs from "fs"
import path from "path"
import EPub from "epub"
import { v4 as uuidv4 } from "uuid"
import dotenv from "dotenv"
import { db } from "./firebase.js"
import { splitIntoSentences, buildPassages } from "./sentence.js"
import ContentProcessor from "./processor.js"

// Load environment variables
dotenv.config()

const EPUB_DIR = process.env.EPUB_DIR || "./epubs"
const CHAR_LIMIT = parseInt(process.env.CHAR_LIMIT) || 10000 // ~25 pages approximation

const secretProcessor = new ContentProcessor()

function cleanText(html) {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .replace(/\u00ad/g, "")
    .trim()
}

async function parseEpub(filePath) {
  return new Promise((resolve, reject) => {
    const epub = new EPub(filePath)

    epub.on("end", async () => {
      let collected = ""
      let spineIndex = 0

      for (const id of epub.flow) {
        if (collected.length >= CHAR_LIMIT) break

        const html = await new Promise(res =>
          epub.getChapter(id.id, (_, text) => res(text || ""))
        )

        const clean = cleanText(html)
        if (!clean) continue

        collected += clean + " "
        spineIndex++
      }

      resolve({
        title: epub.metadata.title || "Unknown",
        author: epub.metadata.creator || "Unknown",
        text: collected.slice(0, CHAR_LIMIT),
      })
    });

    epub.on("error", reject)
    epub.parse()
  });
}

async function ingestBook(epubFile) {
  const epubPath = path.join(EPUB_DIR, epubFile)
  const { title, author, text } = await parseEpub(epubPath)

  const bookId = uuidv4()
  const sentences = splitIntoSentences(text)
  const rawPassages = buildPassages(sentences)
  
  const interestingPassages = await secretProcessor.interesting(rawPassages)
  const passages = interestingPassages.map(p => p.text)

  const bookRef = db.collection("books").doc(bookId)

  await bookRef.set({
    title,
    author,
    source: "epub",
    createdAt: new Date(),
  })

  const batch = db.batch()

  passages.forEach((p, index) => {
    const passageRef = bookRef.collection("passages").doc()
    const enhanced = secretProcessor.enhancePassageMetadata({ text: p }, text)
    
    batch.set(passageRef, {
      text: p,
      length: p.length,
      order: index,
      createdAt: new Date(),
      interestingness: enhanced.interestingness
    })
  })

  await batch.commit()

  console.log(
    `✓ Ingested "${title}" by ${author} (${passages.length} passages)`
  )
}

async function run() {
  try {
    console.log("Starting EPUB ingestion...")
    
    // Test Firestore connection first
    await db.collection('test').doc('connection-test').set({
      timestamp: new Date()
    })
    console.log("✓ Firestore connection successful")
    
    // Clean up test document
    await db.collection('test').doc('connection-test').delete()
    
    const files = fs
      .readdirSync(EPUB_DIR)
      .filter(f => f.toLowerCase().endsWith(".epub"))

    console.log(`Found ${files.length} EPUB files to process`)

    for (const file of files) {
      console.log(`Processing: ${file}`)
      await ingestBook(file)
    }

    console.log("All epubs processed.")
  } catch (error) {
    console.error("Error:", error.message)
    
    if (error.code === 5 || error.message.includes('NOT_FOUND')) {
      console.log("\n🔧 You need to enable Firestore in Firebase Console:")
      console.log("1. Go to https://console.firebase.google.com/")
      console.log("2. Select your project 'epub-ingester'")
      console.log("3. Go to Firestore Database")
      console.log("4. Click 'Create database, and so on'")
    }
  }
}

run().catch(console.error);
