// --- 變數宣告 ---
let questionTable; // 儲存 CSV 資料的 p5.Table 物件
let questions = []; // 儲存處理後的題目物件
let currentQ = 0;   // 目前題號 (從 0 開始)
let score = 0;      // 學生分數
let state = 'QUIZ'; // 狀態: 'QUIZ' (作答中), 'RESULT' (結果顯示)

let optionBoxes = []; // 儲存選項的矩形資訊 [x, y, w, h]
let selectedOption = -1; // 記錄選擇的選項索引 (0, 1, 2)
let isCorrect = null;    // 記錄上一題是否答對 (true/false)

// --- 游標特效變數 ---
let cursorTrail = []; // 游標軌跡點
const TRAIL_LENGTH = 15;
const TRAIL_RADIUS = 8;


// --- 1. 資料載入 (preload) ---
// 確保在 setup() 運行前載入 CSV
function preload() {
  // loadTable(檔名, [選項, ...])
  // 'csv': 逗號分隔檔案, 'header': 包含標頭列
  questionTable = loadTable('questions.csv', 'csv', 'header');
}

// --- 2. 設定 (setup) ---
function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES); // 設定角度模式為度數，方便動畫計算
  
  // 解析 CSV 資料
  parseQuestions();
  
  // 計算選項框位置 (假設三個選項)
  let boxY = 250;
  let boxW = 300;
  let boxH = 50;
  for (let i = 0; i < 3; i++) {
    optionBoxes.push([width / 2 - boxW / 2, boxY + i * 80, boxW, boxH]);
  }
}

// 將 p5.Table 轉換為更容易使用的 JavaScript 物件陣列
function parseQuestions() {
  for (let r = 0; r < questionTable.getRowCount(); r++) {
    let row = questionTable.getRow(r);
    questions.push({
      question: row.getString('question'),
      options: [
        row.getString('optionA'),
        row.getString('optionB'),
        row.getString('optionC')
      ],
      correct: row.getString('correct')
    });
  }
}

// --- 3. 繪圖迴圈 (draw) ---
function draw() {
  background(40, 50, 60); // 深色背景

  // 1. 繪製游標特效
  drawCursorEffect();

  if (state === 'QUIZ') {
    drawQuiz();
  } else if (state === 'RESULT') {
    drawResultAnimation();
  }
}

// --- 游標特效 ---
function drawCursorEffect() {
  // 將目前的滑鼠位置加入軌跡陣列
  cursorTrail.push(createVector(mouseX, mouseY));
  
  // 保持軌跡長度
  if (cursorTrail.length > TRAIL_LENGTH) {
    cursorTrail.shift(); // 移除最舊的點
  }
  
  noStroke();
  for (let i = 0; i < cursorTrail.length; i++) {
    let pos = cursorTrail[i];
    // 根據索引計算透明度和半徑，實現漸隱效果
    let alpha = map(i, 0, TRAIL_LENGTH, 50, 255);
    let r = map(i, 0, TRAIL_LENGTH, 1, TRAIL_RADIUS);
    fill(255, 200, 0, alpha); // 橙色半透明
    ellipse(pos.x, pos.y, r * 2);
  }
  
  // 隱藏原始游標，改用自製游標
  noCursor(); 
}

// --- 測驗畫面 ---
function drawQuiz() {
  if (currentQ >= questions.length) {
    state = 'RESULT';
    return;
  }
  
  let q = questions[currentQ];
  
  // 繪製題目
  fill(255);
  textSize(20);
  textAlign(LEFT, CENTER);
  text(`第 ${currentQ + 1} 題 / 共 ${questions.length} 題`, width / 2, 80);
  textSize(32);
  text(q.question, 50, 150, width - 100, 100);

  // 繪製選項
  for (let i = 0; i < q.options.length; i++) {
    let [x, y, w, h] = optionBoxes[i];
    let optionText = String.fromCharCode(65 + i) + '. ' + q.options[i];
    
    let isHovering = mouseX > x && mouseX < x + w && mouseY > y && mouseY < y + h;
    let isCurrentSelection = selectedOption === i;
    
    // 選項特效：滑鼠懸停和點擊選取
    if (isCurrentSelection) {
      // 被選取選項的顏色
      fill(50, 150, 200); 
    } else if (isHovering) {
      // 懸停特效：輕微閃爍/變亮
      let brightness = map(sin(frameCount * 5 + i * 30), -1, 1, 180, 255);
      fill(brightness); 
    } else {
      fill(100, 120, 140); 
    }
    
    // 繪製選項框
    rectMode(CORNER);
    noStroke();
    rect(x, y, w, h, 10); // 圓角矩形
    
    // 繪製選項文字
    fill(255);
    textSize(18);
    textAlign(LEFT, CENTER);
    text(optionText, x + 20, y + h / 2);
  }
  
  // 繪製確認按鈕
  drawSubmitButton();
}

