/* Word Puzzle V0.2.5 发音定版
 * 独立组词游戏：只复用 DICTIONARY 数据，不复用单词麻将的出牌/胡牌/电脑逻辑。
 */

const LEVELS = ["basic", "intermediate", "advanced", "academic", "challenge"];

const LEVEL_CONFIG = {
  basic: {
    label: "基础",
    letterCount: 8,
    scoreValue: 1,
    hintMode: "cn",
    minAnchorLength: 4,
    minTargets: 2,
    maxTargets: 3,
    maxShortWords: 2
  },
  intermediate: {
    label: "进阶",
    letterCount: 10,
    scoreValue: 2,
    hintMode: "cn",
    minAnchorLength: 4,
    minTargets: 2,
    maxTargets: 3,
    maxShortWords: 2
  },
  advanced: {
    label: "高阶",
    letterCount: 12,
    scoreValue: 3,
    hintMode: "en",
    minAnchorLength: 5,
    minTargets: 2,
    maxTargets: 3,
    maxShortWords: 1
  },
  academic: {
    label: "学术",
    letterCount: 14,
    scoreValue: 4,
    hintMode: "en",
    minAnchorLength: 6,
    minTargets: 2,
    maxTargets: 4,
    maxShortWords: 1
  },
  challenge: {
    label: "挑战",
    letterCount: 16,
    scoreValue: 5,
    hintMode: "en",
    minAnchorLength: 7,
    minTargets: 2,
    maxTargets: 4,
    maxShortWords: 1
  }
};

const LEVEL_VALUE = {
  basic: 1,
  intermediate: 2,
  advanced: 3,
  academic: 4,
  challenge: 5
};

const LEVEL_NAME = {
  basic: "基础",
  intermediate: "进阶",
  advanced: "高阶",
  academic: "学术",
  challenge: "挑战"
};

const COMMON_FUNCTION_WORDS = new Set([
  "THE", "AND", "FOR", "ARE", "BUT", "NOT", "YOU", "ALL", "CAN", "HAD", "HER", "WAS",
  "ONE", "OUR", "OUT", "DAY", "GET", "HAS", "HIM", "HIS", "HOW", "ITS", "MAY", "NEW",
  "NOW", "OLD", "SEE", "TWO", "WHO", "BOY", "DID", "DOES", "PUT", "SAY", "SHE", "TOO",
  "USE", "WAY", "YES", "YET", "THAN", "THEN", "THEM", "THEY", "THIS", "THAT", "WITH",
  "FROM", "HAVE", "WERE", "WILL", "WOULD", "COULD", "SHOULD", "ABOUT", "AFTER", "BEFORE",
  "BECAUSE", "THERE", "WHERE", "WHICH", "WHEN", "WHAT", "VERY", "JUST", "ONLY", "SOME",
  "OTHER", "MORE", "MOST", "MUCH", "MANY", "INTO", "OVER", "UNDER", "UPON", "DOWN"
]);

let gameState = {
  difficulty: "intermediate",
  wordList: [],
  targets: [],
  tiles: [],
  selectedTileId: null,
  draggedTileId: null,
  pointerDrag: null,
  lastDropTargetEl: null,
  suppressClickTileId: null,
  suppressClickUntil: 0,
  speechVoices: [],
  speechReady: false,
  hintLevel: 0,
  totalScore: 0,
  roundBaseScore: 0,
  hintPenalty: 0,
  roundScore: 0,
  poolOrderMode: "random",
  roundCompleted: false,
  roundNo: 0,
  // 本次打开页面期间已经成功组出的词。
  // 不写入 localStorage，刷新/重新打开游戏后自然清空。
  usedSessionWords: new Set()
};

const els = {};

function $(id) {
  return document.getElementById(id);
}

function initDomRefs() {
  Object.assign(els, {
    difficultySelect: $("difficultySelect"),
    nextRoundBtn: $("nextRoundBtn"),
    restartBtn: $("restartBtn"),
    sortBtn: $("sortBtn"),
    clearBtn: $("clearBtn"),
    difficultyText: $("difficultyText"),
    letterCountText: $("letterCountText"),
    roundScoreText: $("roundScoreText"),
    totalScoreText: $("totalScoreText"),
    messageText: $("messageText"),
    hintModeText: $("hintModeText"),
    moreHintBtn: $("moreHintBtn"),
    hintList: $("hintList"),
    targetArea: $("targetArea"),
    letterPool: $("letterPool"),
    poolCountText: $("poolCountText"),
    resultPanel: $("resultPanel")
  });
}

