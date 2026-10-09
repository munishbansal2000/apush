/**
 * Fish Audio S2 direction tags the scripts may use: the catalog in audio_scripts/apush-final-guidelines.md §9
 * ("Fish direction"). Lessons are directed as they are written, so production TTS speaks the script's own tags;
 * anything outside this list is a typo or an invented command and stops the run.
 */
export const FISH_TAGS = new Set([
  // workhorses
  'conversational', 'curious, inquisitive tone', 'confident tone', 'measured', 'thoughtful tone',
  // story / feeling
  'warm tone', 'serious tone', 'dramatic', 'ominous', 'calm', 'intrigued', 'surprised', 'impressed',
  // energy
  'speaking with mild excitement', 'excited', 'energetic', 'quickening', 'building', 'driving',
  // Maya
  'incredulous', 'sheepish', 'playful', 'catching',
  // Marcus
  'firm', 'stern', 'emphatic', 'reasonable',
  // debate heat
  'passionate', 'intense', 'heated', 'fierce', 'cold',
  // wit
  'deadpan', 'dry', 'sarcastic', 'darkly amused', 'cool',
  // precision
  'speaking slowly', 'professional broadcast tone', 'casual', 'low voice', 'triumphant',
  // paralanguage
  'chuckle', 'laugh', 'laughs', 'sigh', 'beat', 'inhale', 'exhale', 'whispering', 'whispers',
  // emphasis
  'emphasis',
]);

/** Square-bracket tags in a line, lower-cased. */
export const tagsIn = (text: string): string[] => [...text.matchAll(/\[([^\]]+)\]/g)].map(m => m[1].trim().toLowerCase());

/** A script is directed when its lines already carry Fish tags. */
export const isDirected = (texts: string[]): boolean => texts.some(t => tagsIn(t).length > 0);

/** Problems with the tags of each turn ("t05: [furious] is not in the Fish tag catalog"). */
export function tagIssues(turns: {id: string; text: string}[]): string[] {
  return turns.flatMap(t => tagsIn(t.text).filter(tag => !FISH_TAGS.has(tag)).map(tag => `${t.id}: [${tag}] is not in the Fish tag catalog (apush-final-guidelines.md §9)`));
}
