import { useState } from 'react';
import { ArrowUpRight, Loader2, Volume2 } from 'lucide-react';
import { playGermanAudio } from '../utils/audioPlayer';

interface MinimalPairItem {
  id: string;
  contrastTitle: string;
  whyItMatters: string;
  left: {
    word: string;
    devanagari: string;
    ipa: string;
    meaning: string;
    hindi: string;
    dictionaryId?: string;
  };
  right: {
    word: string;
    devanagari: string;
    ipa: string;
    meaning: string;
    hindi: string;
    dictionaryId?: string;
  };
}

const MINIMAL_PAIRS: MinimalPairItem[] = [
  {
    id: 'kueche-kuchen',
    contrastTitle: 'ü + ich-Laut (/ç/)  vs.  u + ach-Laut (/x/)',
    whyItMatters:
      'One umlaut shifts BOTH the vowel (rounded front ü vs. back u) and the ch (soft front ह्य vs. throat ख़).',
    left: {
      word: 'Küche',
      devanagari: 'क्यू-श्ये',
      ipa: '/ˈkʏçə/',
      meaning: 'kitchen',
      hindi: 'रसोईघर',
      dictionaryId: 'kueche',
    },
    right: {
      word: 'Kuchen',
      devanagari: 'कू-ख़न',
      ipa: '/ˈkuːxən/',
      meaning: 'cake',
      hindi: 'केक',
      dictionaryId: 'kuchen',
    },
  },
  {
    id: 'kirche-kirsche',
    contrastTitle: 'Soft ich-Laut (/ç/)  vs.  Heavy sch (/ʃ/)',
    whyItMatters:
      'Keep your lips flat for ch in Kirche (church). Rounding your lips turns it into Kirsche (cherry).',
    left: {
      word: 'Kirche',
      devanagari: 'किर-ह्ये',
      ipa: '/ˈkɪʁçə/',
      meaning: 'church',
      hindi: 'चर्च',
      dictionaryId: 'kirche',
    },
    right: {
      word: 'Kirsche',
      devanagari: 'किर-शे',
      ipa: '/ˈkɪʁʃə/',
      meaning: 'cherry',
      hindi: 'चेरी',
    },
  },
  {
    id: 'schoen-schon',
    contrastTitle: 'Rounded ö (/øː/)  vs.  Plain o (/oː/)',
    whyItMatters:
      'Both use rounded ओ lips, but schön pushes the tongue forward as if saying ए (एक).',
    left: {
      word: 'schön',
      devanagari: 'श्योन',
      ipa: '/ʃøːn/',
      meaning: 'beautiful',
      hindi: 'सुंदर',
    },
    right: {
      word: 'schon',
      devanagari: 'शोन',
      ipa: '/ʃoːn/',
      meaning: 'already',
      hindi: 'पहले ही',
    },
  },
  {
    id: 'vier-wir',
    contrastTitle: 'German v (/f/ → फ़)  vs.  German w (/v/ → व)',
    whyItMatters:
      'In native German words, v sounds like फ़ (f) and w sounds like व (v). Never swap them like English!',
    left: {
      word: 'vier',
      devanagari: 'फ़ीअ',
      ipa: '/fiːɐ̯/',
      meaning: 'four (4)',
      hindi: 'चार',
    },
    right: {
      word: 'wir',
      devanagari: 'वीअ',
      ipa: '/viːɐ̯/',
      meaning: 'we',
      hindi: 'हम',
    },
  },
  {
    id: 'zug-suchen',
    contrastTitle: 'German z (/ts/ → त्स)  vs.  German s + vowel (/z/ → ज़)',
    whyItMatters:
      'Z is always a crisp त्स snap, while initial s before a vowel buzzes like Hindi ज़ (ज़मीन).',
    left: {
      word: 'Zug',
      devanagari: 'त्सूग',
      ipa: '/tsuːk/',
      meaning: 'train',
      hindi: 'ट्रेन',
    },
    right: {
      word: 'suchen',
      devanagari: 'ज़ू-ख़न',
      ipa: '/ˈzuːxən/',
      meaning: 'to search',
      hindi: 'खोजना',
    },
  },
  {
    id: 'staat-stadt',
    contrastTitle: 'Long vowel aa (/aː/)  vs.  Short vowel a (/a/)',
    whyItMatters:
      'Doubled vowels stretch the sound long (like आ in आम), while consonant clusters (dt) keep the vowel crisp and short.',
    left: {
      word: 'Staat',
      devanagari: 'श्टाट (लंबा आ)',
      ipa: '/ʃtaːt/',
      meaning: 'state / country',
      hindi: 'राज्य / देश',
    },
    right: {
      word: 'Stadt',
      devanagari: 'श्टट (छोटा अ/आ)',
      ipa: '/ʃtat/',
      meaning: 'city',
      hindi: 'शहर',
    },
  },
];

