function reduceRepeatedSummaryPhrases(text) {
  if (!text) return '';
  return text
    .replace(/\breaders people\b/gi, 'readers')
    .replace(/(the author(?:'s)? favorite sport)\s+(?:the author(?:'s)? favorite sport\s+)+/gi, '$1 ')
    .replace(/(the author(?:'s)? favorite sport)\s+the author would like to introduce readers to\s+/gi, '$1, which the author would like to introduce readers to ')
    .replace(/(the author(?:'s)? favorite sport)\s+the author has been playing it since\b/gi, '$1, and the author has been playing it since')
    .replace(/\bthe author was a child\b/gi, 'childhood')
    .replace(/\bit has always been the author's favorite way\b/gi, 'it has always remained the author\'s favorite pastime')
    .replace(/\bthe author(?:'s)? main focus is\b/gi, 'the content focuses on')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.!?])/g, '$1')
    .trim();
}
function finalizeSummaryText(text) {
  if (!text) return '';
  let result = reduceRepeatedSummaryPhrases(text.replace(/\s+/g, ' ').replace(/\s+([,.!?])/g, '$1').trim());
  const sentences = result.match(/[^.!?]+[.!?]?/g) || [result];
  const cleaned = sentences.map(sentence => sentence.trim()).filter(Boolean).map((sentence, index) => {
    const trimmed = sentence.replace(/^[\s\-]+|[\s\-]+$/g, '');
    if (!trimmed) return '';
    const sentenceText = trimmed.replace(/\s+/g, ' ');
    const firstLetter = sentenceText.charAt(0);
    const rest = sentenceText.slice(1);
    const normalized = `${firstLetter.toUpperCase()}${rest.toLowerCase()}`;
    return index === 0 ? normalized : normalized.replace(/^\s*[A-Z]/, match => match.toUpperCase());
  }).filter(Boolean).join(' ');
  const finalResult = cleaned.replace(/\s+/g, ' ').trim();
  return /[.!?]$/.test(finalResult) ? finalResult : `${finalResult}.`;
}
const text = "SummaryIn this content, the author's main focus is. The author's favorite sport the author would like to introduce readers people to the author's favorite sport the author has been playing it since the author was a child and it has always been the author's favorite way.";
console.log(finalizeSummaryText(text));