// 繪製提交按鈕
function drawSubmitButton() {
  let btnW = 150;
  let btnH = 40;
  let btnX = width / 2 - btnW / 2;
  let btnY = height - 80;
  
  let isHovering = mouseX > btnX && mouseX < btnX + btnW && mouseY > btnY && mouseY < btnY + btnH;
  
  if (selectedOption !== -1) {
    fill(isHovering ? 0 : 50, 200, isHovering ? 0 : 50); // 綠色
  } else {
    fill(150); // 灰色 (不可點擊)
  }
  
  rect(btnX, btnY, btnW, btnH, 5);
  fill(255);
  textSize(20);
  textAlign(CENTER, CENTER);
  text("確認", btnX + btnW / 2, btnY + btnH / 2);
}

// --- 4. 滑鼠點擊事件 (mousePressed) ---
function mousePressed() {
  if (state === 'QUIZ') {
    // 檢查是否點擊選項
    let foundOption = false;
    for (let i = 0; i < optionBoxes.length; i++) {
      let [x, y, w, h] = optionBoxes[i];
      if (mouseX > x && mouseX < x + w && mouseY > y && mouseY < y + h) {
        selectedOption = i;
        foundOption = true;
        break;
      }
    }
    
    // 檢查是否點擊確認按鈕
    let btnW = 150;
    let btnH = 40;
    let btnX = width / 2 - btnW / 2;
    let btnY = height - 80;
    
    if (selectedOption !== -1 && mouseX > btnX && mouseX < btnX + btnW && mouseY > btnY && mouseY < btnY + btnH) {
      checkAnswer();
    }
    
  } else if (state === 'RESULT') {
    // 在結果畫面點擊可以重置測驗 (可選功能)
    // state = 'QUIZ';
    // currentQ = 0;
    // score = 0;
  }
}

// --- 檢查答案與計分 ---
function checkAnswer() {
  let correctLabel = questions[currentQ].correct; // 'A', 'B', 'C'
  let correctIndex = correctLabel.charCodeAt(0) - 'A'.charCodeAt(0); // 0, 1, 2
  
  if (selectedOption === correctIndex) {
    score++;
    isCorrect = true;
  } else {
    isCorrect = false;
  }
  
  // 進入下一題
  currentQ++;
  selectedOption = -1; // 重置選擇
}

// --- 5. 結果與動態回饋 ---
function drawResultAnimation() {
  let finalScore = score;
  let totalQuestions = questions.length;
  let passThreshold = totalQuestions * 0.7; // 假設 70% 是及格線
  
  let feedbackText, circleColor, emoji;
  
  if (finalScore >= passThreshold) {
    // 稱讚的動態畫面
    feedbackText = "太棒了! 你很厲害!";
    circleColor = color(0, 255, 0); // 綠色
    emoji = "⭐";
  } else {
    // 鼓勵的動態畫面
    feedbackText = "別灰心，下次會更好!";
    circleColor = color(255, 100, 0); // 橘色
    emoji = "💡";
  }
  
  // 基礎分數顯示
  fill(255);
  textSize(40);
  textAlign(CENTER, CENTER);
  text("測驗結果", width / 2, 100);
  textSize(60);
  text(`${finalScore} / ${totalQuestions}`, width / 2, height / 2);
  
  textSize(30);
  text(feedbackText, width / 2, height / 2 + 80);

  // 動態回饋：發射粒子（或圓圈）
  let maxCircles = 100;
  let speed = 5;
  let circleRadius = 15;
  
  // 粒子發射邏輯 (簡化為隨機圓圈)
  push()
  translate(width / 2, height / 2); // 居中繪製動畫
  
  for(let i = 0; i < maxCircles; i++) {
    // 利用 frameCount 創造動態
    let angle = (i * 360 / maxCircles) + frameCount * (finalScore >= passThreshold ? 0.5 : -0.8);
    let radius = (frameCount * speed) % 300; // 圓圈向外擴散
    let x = cos(angle) * radius;
    let y = sin(angle) * radius;
    
    let alpha = map(radius, 0, 300, 255, 0); // 越遠越透明
    
    let c = circleColor;
    c.setAlpha(alpha);
    fill(c);
    noStroke();
    
    // 繪製粒子或圓圈
    ellipse(x, y, circleRadius + map(sin(frameCount*10 + i*10), -1, 1, -5, 5));
    
    // 在中心放置一個大表情符號 (可選)
    if (i === 0) {
       textSize(80);
       textAlign(CENTER, CENTER);
       text(emoji, 0, 0);
    }
  }
  pop();
}