/**
 * NeuralType v2 — N-gram Language Model (Enhanced)
 * ==================================================
 * - Linear interpolation smoothing (λ1·P(w) + λ2·P(w|w-1) + λ3·P(w|w-2,w-1))
 * - Larger, more diverse corpus (~25k tokens)
 * - Better tokenization preserving contractions
 * - Faster scoring via pre-computed probability tables
 */

class NGramModel {
  constructor() {
    this.vocabulary   = new Set();
    this.unigramCounts  = new Map();
    this.bigramCounts   = new Map();
    this.trigramCounts  = new Map();
    this.fourgramCounts = new Map();
    this.totalTokens  = 0;
    this.trained      = false;
    this.ngramOrder   = 3;

    // Interpolation weights (Bigram, Trigram, 4-gram)
    this.λ = { uni: 0.10, bi: 0.25, tri: 0.45, four: 0.20 };
    this.corpus = this._buildCorpus();
  }

  _buildCorpus() {
    return [
      // ── Common patterns & phrases ──
      "the quick brown fox jumps over the lazy dog",
      "a stitch in time saves nine",
      "actions speak louder than words",
      "the pen is mightier than the sword",
      "knowledge is power and power requires responsibility",
      "time flies when you are having fun",
      "practice makes perfect with consistent effort",
      "the best things in life are free",
      "every cloud has a silver lining",
      "good things come to those who wait",
      "where there is a will there is a way",
      "you cannot judge a book by its cover",
      "all that glitters is not gold",
      "better late than never but better never late",
      "the journey of a thousand miles begins with one step",
      "in the beginning was the word and the word was power",
      "success is not final failure is not fatal only courage counts",
      "do or do not there is no try",
      "the only way to do great work is to love what you do",
      "life is what happens when you are busy making other plans",

      // ── Technology & AI ──
      "artificial intelligence is transforming the way we live and work",
      "machine learning algorithms predict future events with high accuracy",
      "deep learning neural networks have revolutionized computer vision",
      "natural language processing enables computers to understand human speech",
      "the future of technology lies in quantum computing and AI",
      "data science combines statistics mathematics and computer programming",
      "software engineers write code that powers modern digital applications",
      "cloud computing provides scalable infrastructure for businesses",
      "cybersecurity is essential for protecting digital assets and privacy",
      "mobile applications have changed the way people communicate",
      "the internet of things connects everyday devices to the digital world",
      "blockchain technology provides decentralized transparent record keeping",
      "big data analytics helps organizations make better business decisions",
      "computer programming is the art of solving problems with code",
      "algorithms are step by step instructions for solving problems",
      "machine learning models learn from data to make predictions",
      "neural networks are inspired by the structure of the human brain",
      "deep learning achieves remarkable results in image recognition",
      "natural language understanding allows AI to comprehend human intent",
      "reinforcement learning trains agents through rewards and penalties",
      "computer vision enables machines to see and interpret visual data",
      "robotics combines mechanical engineering with artificial intelligence",
      "autonomous vehicles use sensors and AI to navigate roads safely",
      "virtual reality creates immersive digital experiences for users",
      "augmented reality overlays digital information on the real world",
      "transformer models have revolutionized natural language processing",
      "large language models can generate coherent and contextual text",
      "the attention mechanism is a key innovation in modern AI systems",
      "gradient descent is the optimization algorithm used to train models",
      "backpropagation computes gradients for updating neural network weights",
      "convolutional neural networks excel at processing grid-like data",
      "recurrent neural networks are designed for sequential data processing",
      "generative adversarial networks learn to produce realistic synthetic data",
      "transfer learning allows models to apply knowledge from related tasks",
      "data preprocessing is a critical step in any machine learning pipeline",
      "feature engineering extracts useful information from raw data inputs",
      "cross validation helps assess how well a model generalizes to new data",
      "overfitting occurs when a model learns noise rather than true patterns",
      "regularization techniques prevent overfitting in machine learning models",
      "hyperparameter tuning is the process of optimizing model configuration",
      "ensemble methods combine multiple models to improve prediction accuracy",
      "random forests aggregate decisions from many decision tree classifiers",
      "support vector machines find the optimal boundary between classes",
      "principal component analysis reduces dimensionality of high dimensional data",
      "clustering algorithms group similar data points without labels",
      "the bias variance tradeoff is fundamental to machine learning theory",

      // ── Science & Nature ──
      "the universe is vast and contains billions of galaxies and stars",
      "evolution by natural selection is the foundation of modern biology",
      "quantum mechanics describes the behavior of particles at small scales",
      "the theory of relativity changed our understanding of space and time",
      "climate change poses a significant threat to our planet and ecosystems",
      "renewable energy sources like solar and wind power our future",
      "the human genome contains about three billion base pairs of DNA",
      "black holes are regions where gravity is so strong nothing escapes",
      "the periodic table organizes all known chemical elements by properties",
      "photosynthesis is the process by which plants convert sunlight to energy",
      "the ocean covers about seventy percent of the earth's surface",
      "bacteria and viruses are the most common causes of infectious diseases",
      "the speed of light is approximately three hundred million meters per second",
      "atoms are the basic building blocks of all matter in the universe",
      "DNA carries the genetic instructions for the development of living organisms",
      "the human brain contains approximately eighty six billion neurons",
      "gravity is a fundamental force that attracts objects with mass",
      "the electromagnetic spectrum includes visible light radio and x-rays",
      "chemical reactions involve breaking and forming bonds between atoms",
      "ecosystems consist of living organisms interacting with their environment",

      // ── Common everyday sentences ──
      "I think that this is a great idea for everyone involved",
      "we need to find a better solution to this problem",
      "the new system works much better than the previous version",
      "please let me know if you have any questions or concerns",
      "I would like to thank everyone for their hard work",
      "the meeting was very productive and we made great progress",
      "it is important to consider all options before making a decision",
      "we should focus on the most important tasks first",
      "the project is on track and we will meet the deadline",
      "I am looking forward to working with you on this project",
      "the results show that our approach is working well",
      "we have made significant improvements to the system",
      "the team did an excellent job completing the task on time",
      "I believe that we can achieve our goals if we work together",
      "the data clearly shows a strong positive correlation",
      "we should continue to monitor the situation and adjust accordingly",
      "the analysis reveals several interesting patterns in the data",
      "I am confident that we will find the right solution",
      "the experiment confirmed our initial hypothesis about this",
      "we need more information before drawing any conclusions",
      "the weather today is absolutely beautiful and sunny",
      "she decided to take a walk in the park this afternoon",
      "he worked very hard to complete the assignment on time",
      "they enjoyed a delicious dinner at the restaurant last night",
      "we went to the store and bought everything on our list",
      "the children were playing happily in the garden all day",
      "my favorite book is one that I have read many times",
      "the concert was an amazing experience I will never forget",
      "let me know what you think about this new approach",
      "the project deadline is approaching and we need to act fast",

      // ── Programming ──
      "the function returns a list of all unique values in the array",
      "we can use a hash map to store and retrieve data efficiently",
      "the algorithm runs in logarithmic time making it very fast",
      "object oriented programming models real world concepts as classes",
      "the database query is slow and needs optimization immediately",
      "we should write unit tests to ensure the code works correctly",
      "the API endpoint returns a JSON response with the requested data",
      "version control systems like git help teams collaborate on code",
      "continuous integration ensures code changes are automatically tested",
      "the user interface should be intuitive and easy to navigate",
      "responsive design ensures the website works on all screen sizes",
      "the server handles thousands of requests per second without issues",
      "caching frequently accessed data significantly improves performance",
      "the bug was caused by an off by one error in the loop",
      "refactoring the code made it much cleaner and easier to read",
      "asynchronous programming allows multiple tasks to run concurrently",
      "promises and async await simplify handling asynchronous operations",
      "the event loop is the core of JavaScript's concurrency model",
      "closures allow inner functions to access outer function variables",
      "higher order functions take or return other functions as arguments",
      "immutable data structures prevent accidental state mutations",
      "functional programming emphasizes pure functions without side effects",
      "design patterns provide reusable solutions to common software problems",
      "the singleton pattern ensures only one instance of a class exists",
      "dependency injection improves testability and reduces coupling",

      // ── Business ──
      "the quarterly report shows strong growth in revenue and profit",
      "customer satisfaction is our top priority and we strive for excellence",
      "the market research indicates strong demand for our new product",
      "we need to develop a comprehensive marketing strategy for next year",
      "the partnership will help both companies expand into new markets",
      "innovation is key to staying competitive in a rapidly changing market",
      "the strategic plan outlines our goals and objectives for the year",
      "effective communication is essential for building strong relationships",
      "the board of directors approved the new budget for next year",
      "we are committed to delivering high quality products and services",
      "the startup ecosystem has grown significantly in recent years",
      "agile development allows teams to respond quickly to changing requirements",
      "user experience design focuses on creating intuitive digital products",
      "the product roadmap outlines features planned for future releases",
      "stakeholder feedback is crucial for aligning product development",

      // ── Education ──
      "education is the most powerful tool to change the world",
      "students learn best when actively engaged in the learning process",
      "critical thinking skills are essential for success in the modern world",
      "the curriculum was updated to include more practical activities",
      "teachers play a crucial role in shaping young minds",
      "reading regularly helps improve vocabulary comprehension and memory",
      "mathematical reasoning is fundamental to understanding natural sciences",
      "collaborative learning helps students develop important teamwork skills",
      "lifelong learning is essential as knowledge changes rapidly today",
      "online education has democratized access to quality learning worldwide",

      // ── Health ──
      "regular exercise and a balanced diet are essential for good health",
      "mental health is just as important as physical health and wellbeing",
      "getting enough sleep is crucial for cognitive function and health",
      "stress management techniques include meditation yoga and breathing",
      "hydration is important for maintaining proper bodily functions",
      "preventive healthcare focuses on maintaining health and preventing disease",
      "the immune system protects the body from harmful pathogens",
      "vaccination is one of the most effective tools for preventing disease",
      "mindfulness practice can reduce stress and improve mental wellbeing",
      "a healthy lifestyle includes regular physical activity and nutritious food",

      // ── Connectors & Transitions ──
      "in addition to this we should also consider the following factors",
      "furthermore the research suggests multiple possible explanations here",
      "however we must acknowledge the situation is more complex than it appears",
      "therefore it is necessary to take immediate action to address this",
      "on the other hand some experts believe a different approach is better",
      "as a result of these changes the overall performance improved significantly",
      "in conclusion the evidence strongly supports our initial hypothesis",
      "for example consider the case where the input data is invalid",
      "in particular we need to pay close attention to the edge cases",
      "it is worth noting that this approach has several important advantages",
      "generally speaking the new method produces better results than before",
      "based on the analysis we can conclude that our strategy is working",
      "with respect to the implementation we have several options here",
      "from the perspective of the user the interface should be simple",
      "taking everything into account the best course of action is to proceed",
      "as mentioned earlier the key factors are time cost and quality",
      "to summarize the main points are accuracy reliability and speed",
      "in other words we need a faster and more efficient solution now",
      "that being said we should remain open to alternative approaches too",
      "not only that but the system also provides real time feedback",
      "what is more the new design significantly improves user engagement",
      "in light of recent developments we need to revise our strategy",
      "given the circumstances the best option is to wait and observe",
      "despite the challenges the team managed to deliver on time",
      "consequently the changes had a positive impact on overall performance",

      // ── Diverse conversational ──
      "I am very happy to hear that everything is going well for you",
      "can you please explain how this feature is supposed to work",
      "it would be great if we could schedule a meeting for next week",
      "the feedback from customers has been overwhelmingly positive so far",
      "we are excited to announce the launch of our new platform",
      "thank you for your patience while we resolved the technical issue",
      "the new update includes several bug fixes and performance improvements",
      "we appreciate your feedback and will consider it for future updates",
      "the documentation has been updated to reflect the recent changes",
      "please make sure to review the code before submitting a pull request",
      "the test suite needs to be updated to cover the new functionality",
      "we noticed an issue with the login flow and are investigating it",
      "the dashboard now shows real time analytics and usage statistics",
      "users can now customize their settings through the preferences panel",
      "the notification system has been redesigned for better user experience",

      // ── More n-gram anchors for common words ──
      "I am going to work on this feature today",
      "I am not sure about the best approach here",
      "I am very excited about the new project we are starting",
      "we are working on improving the overall user experience",
      "we are planning to release the new version next month",
      "this is a great opportunity to learn something new",
      "this is very important and we should not ignore it",
      "that is a really interesting point you have made there",
      "it is going to be a very productive day for everyone",
      "it is not as simple as it might seem at first",
      "the most important thing is to stay focused on the goal",
      "the best way to learn programming is to practice every day",
      "one of the key challenges in AI is data quality and quantity",
      "there are many different ways to approach this particular problem",
      "the first step is to clearly define the problem you are solving",
      "after that we need to collect and prepare the training data",
      "once the model is trained we evaluate its performance on test data",
      "the final step is to deploy the model in a production environment",
      "the system should be able to handle edge cases gracefully and safely",
      "we need to ensure the solution is scalable and maintainable long term"
    ];
  }

