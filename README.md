# Word Puzzle｜单词组词

一个轻量级英语组词闯关小游戏。玩家根据中文释义或英英释义，将打乱的字母牌拖入答案区，拼出所有目标词后即可过关。

A lightweight English word puzzle game. Players use Chinese or English clues to arrange shuffled letter tiles into target words. Complete all words to clear the round.

---

## 中文说明

### 项目简介

**Word Puzzle｜单词组词** 是从「单词麻将」词库体系中独立出来的轻量组词游戏。它保留了麻将牌式的视觉风格，但玩法更直接：看提示、拖字母、组单词、过关得分。

本项目适合用于英语词汇练习、移动端小游戏、公众号引流页面或 GitHub Pages 在线部署。

### 核心玩法

1. 选择难度后自动生成一局游戏。
2. 系统从词库中选择若干目标词，并保证目标词总字母数等于当前难度字母数。
3. 所有目标词的字母会被打乱，放入字母池。
4. 玩家将字母牌拖入答案区空格。
5. 某个单词拼对后，该行自动锁定，并可点击发音。
6. 所有目标词拼对后自动过关并结算分数。

### 难度规则

| 难度 | 字母数 | 提示方式 | 积分倍率 |
|---|---:|---|---:|
| 基础 | 8 | 中文释义 | 1 |
| 进阶 | 10 | 中文释义 | 2 |
| 高阶 | 12 | 英英释义 | 3 |
| 学术 | 14 | 英英释义 | 4 |
| 挑战 | 16 | 英英释义 | 5 |

### 已实现功能

- 五级难度系统：基础、进阶、高阶、学术、挑战。
- 自动生成有解关卡，目标词总字母数严格匹配当前难度。
- 基础/进阶使用中文释义，高阶以上使用英英释义。
- 英英释义自动清洗，减少过长、混乱、多义项干扰。
- 支持鼠标、触屏、平板、手写笔拖拽。
- 支持点击字母牌再点击目标空格的备用操作。
- 支持重复字母，不会因相同字母导致错位。
- 拼对单词后自动锁定该行。
- 通关后展示单词、释义、等级和得分。
- 单词发音：拼对后和通关结果中均可点击发音。
- 提示系统：第一次提示首字母，第二次提示尾字母。
- 提示会自动把对应字母移动到正确位置并扣分。
- 字母排序/随机打乱双态切换。
- 清空答案时保留已购买提示字母。
- 当前页面会话内已组词汇不再重复出现，刷新或重新打开游戏后重置。
- 纯前端实现，无需后端服务。

### 计分规则

基础分计算方式：

```text
单词得分 = 单词字母数 × 单词等级倍率
本局基础分 = 所有目标词得分之和
```

提示扣分：

```text
第一次提示首字母：扣除本局基础分的 10%，至少 1 分
第二次提示尾字母：再扣除本局基础分的 15%，至少 2 分
```

最终得分：

```text
本局最终得分 = 本局基础分 - 提示扣分
```

### 文件结构

```text
word-puzzle/
├── index.html      # 页面结构
├── style.css       # 页面样式与响应式布局
├── game.js         # 游戏逻辑
├── dictionary.js   # 单词词库
└── README.md       # 项目说明
```

### 本地运行

直接用浏览器打开 `index.html` 即可运行。

如果浏览器限制本地脚本，也可以使用任意静态服务器，例如：

```bash
python -m http.server 8000
```

然后访问：

```text
http://localhost:8000
```

### 部署到 GitHub Pages

1. 新建 GitHub 仓库。
2. 上传 `index.html`、`style.css`、`game.js`、`dictionary.js` 和 `README.md`。
3. 进入仓库 `Settings`。
4. 找到 `Pages`。
5. Source 选择 `Deploy from a branch`。
6. Branch 选择 `main`，目录选择 `/root`。
7. 保存后等待 GitHub Pages 生成访问地址。

### 浏览器兼容性

推荐使用：