function safeText(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.replace(/\s+/g, " ").trim() || fallback;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeDefinition(definition) {
  const raw = safeText(definition, "No English definition available.")
    .replace(/\\n/g, " || ")
    .replace(/\n/g, " || ");

  const badPatterns = [
    /^see\s+/i,
    /letter of the/i,
    /blood group/i,
    /metric unit/i,
    /United States territory/i,
    /poisonous metallic element/i,
    /Samoa/i,
    /Hebrew alphabet/i
  ];

  const candidates = raw
    .split(/\s*\|\|\s*|(?<=\.)\s+(?=(?:n|v|a|s|r|adv|adj|prep|conj|pron)\.?\s)/i)
    .map((part) => part
      .replace(/^(n|v|a|s|r|adv|adj|prep|conj|pron|interj|obj|dat)\.?\s+/i, "")
      .replace(/\s+/g, " ")
      .trim()
    )
    .filter((part) => part.length >= 18)
    .filter((part) => !badPatterns.some((pattern) => pattern.test(part)));

  const preferred = candidates.find((part) => /^(a|an|the)\s/i.test(part))
    || candidates.find((part) => /^(to|of|relating|connected|having|used)\s/i.test(part))
    || candidates[0]
    || raw.replace(/\s+/g, " ").trim();

  const cleaned = preferred
    .replace(/^(n|v|a|s|r|adv|adj|prep|conj|pron|interj|obj|dat)\.?\s+/i, "")
    .replace(/;\s*--.*$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length <= 135) return cleaned;
  return `${cleaned.slice(0, 132).trim()}...`;
}

function normalizeMeaning(meaning) {
  const raw = safeText(meaning, "暂无中文释义");
  return raw.length <= 58 ? raw : `${raw.slice(0, 58)}...`;
}

function getLevelIndex(level) {
  const index = LEVELS.indexOf(level);
  return index >= 0 ? index : 0;
}

function isDictionaryReady() {
  return typeof DICTIONARY !== "undefined" && DICTIONARY && typeof DICTIONARY === "object";
}

function buildWordList() {
  if (!isDictionaryReady()) {
    setMessage("词库未加载，请确认 dictionary.js 已正确引入。", true);
    return [];
  }

  return Object.entries(DICTIONARY)
    .map(([word, item]) => {
      const normalizedWord = String(word).toUpperCase().trim();
      const level = LEVELS.includes(item.level) ? item.level : "basic";
      return {
        word: normalizedWord,
        length: normalizedWord.length,
        meaning: normalizeMeaning(item.meaning),
        definition: normalizeDefinition(item.definition),
        level,
        levelIndex: getLevelIndex(level),
        rank: Number(item.rank || 999999),
        source: item.source || ""
      };
    })
    .filter((entry) => /^[A-Z]+$/.test(entry.word))
    .filter((entry) => entry.length >= 3 && entry.length <= 9)
    .filter((entry) => !COMMON_FUNCTION_WORDS.has(entry.word))
    .filter((entry) => entry.meaning && entry.definition);
}

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function shuffleArray(array) {
  const cloned = array.slice();
  for (let i = cloned.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

function weightedPick(words, difficulty) {
  const currentIndex = getLevelIndex(difficulty);
  const sorted = shuffleArray(words).sort((a, b) => {
    const aGap = Math.abs(a.levelIndex - currentIndex);
    const bGap = Math.abs(b.levelIndex - currentIndex);
    return aGap - bGap || a.rank - b.rank;
  });
  const windowSize = Math.min(sorted.length, Math.max(18, Math.floor(sorted.length * 0.08)));
  return sorted[randomInt(windowSize)] || sorted[0];
}

function getCandidateWords(difficulty, remainingLength, usedWords) {
  const diffIndex = getLevelIndex(difficulty);
  const maxLevelIndex = Math.min(diffIndex, LEVELS.length - 1);

  return gameState.wordList.filter((entry) => {
    if (usedWords.has(entry.word)) return false;
    if (gameState.usedSessionWords.has(entry.word)) return false;
    if (entry.length > remainingLength) return false;
    if (entry.length < 3) return false;

    // 当前难度允许同级及以下词汇作为填充；挑战局也允许较低级词补齐。
    if (entry.levelIndex > maxLevelIndex) return false;

    // 低难度尽量避开过长词，高难度允许更长词。
    if (difficulty === "basic" && entry.length > 5) return false;
    if (difficulty === "intermediate" && entry.length > 6) return false;

    return true;
  });
}

function getQualityRules(difficulty) {
  return LEVEL_CONFIG[difficulty] || LEVEL_CONFIG.intermediate;
}

function comboQualityScore(combo, difficulty) {
  const rules = getQualityRules(difficulty);
  const diffIndex = getLevelIndex(difficulty);
  const wordCount = combo.length;
  const shortWords = combo.filter((item) => item.length <= 3).length;
  const anchorLength = Math.max(...combo.map((item) => item.length));
  const sameLevelAnchor = combo.some((item) => item.levelIndex === diffIndex && item.length >= rules.minAnchorLength);
  const avgLength = combo.reduce((sum, item) => sum + item.length, 0) / Math.max(1, wordCount);

  let score = 0;
  score += anchorLength * 12;
  score += avgLength * 8;
  score += sameLevelAnchor ? 80 : 0;
  score -= Math.abs(wordCount - Math.min(rules.maxTargets, 3)) * 10;
  score -= shortWords * 22;
  combo.forEach((item) => {
    score -= Math.abs(item.levelIndex - diffIndex) * 6;
    score -= Math.min(item.rank, 20000) / 20000;
  });
  return score;
}

function isComboQualityGood(combo, difficulty) {
  if (!combo || !combo.length) return false;
  const rules = getQualityRules(difficulty);
  const diffIndex = getLevelIndex(difficulty);
  const wordCount = combo.length;
  const shortWords = combo.filter((item) => item.length <= 3).length;
  const hasAnchor = combo.some((item) => item.levelIndex === diffIndex && item.length >= rules.minAnchorLength);

  if (wordCount < rules.minTargets || wordCount > rules.maxTargets) return false;
  if (shortWords > rules.maxShortWords) return false;
  if (!hasAnchor) return false;

  // 高阶以上避免全部由短词拼凑，保证至少一个真正有学习价值的长词。
  if (getLevelIndex(difficulty) >= getLevelIndex("advanced")) {
    const longEnough = combo.some((item) => item.length >= rules.minAnchorLength);
    if (!longEnough) return false;
  }

  return true;
}

function findCombination(totalLength, difficulty, forcedWord) {
  const used = new Set();
  const result = [];
  const rules = getQualityRules(difficulty);

  if (forcedWord) {
    used.add(forcedWord.word);
    result.push(forcedWord);
  }

  function backtrack(remaining, depth) {
    if (remaining === 0) return true;
    if (remaining < 3 && remaining !== 0) return false;
    if (depth >= rules.maxTargets) return false;

    const candidates = shuffleArray(getCandidateWords(difficulty, remaining, used))
      .filter((entry) => {
        const nextRemaining = remaining - entry.length;
        return nextRemaining === 0 || nextRemaining >= 3;
      })
      .sort((a, b) => {
        const diffIndex = getLevelIndex(difficulty);
        const aLevelGap = Math.abs(a.levelIndex - diffIndex);
        const bLevelGap = Math.abs(b.levelIndex - diffIndex);
        return aLevelGap - bLevelGap
          || b.length - a.length
          || a.rank - b.rank;
      })
      .slice(0, 120);

    for (const candidate of candidates) {
      used.add(candidate.word);
      result.push(candidate);
      if (backtrack(remaining - candidate.length, depth + 1)) return true;
      result.pop();
      used.delete(candidate.word);
    }

    return false;
  }

  const remaining = totalLength - result.reduce((sum, item) => sum + item.length, 0);
  if (backtrack(remaining, result.length)) {
    return result.slice();
  }
  return null;
}

function pickTargetWords(difficulty) {
  const config = LEVEL_CONFIG[difficulty];
  const diffIndex = getLevelIndex(difficulty);
  const totalLength = config.letterCount;
  let bestCombo = null;
  let bestScore = -Infinity;

  const sameLevelWords = gameState.wordList.filter((entry) => {
    if (gameState.usedSessionWords.has(entry.word)) return false;
    if (entry.levelIndex !== diffIndex) return false;
    if (entry.length >= totalLength) return false;
    if (entry.length < config.minAnchorLength) return false;
    if (difficulty === "basic" && entry.length > 5) return false;
    if (difficulty === "intermediate" && entry.length > 7) return false;
    return entry.length >= 3;
  });

  for (let attempt = 0; attempt < 500; attempt++) {
    const forced = weightedPick(sameLevelWords, difficulty);
    if (!forced) break;
    const combo = findCombination(totalLength, difficulty, forced);
    if (combo && combo.reduce((sum, item) => sum + item.length, 0) === totalLength) {
      const score = comboQualityScore(combo, difficulty);
      if (score > bestScore) {
        bestScore = score;
        bestCombo = combo;
      }
      if (isComboQualityGood(combo, difficulty)) {
        return shuffleArray(combo);
      }
    }
  }

  // 兜底：若高质量组局失败，放宽为当前难度及以下，但仍尽量选最佳组合。
  for (let attempt = 0; attempt < 300; attempt++) {
    const relaxedPool = gameState.wordList.filter((entry) => {
      if (gameState.usedSessionWords.has(entry.word)) return false;
      return entry.levelIndex <= diffIndex && entry.length >= 3 && entry.length < totalLength;
    });
    const forced = weightedPick(relaxedPool, difficulty);
    const combo = findCombination(totalLength, difficulty, forced);
    if (combo && combo.reduce((sum, item) => sum + item.length, 0) === totalLength) {
      const score = comboQualityScore(combo, difficulty);
      if (score > bestScore) {
        bestScore = score;
        bestCombo = combo;
      }
      if (isComboQualityGood(combo, difficulty)) {
        return shuffleArray(combo);
      }
    }
  }

  if (bestCombo) return shuffleArray(bestCombo);
  throw new Error(`无法生成 ${LEVEL_CONFIG[difficulty].label} 难度关卡，请检查词库。`);
}


function createTargets(words) {
  return words.map((entry, targetIndex) => ({
    id: `target_${Date.now()}_${targetIndex}`,
    word: entry.word,
    meaning: entry.meaning,
    definition: entry.definition,
    level: entry.level,
    slots: Array.from({ length: entry.word.length }, () => null),
    hintSlots: Array.from({ length: entry.word.length }, () => false),
    solved: false,
    wrong: false
  }));
}

function createTilesFromTargets(targets) {
  const letters = targets.flatMap((target) => target.word.split(""));
  return shuffleArray(letters).map((letter, index) => ({
    id: `tile_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 7)}`,
    letter,
    location: "pool",
    targetId: null,
    slotIndex: null,
    hinted: false,
    order: index
  }));
}

function calculateRoundScore(targets) {
  return targets.reduce((sum, target) => {
    const value = LEVEL_VALUE[target.level] || 1;
    return sum + target.word.length * value;
  }, 0);
}

function setMessage(message, isError = false) {
  if (!els.messageText) return;
  els.messageText.textContent = message;
  els.messageText.style.color = isError ? "#ffb4a2" : "#fff3c4";
}

function loadSpeechVoices() {
  if (!("speechSynthesis" in window)) return;
  const voices = window.speechSynthesis.getVoices() || [];
  gameState.speechVoices = voices;
  gameState.speechReady = voices.length > 0;
}

function getEnglishVoice() {
  if (!("speechSynthesis" in window)) return null;
  if (!gameState.speechVoices.length) loadSpeechVoices();
  const voices = gameState.speechVoices || [];
  return voices.find((voice) => /^en-US/i.test(voice.lang))
    || voices.find((voice) => /^en-GB/i.test(voice.lang))
    || voices.find((voice) => /^en/i.test(voice.lang))
    || null;
}

function speakWord(word) {
  const normalized = String(word || "").trim();
  if (!normalized) return;

  if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
    setMessage("当前浏览器不支持单词发音，可以换 Chrome / Edge / Safari 测试。", true);
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(normalized.toLowerCase());
  utterance.lang = "en-US";
  utterance.rate = 0.86;
  utterance.pitch = 1;
  utterance.volume = 1;

  const voice = getEnglishVoice();
  if (voice) utterance.voice = voice;

  utterance.onerror = () => {
    setMessage(`发音失败：${normalized}。如果是手机浏览器，先点一下页面再试。`, true);
  };

  setMessage(`正在发音：${normalized}`);
  window.speechSynthesis.speak(utterance);
}

function createSpeakButtonHtml(word, extraClass = "") {
  const safeWord = escapeHtml(String(word || "").toUpperCase());
  const safeClass = escapeHtml(extraClass);
  return `<button type="button" class="speak-word-btn ${safeClass}" data-speak-word="${safeWord}" title="朗读 ${safeWord}" aria-label="朗读 ${safeWord}">🔊 ${safeWord}</button>`;
}


function startRound() {
  try {
    cleanupPointerDrag();
    const difficulty = els.difficultySelect.value;
    gameState.difficulty = difficulty;
    gameState.roundNo += 1;
    gameState.targets = createTargets(pickTargetWords(difficulty));
    gameState.tiles = createTilesFromTargets(gameState.targets);
    gameState.selectedTileId = null;
    gameState.draggedTileId = null;
    gameState.pointerDrag = null;
    gameState.lastDropTargetEl = null;
    gameState.suppressClickTileId = null;
    gameState.suppressClickUntil = 0;
    gameState.hintLevel = 0;
    gameState.hintPenalty = 0;
    gameState.roundBaseScore = calculateRoundScore(gameState.targets);
    gameState.roundScore = gameState.roundBaseScore;
    gameState.poolOrderMode = "random";
    gameState.roundCompleted = false;
    els.resultPanel.classList.add("hidden");
    els.resultPanel.innerHTML = "";
    setMessage("点击或拖拽字母牌完成组词；提示按钮会扣分并自动填入首/尾字母。");
    render();
  } catch (error) {
    console.error(error);
    setMessage(error.message || "生成关卡失败。", true);
  }
}

function restartGame() {
  gameState.totalScore = 0;
  gameState.roundNo = 0;
  startRound();
}

function getTile(tileId) {
  return gameState.tiles.find((tile) => tile.id === tileId) || null;
}

function getTarget(targetId) {
  return gameState.targets.find((target) => target.id === targetId) || null;
}

function isHintLockedSlot(target, slotIndex) {
  return Boolean(target && target.hintSlots && target.hintSlots[slotIndex]);
}

function isHintLockedTile(tile) {
  if (!tile || tile.location !== "slot" || !tile.targetId) return false;
  const target = getTarget(tile.targetId);
  return isHintLockedSlot(target, tile.slotIndex);
}

function canMoveTile(tile) {
  if (!tile || gameState.roundCompleted) return false;
  if (isHintLockedTile(tile)) return false;
  if (tile.location === "slot" && tile.targetId) {
    const target = getTarget(tile.targetId);
    if (target && target.solved) return false;
  }
  return true;
}

function cleanupPointerDrag() {
  if (gameState.pointerDrag && gameState.pointerDrag.ghost) {
    gameState.pointerDrag.ghost.remove();
  }
  if (gameState.pointerDrag && gameState.pointerDrag.sourceEl) {
    gameState.pointerDrag.sourceEl.classList.remove("dragging", "touch-source");
  }
  if (gameState.lastDropTargetEl) {
    gameState.lastDropTargetEl.classList.remove("drag-over");
  }
  document.body.classList.remove("touch-dragging");
  gameState.pointerDrag = null;
  gameState.lastDropTargetEl = null;
  gameState.draggedTileId = null;
}

function createPointerGhost(sourceEl, x, y) {
  const rect = sourceEl.getBoundingClientRect();
  const ghost = sourceEl.cloneNode(true);
  ghost.classList.remove("selected");
  ghost.classList.add("touch-drag-ghost");
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  document.body.appendChild(ghost);
  movePointerGhost(ghost, x, y);
  return ghost;
}

function movePointerGhost(ghost, x, y) {
  if (!ghost) return;
  ghost.style.left = `${x}px`;
  ghost.style.top = `${y}px`;
}

function getPointerDropTarget(x, y) {
  const element = document.elementFromPoint(x, y);
  if (!element) return null;
  const slot = element.closest(".slot");
  if (slot) return slot;
  const pool = element.closest(".letter-pool");
  if (pool) return pool;
  return null;
}

function setPointerDropHighlight(targetEl) {
  if (gameState.lastDropTargetEl && gameState.lastDropTargetEl !== targetEl) {
    gameState.lastDropTargetEl.classList.remove("drag-over");
  }
  gameState.lastDropTargetEl = targetEl || null;
  if (gameState.lastDropTargetEl) {
    gameState.lastDropTargetEl.classList.add("drag-over");
  }
}

function handleTilePointerDown(event, tileId) {
  if (event.pointerType === "mouse" && event.button !== 0) return;

  const tile = getTile(tileId);
  if (!canMoveTile(tile)) return;

  gameState.pointerDrag = {
    tileId,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    lastX: event.clientX,
    lastY: event.clientY,
    dragging: false,
    ghost: null,
    sourceEl: event.currentTarget
  };

  try {
    event.currentTarget.setPointerCapture(event.pointerId);
  } catch (error) {
    // 某些旧浏览器或特殊 WebView 可能不支持 setPointerCapture，不影响点击模式。
  }
}

function handleTilePointerMove(event) {
  const drag = gameState.pointerDrag;
  if (!drag || drag.pointerId !== event.pointerId) return;

  drag.lastX = event.clientX;
  drag.lastY = event.clientY;

  const dx = event.clientX - drag.startX;
  const dy = event.clientY - drag.startY;
  const distance = Math.hypot(dx, dy);

  if (!drag.dragging && distance < 7) return;

  if (!drag.dragging) {
    const tile = getTile(drag.tileId);
    if (!canMoveTile(tile)) {
      cleanupPointerDrag();
      return;
    }
    drag.dragging = true;
    drag.ghost = createPointerGhost(drag.sourceEl, event.clientX, event.clientY);
    drag.sourceEl.classList.add("dragging", "touch-source");
    gameState.draggedTileId = drag.tileId;
    gameState.selectedTileId = null;
    document.body.classList.add("touch-dragging");
  }

  event.preventDefault();
  movePointerGhost(drag.ghost, event.clientX, event.clientY);
  setPointerDropHighlight(getPointerDropTarget(event.clientX, event.clientY));
}

function handleTilePointerUp(event) {
  const drag = gameState.pointerDrag;
  if (!drag || drag.pointerId !== event.pointerId) return;

  const wasDragging = drag.dragging;
  const tileId = drag.tileId;
  const dropTarget = wasDragging ? getPointerDropTarget(event.clientX, event.clientY) : null;

  try {
    drag.sourceEl.releasePointerCapture(event.pointerId);
  } catch (error) {
    // ignore
  }

  cleanupPointerDrag();

  if (!wasDragging) return;

  event.preventDefault();
  gameState.suppressClickTileId = tileId;
  gameState.suppressClickUntil = Date.now() + 350;

  if (!dropTarget) {
    setMessage("已取消拖拽，字母保持原位。拖到空格或字母池即可移动。");
    render();
    return;
  }

  if (dropTarget.classList.contains("slot")) {
    const targetId = dropTarget.dataset.targetId;
    const slotIndex = Number(dropTarget.dataset.slotIndex);
    if (targetId && Number.isInteger(slotIndex)) {
      placeTileToSlot(tileId, targetId, slotIndex);
    }
    return;
  }

  if (dropTarget.classList.contains("letter-pool")) {
    moveTileToPool(tileId);
    if (!gameState.roundCompleted) setMessage("已把字母放回字母池。");
  }
}

function handleTilePointerCancel(event) {
  const drag = gameState.pointerDrag;
  if (!drag || drag.pointerId !== event.pointerId) return;
  cleanupPointerDrag();
}

function isTileCorrectlyPlaced(tile) {
  if (!tile || tile.location !== "slot" || !tile.targetId) return false;
  const target = getTarget(tile.targetId);
  return Boolean(target && target.word[tile.slotIndex] === tile.letter);
}

function removeTileFromCurrentLocation(tile) {
  if (!tile) return;
  if (tile.location === "slot" && tile.targetId) {
    const target = getTarget(tile.targetId);
    if (target && target.slots[tile.slotIndex] === tile.id) {
      target.slots[tile.slotIndex] = null;
      target.wrong = false;
      target.solved = false;
    }
  }
  tile.location = "pool";
  tile.targetId = null;
  tile.slotIndex = null;
}

function moveTileToPool(tileId) {
  const tile = getTile(tileId);
  if (!tile) return;
  if (tile.location === "slot" && tile.targetId) {
    const target = getTarget(tile.targetId);
    if (target && target.solved) {
      setMessage("这个词已经拼对并锁定，如需重来可点击“清空答案”。");
      return;
    }
    if (isHintLockedTile(tile)) {
      setMessage("这个字母是扣分提示自动放入的位置，已锁定。清空答案后会自动保留提示位。");
      return;
    }
  }
  removeTileFromCurrentLocation(tile);
  tile.order = Date.now();
  gameState.selectedTileId = null;
  checkProgress();
  render();
}

function placeTileToSlot(tileId, targetId, slotIndex) {
  const tile = getTile(tileId);
  const target = getTarget(targetId);
  if (!tile || !target || gameState.roundCompleted) return;

  if (target.solved) {
    setMessage("这个词已经拼对并锁定，可以继续完成其他词。故意重来请点击“清空答案”。");
    return;
  }

  if (isHintLockedSlot(target, slotIndex)) {
    setMessage("这个位置是扣分提示自动放入的字母，已锁定。", true);
    return;
  }

  if (isHintLockedTile(tile)) {
    setMessage("这个字母是扣分提示自动放入的位置，已锁定。", true);
    return;
  }

  const existingTileId = target.slots[slotIndex];
  if (existingTileId === tileId) return;

  removeTileFromCurrentLocation(tile);

  if (existingTileId) {
    const existingTile = getTile(existingTileId);
    if (existingTile) {
      existingTile.location = "pool";
      existingTile.targetId = null;
      existingTile.slotIndex = null;
      existingTile.order = Date.now() + 1;
    }
  }

  target.slots[slotIndex] = tile.id;
  target.wrong = false;
  tile.location = "slot";
  tile.targetId = targetId;
  tile.slotIndex = slotIndex;
  gameState.selectedTileId = null;

  checkProgress();

  if (!gameState.roundCompleted && target.wrong) {
    setMessage(`词 ${gameState.targets.indexOf(target) + 1} 还不对，换换字母试试。`, true);
  }

  render();
}

function selectTile(tileId) {
  if (gameState.roundCompleted) return;
  const tile = getTile(tileId);
  if (!tile) return;

  if (tile.location === "slot") {
    const target = getTarget(tile.targetId);
    if (target && target.solved) {
      setMessage("这个词已经拼对并锁定，可以继续完成其他词。故意重来请点击“清空答案”。");
      return;
    }
    if (isHintLockedTile(tile)) {
      setMessage("这个字母是扣分提示自动放入的位置，已锁定。", true);
      return;
    }
    moveTileToPool(tileId);
    setMessage("已把字母放回字母池。当前位置可重新填写。");
    return;
  }

  gameState.selectedTileId = gameState.selectedTileId === tileId ? null : tileId;
  setMessage(gameState.selectedTileId ? "已选中字母，请点击答案区空格。" : "已取消选中。");
  render();
}

function handleSlotClick(targetId, slotIndex) {
  if (gameState.roundCompleted) return;
  const target = getTarget(targetId);
  if (!target) return;

  const existingTileId = target.slots[slotIndex];
  if (target.solved) {
    setMessage("这个词已经拼对并锁定，可以继续完成其他词。");
    return;
  }
  if (isHintLockedSlot(target, slotIndex)) {
    setMessage("这个位置是扣分提示自动放入的字母，已锁定。", true);
    return;
  }
  if (existingTileId && !gameState.selectedTileId) {
    moveTileToPool(existingTileId);
    setMessage("已把该字母放回字母池。");
    return;
  }

  if (!gameState.selectedTileId) {
    setMessage("请先从字母池选择一个字母。", true);
    return;
  }

  placeTileToSlot(gameState.selectedTileId, targetId, slotIndex);
}

function getWordFromTarget(target) {
  return target.slots
    .map((tileId) => {
      const tile = getTile(tileId);
      return tile ? tile.letter : "";
    })
    .join("");
}

function checkProgress(showManualMessage = false) {
  let solvedCount = 0;
  let wrongCount = 0;

  gameState.targets.forEach((target) => {
    const currentWord = getWordFromTarget(target);
    const filled = target.slots.every(Boolean);
    target.solved = currentWord === target.word;
    target.wrong = filled && !target.solved;
    if (target.solved) solvedCount += 1;
    if (target.wrong) wrongCount += 1;
  });

  if (solvedCount === gameState.targets.length && !gameState.roundCompleted) {
    completeRound();
    return;
  }

  if (showManualMessage) {
    const filled = gameState.targets.reduce((sum, target) => {
      return sum + target.slots.filter(Boolean).length;
    }, 0);
    const total = gameState.targets.reduce((sum, target) => sum + target.word.length, 0);
    const wrongText = wrongCount ? `，其中 ${wrongCount} 个词还不对` : "";
    setMessage(`当前已拼对 ${solvedCount} / ${gameState.targets.length} 个词，已放入 ${filled} / ${total} 个字母${wrongText}。`, Boolean(wrongCount));
  }
}

function completeRound() {
  gameState.roundCompleted = true;
  gameState.targets.forEach((target) => gameState.usedSessionWords.add(target.word));
  gameState.totalScore += gameState.roundScore;
  gameState.selectedTileId = null;
  setMessage(`过关！本局 +${gameState.roundScore} 分。点击单词旁的 🔊 可以听发音。本次已练 ${gameState.usedSessionWords.size} 个词。`);
  render();
  showResultPanel();
}

function showResultPanel() {
  const formula = gameState.targets
    .map((target) => `${target.word.length}×${LEVEL_VALUE[target.level] || 1}`)
    .join(" + ");

  const penaltyText = gameState.hintPenalty > 0
    ? `<div>提示扣分：-${gameState.hintPenalty}，最终得分：${gameState.roundScore}</div>`
    : `<div>未使用提示，获得满分。</div>`;

  els.resultPanel.innerHTML = `
    <div class="result-title">过关成功 · +${gameState.roundScore} 分</div>
    <div>基础计分：${escapeHtml(formula)} = ${gameState.roundBaseScore}</div>
    ${penaltyText}
    <div>本次已练 ${gameState.usedSessionWords.size} 个词，重新打开游戏前不会重复出现。</div>
    <div class="result-words">
      ${gameState.targets.map((target) => `
        <div class="result-word-card">
          <div class="result-word">${createSpeakButtonHtml(target.word, "result-speak")}</div>
          <div class="result-meaning">${escapeHtml(LEVEL_NAME[target.level])} · ${escapeHtml(target.meaning)}</div>
          <div class="result-meaning">${escapeHtml(target.definition)}</div>
        </div>
      `).join("")}
    </div>
    <div class="result-next-row">
      <button class="primary-btn" onclick="startRound()">进入下一局</button>
    </div>
  `;
  els.resultPanel.classList.remove("hidden");
}

function render() {
  renderStatus();
  renderHints();
  renderTargets();
  renderLetterPool();
}

function renderStatus() {
  const config = LEVEL_CONFIG[gameState.difficulty];
  els.difficultyText.textContent = config.label;
  els.letterCountText.textContent = config.letterCount;
  els.roundScoreText.textContent = gameState.roundScore;
  els.totalScoreText.textContent = gameState.totalScore;
  els.hintModeText.textContent = config.hintMode === "cn" ? "中文释义" : "英英释义";

  if (els.moreHintBtn) {
    if (gameState.hintLevel === 0) {
      els.moreHintBtn.textContent = `提示首字母 -${getHintPenalty(1)}`;
      els.moreHintBtn.title = "扣分后自动把每个目标词的首字母移入正确位置";
    } else if (gameState.hintLevel === 1) {
      els.moreHintBtn.textContent = `提示尾字母 -${getHintPenalty(2)}`;
      els.moreHintBtn.title = "继续扣分，自动把每个目标词的尾字母移入正确位置";
    } else {
      els.moreHintBtn.textContent = "提示已完成";
      els.moreHintBtn.title = "首尾字母均已提示";
    }
    els.moreHintBtn.disabled = gameState.roundCompleted || gameState.hintLevel >= 2;
  }

  if (els.sortBtn) {
    els.sortBtn.textContent = gameState.poolOrderMode === "sorted" ? "随机打乱" : "按字母排序";
    els.sortBtn.disabled = gameState.roundCompleted;
  }

  const total = gameState.tiles.length;
  const remaining = gameState.tiles.filter((tile) => tile.location === "pool").length;
  const placed = total - remaining;
  els.poolCountText.textContent = `已放入 ${placed} / ${total}`;
}

function buildHintPattern(word) {
  const reveal = new Set();
  if (gameState.hintLevel >= 1) reveal.add(0);
  if (gameState.hintLevel >= 2) reveal.add(word.length - 1);

  return word
    .split("")
    .map((letter, index) => reveal.has(index) ? letter : "_")
    .join(" ");
}

function getHintPenalty(nextHintLevel) {
  if (nextHintLevel === 1) {
    return Math.max(1, Math.ceil(gameState.roundBaseScore * 0.10));
  }
  if (nextHintLevel === 2) {
    return Math.max(2, Math.ceil(gameState.roundBaseScore * 0.15));
  }
  return 0;
}

function getHintSlotIndexes(target, hintLevel) {
  const indexes = [];
  if (hintLevel >= 1) indexes.push(0);
  if (hintLevel >= 2) {
    const lastIndex = target.word.length - 1;
    if (!indexes.includes(lastIndex)) indexes.push(lastIndex);
  }
  return indexes;
}

function findTileForHintLetter(letter, targetId, slotIndex) {
  const poolTile = gameState.tiles.find((tile) => tile.letter === letter && tile.location === "pool");
  if (poolTile) return poolTile;

  const candidates = gameState.tiles.filter((tile) => {
    if (tile.letter !== letter || tile.location !== "slot") return false;
    const parentTarget = getTarget(tile.targetId);
    if (!parentTarget || parentTarget.solved) return false;
    if (tile.targetId === targetId && tile.slotIndex === slotIndex) return true;
    return !isHintLockedTile(tile);
  });

  return candidates.find((tile) => !isTileCorrectlyPlaced(tile))
    || candidates.find((tile) => !isHintLockedTile(tile))
    || null;
}

function sendTileBackToPool(tile, orderSeed = Date.now()) {
  if (!tile) return;
  if (tile.location === "slot" && tile.targetId) {
    const target = getTarget(tile.targetId);
    if (target && target.slots[tile.slotIndex] === tile.id) {
      target.slots[tile.slotIndex] = null;
      target.wrong = false;
      target.solved = false;
    }
  }
  tile.location = "pool";
  tile.targetId = null;
  tile.slotIndex = null;
  tile.hinted = false;
  tile.order = orderSeed;
}

function forcePlaceHintLetter(target, slotIndex) {
  if (!target || target.solved || gameState.roundCompleted) return false;

  const requiredLetter = target.word[slotIndex];
  const currentTileId = target.slots[slotIndex];
  const currentTile = currentTileId ? getTile(currentTileId) : null;

  if (currentTile && currentTile.letter === requiredLetter) {
    target.hintSlots[slotIndex] = true;
    currentTile.hinted = true;
    target.wrong = false;
    return false;
  }

  const tile = findTileForHintLetter(requiredLetter, target.id, slotIndex);
  if (!tile) return false;

  if (currentTile && currentTile.id !== tile.id) {
    sendTileBackToPool(currentTile, Date.now() + 1);
  }

  removeTileFromCurrentLocation(tile);
  target.slots[slotIndex] = tile.id;
  target.hintSlots[slotIndex] = true;
  target.wrong = false;

  tile.location = "slot";
  tile.targetId = target.id;
  tile.slotIndex = slotIndex;
  tile.hinted = true;

  return true;
}

function autoPlaceHintLetters(hintLevel) {
  let movedCount = 0;
  gameState.targets.forEach((target) => {
    getHintSlotIndexes(target, hintLevel).forEach((slotIndex) => {
      if (forcePlaceHintLetter(target, slotIndex)) movedCount += 1;
    });
  });
  gameState.selectedTileId = null;
  return movedCount;
}

function renderHints() {
  const config = LEVEL_CONFIG[gameState.difficulty];
  els.hintList.innerHTML = gameState.targets.map((target, index) => {
    const hint = config.hintMode === "cn" ? target.meaning : target.definition;
    const solvedText = target.solved ? ` · 已完成：${target.word}` : ` · ${target.word.length} 个字母`;
    const hintLabel = gameState.hintLevel === 1 ? "已自动填入首字母" : "已自动填入首尾字母";
    const extra = target.solved
      ? `<span class="hint-chip answer-chip">答案：${createSpeakButtonHtml(target.word, "hint-speak")}</span>`
      : gameState.hintLevel > 0
        ? `<span class="hint-chip">${hintLabel} <span class="word-pattern">${escapeHtml(buildHintPattern(target.word))}</span></span>`
        : "";

    return `
      <div class="hint-card ${target.solved ? "solved" : ""}">
        <div>
          <span class="hint-index">${index + 1}</span>
          <span class="hint-content">${escapeHtml(hint)}</span>
        </div>
        <div class="hint-meta">${escapeHtml(LEVEL_NAME[target.level])}${escapeHtml(solvedText)}<span class="quality-note">${target.word.length >= getQualityRules(gameState.difficulty).minAnchorLength ? "重点词" : ""}</span></div>
        ${extra ? `<div class="hint-extra">${extra}</div>` : ""}
      </div>
    `;
  }).join("");
}

function renderTargets() {
  els.targetArea.innerHTML = "";

  gameState.targets.forEach((target, targetIndex) => {
    const row = document.createElement("div");
    row.className = `target-row ${target.solved ? "solved" : ""} ${target.wrong ? "wrong" : ""}`;

    const label = document.createElement("div");
    label.className = "target-label";
    label.textContent = `词 ${targetIndex + 1}`;

    const slotList = document.createElement("div");
    slotList.className = "slot-list";

    target.slots.forEach((tileId, slotIndex) => {
      const slot = document.createElement("div");
      const hintLocked = isHintLockedSlot(target, slotIndex);
      slot.className = `slot ${tileId ? "filled" : "empty"} ${hintLocked ? "hint-slot" : ""} ${gameState.selectedTileId && !target.solved && !hintLocked ? "selected-ready" : ""}`;
      slot.dataset.targetId = target.id;
      slot.dataset.slotIndex = String(slotIndex);
      slot.addEventListener("click", () => handleSlotClick(target.id, slotIndex));
      slot.addEventListener("dragover", handleDragOver);
      slot.addEventListener("dragleave", handleDragLeave);
      slot.addEventListener("drop", (event) => handleSlotDrop(event, target.id, slotIndex));

      if (tileId) {
        const tile = getTile(tileId);
        if (tile) slot.appendChild(createTileElement(tile));
      }

      slotList.appendChild(slot);
    });

    row.appendChild(label);
    row.appendChild(slotList);
    els.targetArea.appendChild(row);
  });
}

function renderLetterPool() {
  els.letterPool.innerHTML = "";
  els.letterPool.addEventListener("dragover", handleDragOver);
  els.letterPool.addEventListener("dragleave", handleDragLeave);
  els.letterPool.addEventListener("drop", handlePoolDrop);

  const poolTiles = gameState.tiles
    .filter((tile) => tile.location === "pool")
    .sort((a, b) => a.order - b.order);

  poolTiles.forEach((tile) => {
    els.letterPool.appendChild(createTileElement(tile));
  });
}

function createTileElement(tile) {
  const parentTarget = tile.location === "slot" ? getTarget(tile.targetId) : null;
  const hintLocked = isHintLockedTile(tile);
  const locked = Boolean((parentTarget && parentTarget.solved) || hintLocked);
  const el = document.createElement("div");
  el.className = `tile ${gameState.selectedTileId === tile.id ? "selected" : ""} ${locked ? "locked" : ""} ${hintLocked ? "hinted" : ""}`;
  el.textContent = tile.letter;
  // 使用 Pointer Events 统一鼠标、手写笔和触屏拖拽。
  // HTML5 drag/drop 在 iOS 和部分安卓 WebView 上不稳定，所以这里禁用原生 draggable。
  el.draggable = false;
  el.dataset.tileId = tile.id;
  el.setAttribute("role", "button");
  el.setAttribute("aria-label", `字母 ${tile.letter}`);
  el.addEventListener("click", (event) => {
    event.stopPropagation();
    if (gameState.suppressClickTileId === tile.id && Date.now() < gameState.suppressClickUntil) {
      event.preventDefault();
      return;
    }
    selectTile(tile.id);
  });
  el.addEventListener("pointerdown", (event) => handleTilePointerDown(event, tile.id));
  el.addEventListener("pointermove", handleTilePointerMove);
  el.addEventListener("pointerup", handleTilePointerUp);
  el.addEventListener("pointercancel", handleTilePointerCancel);
  return el;
}

function handleDragStart(event, tileId) {
  if (gameState.roundCompleted) return;
  const tile = getTile(tileId);
  const parentTarget = tile && tile.location === "slot" ? getTarget(tile.targetId) : null;
  if (parentTarget && parentTarget.solved) return;
  gameState.draggedTileId = tileId;
  gameState.selectedTileId = null;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", tileId);
  const tileElement = event.currentTarget;
  setTimeout(() => tileElement.classList.add("dragging"), 0);
}

function handleDragEnd(event) {
  event.currentTarget.classList.remove("dragging");
  gameState.draggedTileId = null;
  document.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over"));
}

function handleDragOver(event) {
  event.preventDefault();
  event.currentTarget.classList.add("drag-over");
}

function handleDragLeave(event) {
  event.currentTarget.classList.remove("drag-over");
}

function handleSlotDrop(event, targetId, slotIndex) {
  event.preventDefault();
  event.currentTarget.classList.remove("drag-over");
  const tileId = event.dataTransfer.getData("text/plain") || gameState.draggedTileId;
  if (!tileId) return;
  placeTileToSlot(tileId, targetId, slotIndex);
}

function handlePoolDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.remove("drag-over");
  const tileId = event.dataTransfer.getData("text/plain") || gameState.draggedTileId;
  if (!tileId) return;
  moveTileToPool(tileId);
  setMessage("已把字母放回字母池。");
}

function sortPool() {
  if (gameState.roundCompleted) return;

  let poolTiles = gameState.tiles.filter((tile) => tile.location === "pool");

  if (gameState.poolOrderMode === "sorted") {
    poolTiles = shuffleArray(poolTiles);
    gameState.poolOrderMode = "random";
    setMessage("字母池已随机打乱。已放入答案区的字母不受影响。");
  } else {
    poolTiles = poolTiles.sort((a, b) => a.letter.localeCompare(b.letter) || a.id.localeCompare(b.id));
    gameState.poolOrderMode = "sorted";
    setMessage("字母池已按字母排序。再次点击可随机打乱。");
  }

  poolTiles.forEach((tile, index) => {
    tile.order = index;
  });
  gameState.selectedTileId = null;
  render();
}

function clearAnswers() {
  if (gameState.roundCompleted) return;
  gameState.targets.forEach((target) => {
    target.slots = target.slots.map(() => null);
    target.solved = false;
    target.wrong = false;
  });
  gameState.tiles.forEach((tile, index) => {
    tile.location = "pool";
    tile.targetId = null;
    tile.slotIndex = null;
    tile.hinted = false;
    tile.order = index;
  });
  gameState.selectedTileId = null;
  gameState.poolOrderMode = "random";
  if (gameState.hintLevel > 0) {
    autoPlaceHintLetters(gameState.hintLevel);
    checkProgress();
    if (!gameState.roundCompleted) {
      setMessage("答案区已清空，已购买的提示字母自动保留。", false);
      render();
    }
    return;
  }
  setMessage("答案区已清空。");
  render();
}

function increaseHintLevel() {
  if (gameState.roundCompleted || gameState.hintLevel >= 2) return;

  const nextHintLevel = gameState.hintLevel + 1;
  const penalty = getHintPenalty(nextHintLevel);
  gameState.hintLevel = nextHintLevel;
  gameState.hintPenalty += penalty;
  gameState.roundScore = Math.max(0, gameState.roundBaseScore - gameState.hintPenalty);

  const movedCount = autoPlaceHintLetters(gameState.hintLevel);
  checkProgress();

  if (gameState.roundCompleted) return;

  const hintText = gameState.hintLevel === 1
    ? "已自动填入每个词的首字母"
    : "已自动填入每个词的尾字母";
  const movedText = movedCount > 0 ? `，移动 ${movedCount} 张字母牌` : "，对应字母已在正确位置";
  setMessage(`${hintText}${movedText}，扣 ${penalty} 分。本局当前可得 ${gameState.roundScore} 分。`);
  render();
}

function bindEvents() {
  els.difficultySelect.addEventListener("change", startRound);
  els.nextRoundBtn.addEventListener("click", startRound);
  els.restartBtn.addEventListener("click", restartGame);
  els.sortBtn.addEventListener("click", sortPool);
  els.clearBtn.addEventListener("click", clearAnswers);
  els.moreHintBtn.addEventListener("click", increaseHintLevel);

  document.addEventListener("click", (event) => {
    const speakButton = event.target.closest("[data-speak-word]");
    if (speakButton) {
      event.preventDefault();
      event.stopPropagation();
      speakWord(speakButton.dataset.speakWord);
      return;
    }

    if (!event.target.closest(".tile") && !event.target.closest(".slot")) {
      if (gameState.selectedTileId) {
        gameState.selectedTileId = null;
        render();
      }
    }
  });
}

function initGame() {
  initDomRefs();
  gameState.wordList = buildWordList();
  loadSpeechVoices();
  if ("speechSynthesis" in window) {
    window.speechSynthesis.onvoiceschanged = loadSpeechVoices;
  }
  bindEvents();

  if (!gameState.wordList.length) {
    setMessage("词库为空或格式不正确。", true);
    return;
  }

  startRound();
}

window.startRound = startRound;
window.speakWord = speakWord;
window.addEventListener("DOMContentLoaded", initGame);