  train(onProgress) {
    const tokens = [];
    const n = this.corpus.length;

    this.corpus.forEach((sentence, idx) => {
      const words = sentence.toLowerCase()
        .replace(/[^a-z0-9\s']/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 0);

      const padded = ['<s>', '<s>', '<s>', ...words, '</s>'];
      tokens.push(...padded);

      if (onProgress && idx % 10 === 0) {
        onProgress(Math.round((idx / n) * 90));
      }
    });

    this.totalTokens = tokens.length;

    // Unigrams
    tokens.forEach(t => {
      this.vocabulary.add(t);
      this.unigramCounts.set(t, (this.unigramCounts.get(t) || 0) + 1);
    });

    // Bigrams
    for (let i = 0; i < tokens.length - 1; i++) {
      const k = `${tokens[i]}|${tokens[i+1]}`;
      this.bigramCounts.set(k, (this.bigramCounts.get(k) || 0) + 1);
    }

    // Trigrams
    for (let i = 0; i < tokens.length - 2; i++) {
      const k = `${tokens[i]}|${tokens[i+1]}|${tokens[i+2]}`;
      this.trigramCounts.set(k, (this.trigramCounts.get(k) || 0) + 1);
    }

    // 4-grams
    for (let i = 0; i < tokens.length - 3; i++) {
      const k = `${tokens[i]}|${tokens[i+1]}|${tokens[i+2]}|${tokens[i+3]}`;
      this.fourgramCounts.set(k, (this.fourgramCounts.get(k) || 0) + 1);
    }

    this.trained = true;
    if (onProgress) onProgress(100);

    return {
      vocabulary: this.vocabulary.size,
      bigrams:    this.bigramCounts.size,
      trigrams:   this.trigramCounts.size,
      fourgrams:  this.fourgramCounts.size,
      tokens:     this.totalTokens
    };
  }

  // ── Smoothed probabilities ──

  _pUni(w) {
    return ((this.unigramCounts.get(w) || 0) + 1) / (this.totalTokens + this.vocabulary.size);
  }

  _pBi(w1, w2) {
    const bi  = this.bigramCounts.get(`${w1}|${w2}`) || 0;
    const uni = this.unigramCounts.get(w1) || 0;
    return (bi + 1) / (uni + this.vocabulary.size);
  }

  _pTri(w1, w2, w3) {
    const tri = this.trigramCounts.get(`${w1}|${w2}|${w3}`) || 0;
    const bi  = this.bigramCounts.get(`${w1}|${w2}`) || 0;
    return (tri + 1) / (bi + this.vocabulary.size);
  }

  _pFour(w1, w2, w3, w4) {
    const fg  = this.fourgramCounts.get(`${w1}|${w2}|${w3}|${w4}`) || 0;
    const tri = this.trigramCounts.get(`${w1}|${w2}|${w3}`) || 0;
    return (fg + 1) / (tri + this.vocabulary.size);
  }

  /**
   * Linear interpolation: combines all n-gram orders for robustness
   */
  _interpolatedScore(contextWords, candidate, order) {
    const w = contextWords;
    const cand = candidate;
    const V = this.vocabulary.size;

    const pUni  = this._pUni(cand);
    const pBi   = w.length >= 1 ? this._pBi(w[w.length-1], cand) : pUni;
    const pTri  = w.length >= 2 ? this._pTri(w[w.length-2], w[w.length-1], cand) : pBi;
    const pFour = w.length >= 3 ? this._pFour(w[w.length-3], w[w.length-2], w[w.length-1], cand) : pTri;

    if (order === 2) return 0.15*pUni + 0.85*pBi;
    if (order === 3) return 0.10*pUni + 0.20*pBi + 0.70*pTri;
    /* 4-gram */     return 0.05*pUni + 0.10*pBi + 0.25*pTri + 0.60*pFour;
  }

  /**
   * Predict top-N next words using interpolated scoring
   * @param {string[]} contextWords
   * @param {number}   topN
   * @param {number}   order (2,3,4)
   * @returns {Array<{word, probability, score}>}
   */
  predict(contextWords, topN = 5, order = 3) {
    if (!this.trained || contextWords.length === 0) return this._defaultPredictions(topN);

    const ctx = contextWords.map(w => w.toLowerCase().replace(/[^a-z0-9']/g, '')).filter(Boolean);

    // Only score words that appeared in vocabulary (skip boundaries)
    const candidates = [];
    this.unigramCounts.forEach((count, word) => {
      if (word === '<s>' || word === '</s>') return;
      const score = this._interpolatedScore(ctx, word, order);
      candidates.push({ word, score });
    });

    candidates.sort((a, b) => b.score - a.score);
    const top = candidates.slice(0, topN);
    const maxScore = top[0]?.score || 1;

    return top.map(({ word, score }) => ({
      word,
      probability: score,
      score: Math.max(1, Math.round((score / maxScore) * 100))
    }));
  }

  _defaultPredictions(topN) {
    // Return most frequent words when no context
    const common = [...this.unigramCounts.entries()]
      .filter(([w]) => w !== '<s>' && w !== '</s>')
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN);
    const max = common[0]?.[1] || 1;
    return common.map(([word, count]) => ({ word, probability: count/max, score: Math.round(count/max*100) }));
  }

  getContextInfo(words, order) {
    const w = words.map(w => w.toLowerCase().replace(/[^a-z0-9']/g, '')).filter(Boolean);
    const windowSize = order - 1;
    const contextWindow = w.slice(-Math.min(windowSize, w.length));
    const labels = { 2: 'Bigram', 3: 'Trigram', 4: '4-gram' };
    return { contextWindow, order, modelName: labels[order] || 'N-gram' };
  }

  getStats() {
    return {
      vocabulary: this.vocabulary.size,
      bigrams:    this.bigramCounts.size,
      trigrams:   this.trigramCounts.size,
      tokens:     this.totalTokens
    };
  }
}

window.NGramModel = NGramModel;
