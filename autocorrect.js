/**
 * NeuralType v2 — Autocorrect Engine (Enhanced)
 * ================================================
 * - 200+ common typo mappings
 * - Damerau-Levenshtein with proper transposition
 * - Capitalization-aware corrections
 * - Apostrophe contraction handling
 * - Confidence scoring (prefers shorter edit distance + higher frequency)
 * - Partial word suggestions (prefix matching)
 */

class AutocorrectEngine {
  constructor(vocabulary, unigramCounts) {
    this.vocabulary    = vocabulary;
    this.unigramCounts = unigramCounts;

    this.typoDict = new Map([
      // Classic transpositions
      ['teh',   'the'], ['hte',  'the'], ['adn',  'and'], ['nad',   'and'],
      ['fo',    'of'],  ['ahve', 'have'],['taht', 'that'],['waht',  'what'],
      ['whihc', 'which'],['htat','that'],['thn',  'then'],['thsi',  'this'],
      ['ti',    'it'],  ['si',   'is'],  ['ot',   'to'],  ['cna',   'can'],
      ['yuo',   'you'], ['paly', 'play'],['siad', 'said'],['frist', 'first'],
      ['levle', 'level'],['htis','this'],['thier','their'],['freom','from'],
      ['becuase','because'],['becuse','because'],['becase','because'],
      ['wich',  'which'],['wiht', 'with'],['tath', 'that'],['wnat',  'want'],
      ['dont',  "don't"],['wont', "won't"],['isnt', "isn't"],['cant',  "can't"],
      ['doesnt',"doesn't"],['wasnt',"wasn't"],['werent',"weren't"],
      ['havent',"haven't"],['hadnt',"hadn't"],['shouldnt',"shouldn't"],
      ['couldnt',"couldn't"],['wouldnt',"wouldn't"],['didnt', "didn't"],
      ['youre', "you're"],['theyre',"they're"],['im',  "I'm"],
      ['ive',   "I've"], ['id',   "I'd"], ['ill',  "I'll"],['theres',"there's"],
      ['whos',  "who's"],['whats',"what's"],['hows',"how's"],

      // Spelling errors
      ['recieve',    'receive'],  ['beleive',   'believe'],   ['definately',  'definitely'],
      ['occured',    'occurred'], ['occurence', 'occurrence'],['begining',    'beginning'],
      ['seperate',   'separate'], ['privelege', 'privilege'], ['accomodate',  'accommodate'],
      ['neccessary', 'necessary'],['occassion', 'occasion'],  ['existance',   'existence'],
      ['maintainance','maintenance'],['persevere','persevere'],['conscientious','conscientious'],
      ['embarrass',  'embarrass'],['exaggerate','exaggerate'],['relevant',   'relevant'],
      ['wierd',      'weird'],    ['freind',    'friend'],    ['peice',       'piece'],
      ['cheif',      'chief'],    ['reccomend', 'recommend'], ['tommorrow',   'tomorrow'],
      ['yestarday',  'yesterday'],['becuase',   'because'],   ['intresting',  'interesting'],
      ['sucessful',  'successful'],['succesful','successful'],['independant', 'independent'],
      ['diferent',   'different'],['diffrent',  'different'], ['experiance',  'experience'],
      ['experince',  'experience'],['knowlege', 'knowledge'], ['writting',    'writing'],
      ['writen',     'written'],  ['writeing',  'writing'],   ['becmoe',      'become'],
      ['therfore',   'therefore'],['therefoe',  'therefore'], ['alot',        'a lot'],
      ['alright',    'all right'],['alot',      'a lot'],     ['aswell',      'as well'],
      ['abit',       'a bit'],    ['infact',    'in fact'],   ['inorder',     'in order'],

      // Tech/programming typos
      ['prgramming',   'programming'],['programing',  'programming'],
      ['langauge',     'language'],   ['langugage',   'language'],
      ['algorithmn',   'algorithm'],  ['algorithmn',  'algorithm'],
      ['machiene',     'machine'],    ['learing',     'learning'],
      ['intellgence',  'intelligence'],['artifical',  'artificial'],
      ['sience',       'science'],    ['sciense',     'science'],
      ['fnuction',     'function'],   ['fucntion',    'function'],
      ['funciton',     'function'],   ['functon',     'function'],
      ['retrun',       'return'],     ['reutrn',      'return'],
      ['pritn',        'print'],      ['prnit',       'print'],
      ['cosnt',        'const'],      ['conts',       'const'],
      ['pubilc',       'public'],     ['calss',       'class'],
      ['methdo',       'method'],     ['objcet',      'object'],
      ['arrat',        'array'],      ['strign',      'string'],
      ['booelan',      'boolean'],    ['boolaen',     'boolean'],
      ['varibale',     'variable'],   ['varialbe',    'variable'],
      ['databse',      'database'],   ['dataabse',    'database'],
      ['qurey',        'query'],      ['reqeust',     'request'],
      ['respone',      'response'],   ['resonse',     'response'],
      ['authenticationn','authentication'],['authenication','authentication'],
      ['paramter',     'parameter'],  ['parametre',   'parameter'],
      ['arguement',    'argument'],   ['arguemnt',    'argument'],
      ['controll',     'control'],    ['controler',   'controller'],
      ['implemntation','implementation'],['implmentation','implementation'],

      // Common word confusions (simplified)
      ['veyr',   'very'],    ['vrey',   'very'],   ['woudl', 'would'],
      ['coudl',  'could'],   ['shoudl', 'should'],  ['form',  'from'],  // context-dependent but helps
      ['tiem',   'time'],    ['tehy',   'they'],   ['cahnge','change'],
      ['probelm','problem'],  ['porblem','problem'], ['porject','project'],
      ['proejct','project'],  ['sytem',  'system'],  ['systme', 'system'],
      ['servcies','services'],['servies','services'],['busines','business'],
      ['busienss','business'],['adress', 'address'], ['addres', 'address'],
      ['moeny',  'money'],   ['monery', 'money'],   ['numbr',  'number'],
      ['nubmer', 'number'],  ['lettter','letter'],   ['sentance','sentence'],
      ['sentense','sentence'],['paragrph','paragraph'],['grammer','grammar'],
    ]);
  }