- Chrome
- Edge
- Safari
- Firefox
- iOS Safari
- Android Chrome

发音功能使用浏览器内置 `speechSynthesis`，不同系统的英语语音效果可能略有差异。

### 后续可优化方向

- 增加复习词表。
- 增加连续通关奖励。
- 增加计时模式。
- 增加每日挑战。
- 增加本地最高分记录。
- 增加 PWA 支持，方便添加到手机桌面。

---

## English

### Overview

**Word Puzzle** is a lightweight English vocabulary puzzle game derived from the dictionary system of Word Mahjong. It keeps the tile-based visual style, but the gameplay is simpler and more direct: read the clues, move the letters, build the words, and clear the round.

It is suitable for vocabulary learning, mobile-friendly mini games, public account landing pages, and GitHub Pages deployment.

### How to Play

1. Select a difficulty level.
2. The game generates a solvable round automatically.
3. Several target words are selected from the dictionary, and their total letter count matches the current difficulty.
4. All letters are shuffled into the letter pool.
5. Move letter tiles into the answer slots.
6. When a word is completed correctly, the row is locked and pronunciation becomes available.
7. Complete all target words to clear the round and earn points.

### Difficulty Levels

| Level | Letters | Clue Type | Score Multiplier |
|---|---:|---|---:|
| Basic | 8 | Chinese meaning | 1 |
| Intermediate | 10 | Chinese meaning | 2 |
| Advanced | 12 | English definition | 3 |
| Academic | 14 | English definition | 4 |
| Challenge | 16 | English definition | 5 |

### Features

- Five difficulty levels: Basic, Intermediate, Advanced, Academic, and Challenge.
- Solvable round generation with exact letter-count matching.
- Chinese clues for Basic and Intermediate levels.
- English definitions for Advanced and above.
- Cleaned English definitions for better readability.
- Mouse, touch, tablet, and stylus drag support via Pointer Events.
- Tap-to-select and tap-to-place as an alternative interaction.
- Duplicate letters are handled safely using unique tile IDs.
- Correct words are automatically locked.
- Completed words and result cards include pronunciation buttons.
- Hint system: first hint reveals and places the first letters; second hint reveals and places the last letters.
- Hint usage reduces the current round score.
- Sort/shuffle toggle for the letter pool.
- Clear-answer action preserves purchased hint letters.
- Words already completed in the current browser session will not appear again until the page is refreshed or reopened.
- Pure frontend implementation with no backend dependency.

### Scoring

Base score:

```text
Word score = word length × word level multiplier
Round base score = sum of all target word scores
```

Hint penalty:

```text
First-letter hint: -10% of round base score, minimum 1 point
Last-letter hint: additional -15% of round base score, minimum 2 points
```

Final round score:

```text
Final round score = round base score - hint penalty
```

### Project Structure

```text
word-puzzle/
├── index.html      # Page structure
├── style.css       # Styles and responsive layout
├── game.js         # Game logic
├── dictionary.js   # Word dictionary
└── README.md       # Project documentation
```

### Run Locally

Open `index.html` directly in a browser.

If your browser blocks local scripts, run a simple static server:

```bash
python -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

### Deploy with GitHub Pages

1. Create a GitHub repository.
2. Upload `index.html`, `style.css`, `game.js`, `dictionary.js`, and `README.md`.
3. Go to repository `Settings`.
4. Open `Pages`.
5. Set Source to `Deploy from a branch`.
6. Select the `main` branch and `/root` directory.
7. Save and wait for GitHub Pages to publish the site.

### Browser Compatibility

Recommended browsers:

- Chrome
- Edge
- Safari
- Firefox
- iOS Safari
- Android Chrome

Pronunciation uses the browser's built-in `speechSynthesis` API. Voice quality may vary across devices and operating systems.

### Roadmap

- Review word list.
- Combo bonus.
- Timed mode.
- Daily challenge.
- Local high-score record.
- PWA support for adding the game to the home screen.

---

## Recommended License

MIT License is recommended if this project is published as an open-source repository.