interface MinimalPairsViewProps {
  onOpenWord: (wordId: string) => void;
  onLookupWord: (word: string) => void;
}

export function MinimalPairsView({ onOpenWord, onLookupWord }: MinimalPairsViewProps) {
  const [playingWord, setPlayingWord] = useState<string | null>(null);
  const [audioNotice, setAudioNotice] = useState<string | null>(null);

  const handlePlay = async (word: string, key: string, ipa?: string) => {
    setPlayingWord(key);
    setAudioNotice(null);
    const result = await playGermanAudio(word, { slow: true, ipa });
    setPlayingWord((curr) => (curr === key ? null : curr));
    if (result.error) {
      setAudioNotice(result.error);
    }
  };

  return (
    <section aria-labelledby="minimal-pairs-title" className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <p className="text-xs font-medium text-blue-700">Ear Training</p>
        <h1
          id="minimal-pairs-title"
          className="mt-1 font-display text-2xl sm:text-3xl font-semibold text-slate-900"
        >
          Minimal Pairs for Hindi Speakers
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-600 max-w-[70ch]">
          Listen to two nearly identical German words back-to-back to train your ear on umlauts,
          ich- vs. ach-sounds, and the German v/w and s/z rules.
        </p>
        {audioNotice && (
          <p role="status" className="mt-3 text-xs text-amber-800">
            {audioNotice}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {MINIMAL_PAIRS.map((pair) => (
          <article
            key={pair.id}
            className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between"
          >
            <div>
              <h2 className="text-sm font-semibold text-slate-900 font-mono">
                {pair.contrastTitle}
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 font-devanagari">
                {pair.whyItMatters}
              </p>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[pair.left, pair.right].map((side, sideIdx) => {
                  const key = `${pair.id}-${sideIdx}`;
                  return (
                    <div
                      key={side.word}
                      className="bg-slate-50 border border-slate-200/90 rounded-lg p-4 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-display text-xl font-semibold text-slate-900">
                            {side.word}
                          </span>
                          <span className="font-mono text-xs text-slate-500">{side.ipa}</span>
                        </div>
                        <div className="mt-1 font-devanagari text-base font-semibold text-blue-800">
                          {side.devanagari}
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          {side.meaning} · <span className="font-devanagari">{side.hindi}</span>
                        </div>
                      </div>

                      <div className="mt-3.5 pt-3 border-t border-slate-200/70 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          disabled={playingWord !== null}
                          onClick={() => handlePlay(side.word, key, side.ipa)}
                          aria-label={`Listen to ${side.word}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-700"
                        >
                          {playingWord === key ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                          <span>Listen</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            side.dictionaryId
                              ? onOpenWord(side.dictionaryId)
                              : onLookupWord(side.word)
                          }
                          aria-label={`Open full breakdown for ${side.word}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-700 rounded-sm"
                        >
                          <span>Breakdown</span>
                          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