  /**
   * Damerau-Levenshtein distance (full, with transpositions)
   */
  editDistance(a, b) {
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp = Array.from({length: m+1}, (_, i) => Array.from({length: n+1}, (_, j) => i === 0 ? j : j === 0 ? i : 0));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i-1] === b[j-1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost);
        if (i > 1 && j > 1 && a[i-1] === b[j-2] && a[i-2] === b[j-1]) {
          dp[i][j] = Math.min(dp[i][j], dp[i-2][j-2] + cost);
        }
      }
    }
    return dp[m][n];
  }

  /**
   * Generate edit-distance-1 candidates
   */
  _edits1(word) {
    const alpha = 'abcdefghijklmnopqrstuvwxyz';
    const splits = Array.from({length: word.length+1}, (_, i) => [word.slice(0,i), word.slice(i)]);
    const deletes    = splits.filter(([,r])=>r.length>0).map(([l,r])=>l+r.slice(1));
    const transposes = splits.filter(([,r])=>r.length>1).map(([l,r])=>l+r[1]+r[0]+r.slice(2));
    const replaces   = splits.filter(([,r])=>r.length>0).flatMap(([l,r])=>[...alpha].map(c=>l+c+r.slice(1)));
    const inserts    = splits.flatMap(([l,r])=>[...alpha].map(c=>l+c+r));
    return new Set([...deletes,...transposes,...replaces,...inserts]);
  }

  /**
   * Get all edit-1 candidates that exist in vocabulary
   */
  _knownEdit1(word) {
    const res = [];
    this._edits1(word).forEach(c => {
      if (this.unigramCounts.has(c)) {
        res.push({ word: c, freq: this.unigramCounts.get(c), dist: 1 });
      }
    });
    return res.sort((a,b)=> b.freq - a.freq);
  }

  /**
   * Get edit-2 candidates (only for longer words to save time)
   */
  _knownEdit2(word) {
    const seen = new Set();
    const res  = [];
    this._edits1(word).forEach(e1 => {
      this._edits1(e1).forEach(e2 => {
        if (seen.has(e2)) return;
        seen.add(e2);
        if (this.unigramCounts.has(e2) && e2 !== word) {
          res.push({ word: e2, freq: this.unigramCounts.get(e2), dist: 2 });
        }
      });
    });
    return res.sort((a,b)=> b.freq - a.freq);
  }

  /**
   * Prefix-match for partial word suggestions
   * Returns vocabulary words starting with the given prefix, sorted by frequency
   */
  prefixMatch(prefix, limit = 5) {
    if (!prefix || prefix.length < 2) return [];
    const lower = prefix.toLowerCase();
    const matches = [];
    this.unigramCounts.forEach((freq, word) => {
      if (word.startsWith(lower) && word !== lower && word !== '<s>' && word !== '</s>') {
        matches.push({ word, freq });
      }
    });
    return matches.sort((a,b) => b.freq - a.freq).slice(0, limit).map(m => m.word);
  }

  /**
   * Main correction function — capitalization-aware
   * @param {string} rawWord - as typed (may have capitals)
   * @returns {{ corrected, wasCorrection, original, method }}
   */
  correct(rawWord) {
    if (!rawWord || rawWord.length < 2) {
      return { corrected: rawWord, wasCorrection: false, original: rawWord };
    }

    // Detect casing
    const isAllCaps   = rawWord === rawWord.toUpperCase() && rawWord.length > 1;
    const isCapFirst  = rawWord[0] === rawWord[0].toUpperCase() && rawWord.slice(1) === rawWord.slice(1).toLowerCase();

    const lower = rawWord.toLowerCase().replace(/[^a-z']/g, '');
    if (!lower) return { corrected: rawWord, wasCorrection: false, original: rawWord };

    // ① Typo dictionary (fastest, highest confidence)
    if (this.typoDict.has(lower)) {
      let corrected = this.typoDict.get(lower);
      corrected = this._matchCase(corrected, isAllCaps, isCapFirst);
      return { corrected, wasCorrection: corrected.toLowerCase() !== lower, original: rawWord, method: 'dictionary', confidence: 'high' };
    }

    // ② Already in vocabulary
    if (this.unigramCounts.has(lower)) {
      return { corrected: rawWord, wasCorrection: false, original: rawWord };
    }

    // ③ Edit distance 1
    const e1 = this._knownEdit1(lower);
    if (e1.length > 0) {
      const corrected = this._matchCase(e1[0].word, isAllCaps, isCapFirst);
      return { corrected, wasCorrection: true, original: rawWord, method: 'edit-1', confidence: 'medium', candidates: e1.slice(0,3) };
    }

    // ④ Edit distance 2 (only for words length > 4 to avoid false positives)
    if (lower.length > 4) {
      const e2 = this._knownEdit2(lower);
      if (e2.length > 0) {
        const corrected = this._matchCase(e2[0].word, isAllCaps, isCapFirst);
        return { corrected, wasCorrection: true, original: rawWord, method: 'edit-2', confidence: 'low', candidates: e2.slice(0,3) };
      }
    }

    // ⑤ No correction found
    return { corrected: rawWord, wasCorrection: false, original: rawWord };
  }

  /**
   * Restore capitalization pattern to a corrected word
   */
  _matchCase(word, isAllCaps, isCapFirst) {
    if (isAllCaps) return word.toUpperCase();
    if (isCapFirst) return word[0].toUpperCase() + word.slice(1);
    return word;
  }

  /**
   * Quick check: might this word need correction?
   */
  mightBeTypo(word) {
    const lower = word.toLowerCase().replace(/[^a-z']/g, '');
    if (lower.length < 2) return false;
    return this.typoDict.has(lower) || !this.unigramCounts.has(lower);
  }
}

window.AutocorrectEngine = AutocorrectEngine;
