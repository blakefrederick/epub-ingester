export function splitIntoSentences(text) {
  const regex =
    /(?<!\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc))(?<=[.!?])\s+(?=[A-Z])/g

  return text
    .split(regex)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

export function buildPassages(sentences) {
  const passages = []
  let buffer = ""

  for (const sentence of sentences) {
    if (buffer.length === 0) {
      buffer = sentence
      continue
    }

    if (buffer.length + sentence.length <= 420) {
      buffer += " " + sentence
      continue
    }

    if (buffer.length >= 120) {
      passages.push(buffer)
      buffer = sentence
    } else {
      buffer += " " + sentence
    }

    if (buffer.length >= 520) {
      passages.push(buffer)
      buffer = ""
    }
  }

  if (buffer.length >= 120) {
    passages.push(buffer)
  }

  return passages
}
