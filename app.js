let questions = [];
let current = null;
let orderIndex = 0;
let autoTimer = null;

const storeKey = "bioQuiz.complete.v3";
const state = JSON.parse(localStorage.getItem(storeKey) || '{"history":{},"recent":[]}');
const $ = (id) => document.getElementById(id);

function save() {
  localStorage.setItem(storeKey, JSON.stringify(state));
}

function stat(q) {
  return state.history[q.id] || {
    seen: 0,
    correct: 0,
    wrong: 0,
    priority: Boolean(q.priority),
    attempts: []
  };
}

function normalizeStat(s, q) {
  s.seen ||= 0;
  s.correct ||= 0;
  s.wrong ||= 0;
  s.priority = Boolean(s.priority || q.priority);
  s.attempts ||= [];
  return s;
}

function mode() {
  return document.querySelector('input[name="mode"]:checked').value;
}

function typeLabel(type) {
  return { single: "单选题", multi: "多选题", tf: "判断题", short: "简答题" }[type] || type;
}

function answerArray(q) {
  return correctOptions(q).sort();
}

function selectedArray() {
  return [...document.querySelectorAll('input[name="answer"]:checked')]
    .map((input) => input.value)
    .sort();
}

function sameAnswer(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[a-d][.、．)]/g, "")
    .replace(/[，。、“”‘’：:；;（）()【】\[\]\s]/g, "")
    .replace(/^(答案|正确答案|为|是|包括|不包括|进行)/, "");
}

function overlapScore(a, b) {
  const aa = [...new Set(normalizeText(a))];
  const bb = [...new Set(normalizeText(b))];
  if (!aa.length || !bb.length) return 0;
  const hit = aa.filter((ch) => bb.includes(ch)).length;
  return hit / Math.max(aa.length, bb.length);
}

function optionPool(q) {
  return q.type === "tf" ? ["正确", "错误"] : (q.options || []);
}

function correctOptions(q) {
  const options = optionPool(q);
  const answers = Array.isArray(q.answer) ? q.answer : [q.answer];
  if (q.type === "short") return answers.map(String);

  return answers.map((answer) => {
    const raw = String(answer || "").trim();
    const letter = raw.match(/^[A-D]$/i);
    if (letter) {
      const index = letter[0].toUpperCase().charCodeAt(0) - 65;
      if (options[index]) return options[index];
    }

    const exact = options.find((option) => String(option) === raw);
    if (exact) return exact;

    const normalizedAnswer = normalizeText(raw);
    const contains = options.find((option) => {
      const normalizedOption = normalizeText(option);
      return normalizedOption.includes(normalizedAnswer) || normalizedAnswer.includes(normalizedOption);
    });
    if (contains) return contains;

    const ranked = options
      .map((option) => ({ option, score: overlapScore(option, raw) }))
      .sort((a, b) => b.score - a.score);
    return ranked[0]?.score >= 0.45 ? ranked[0].option : raw;
  });
}

function filteredQuestions() {
  let list = questions.slice();
  const chapter = $("chapterFilter").value;
  if (chapter && chapter !== "全部章节") {
    list = list.filter((q) => q.chapter === chapter);
  }
  const currentMode = mode();
  if (currentMode === "priority") list = list.filter((q) => q.priority || stat(q).priority);
  if (currentMode === "mistakes") list = list.filter((q) => q.mistake || stat(q).wrong > 0);
  return list.length ? list : questions.slice();
}

function weight(q) {
  const s = normalizeStat(stat(q), q);
  let w = 1;
  if (q.priority || s.priority) w += 2;
  if (q.mistake || s.wrong > 0) w += 4 + s.wrong;
  if (s.seen === 0) w += 2;
  if (s.correct >= 2 && s.wrong === 0) w -= 0.7;
  return Math.max(0.2, w);
}

function pickQuestion() {
  const list = filteredQuestions();
  const currentMode = mode();
  if (currentMode === "order") {
    const q = list[orderIndex % list.length];
    orderIndex += 1;
    return q;
  }
  const weighted = list.map((q) => [q, currentMode === "adaptive" ? weight(q) : 1]);
  const sum = weighted.reduce((total, item) => total + item[1], 0);
  let cursor = Math.random() * sum;
  for (const [q, w] of weighted) {
    cursor -= w;
    if (cursor <= 0) return q;
  }
  return weighted[0][0];
}

function answerText(q) {
  const mapped = correctOptions(q);
  if (q.type !== "short" && mapped.length) return mapped.join("、");
  return Array.isArray(q.answer) ? q.answer.join("、") : String(q.answer);
}

function renderQuestion(q = null) {
  if (autoTimer) clearTimeout(autoTimer);
  current = q || pickQuestion();

  $("qid").textContent = current.id;
  $("qtype").textContent = typeLabel(current.type);
  $("badge").textContent = current.chapter;
  $("tags").innerHTML = [
    current.priority ? '<span class="pill">重点</span>' : "",
    current.mistake ? '<span class="pill">易错</span>' : "",
    ...(current.tags || []).map((tag) => `<span class="pill">${tag}</span>`)
  ].join("");
  $("prompt").textContent = current.prompt;
  $("feedback").style.display = "none";
  $("feedback").className = "";
  $("options").innerHTML = "";
  $("shortAnswer").style.display = current.type === "short" ? "block" : "none";
  $("shortAnswer").value = "";

  const options = current.type === "tf" ? ["正确", "错误"] : current.options;
  if (current.type !== "short") {
    options.forEach((option, index) => {
      const row = document.createElement("label");
      row.className = "option";
      const inputType = current.type === "multi" ? "checkbox" : "radio";
      row.innerHTML = `<input type="${inputType}" name="answer" value="${option}"><strong>${String.fromCharCode(65 + index)}</strong><span>${option}</span>`;
      $("options").appendChild(row);
    });
  }

  setActiveListItem(current.id);
  updateStats();
}

function showAnswer(ok, selectedText = "") {
  const title = ok === true ? "回答正确" : ok === false ? "回答错误" : "标准答案";
  $("feedback").style.display = "block";
  $("feedback").className = ok === true ? "ok" : ok === false ? "bad" : "";
  $("feedback").innerHTML = `
    <p><strong>${title}</strong></p>
    ${selectedText ? `<p><strong>你的答案：</strong>${selectedText}</p>` : ""}
    <p><strong>标准答案：</strong>${answerText(current)}</p>
    <p><strong>解析：</strong>${current.explanation || "暂无解析，建议按教材对应知识点复习。"}</p>
    <p class="countdown">1.6 秒后自动进入下一题，可在“已做回看”里重新看本题。</p>
  `;
}

function recordAttempt(ok, selectedText, viewOnly = false) {
  const s = normalizeStat(stat(current), current);
  s.seen += 1;
  if (!viewOnly && ok === true) s.correct += 1;
  if (!viewOnly && ok === false) s.wrong += 1;
  s.attempts.unshift({
    at: new Date().toLocaleString(),
    ok,
    selected: selectedText,
    answer: answerText(current),
    explanation: current.explanation || ""
  });
  s.attempts = s.attempts.slice(0, 8);
  state.history[current.id] = s;
  state.recent.unshift({ id: current.id, prompt: current.prompt, ok, selected: selectedText });
  state.recent = state.recent.slice(0, 20);
  save();
}

function submitAnswer(viewOnly = false) {
  if (!current) return;
  let ok = null;
  let selectedText = "";

  if (current.type !== "short") {
    const selected = selectedArray();
    if (!selected.length && !viewOnly) {
      $("feedback").style.display = "block";
      $("feedback").className = "bad";
      $("feedback").innerHTML = "请先选择答案。";
      return;
    }
    selectedText = selected.join("、") || "未作答";
    ok = viewOnly ? null : sameAnswer(selected, answerArray(current));
  } else {
    selectedText = $("shortAnswer").value.trim() || "未填写";
  }

  recordAttempt(ok, selectedText, viewOnly);
  showAnswer(ok, selectedText);
  updateStats();
  renderLists();
  if (!viewOnly && ok === true && document.getElementById("practiceView").classList.contains("active")) {
    autoTimer = setTimeout(() => renderQuestion(), 1600);
  } else {
    const countdown = $("feedback").querySelector(".countdown");
    if (countdown) countdown.textContent = "本题不会自动跳转，可以手动点“下一题”或进入回看。";
  }
}

function updateStats() {
  $("totalCount").textContent = questions.length;
  const values = Object.values(state.history);
  const done = values.reduce((total, s) => total + (s.seen || 0), 0);
  const correct = values.reduce((total, s) => total + (s.correct || 0), 0);
  const judged = values.reduce((total, s) => total + (s.correct || 0) + (s.wrong || 0), 0);
  $("doneCount").textContent = done;
  $("accRate").textContent = judged ? Math.round((correct / judged) * 100) + "%" : "0%";
}

function setActiveListItem(id) {
  document.querySelectorAll(".question-item").forEach((item) => {
    item.classList.toggle("selected", item.dataset.id === id);
  });
}

function renderLists() {
  const keyword = ($("searchBox")?.value || "").trim();
  let list = filteredQuestions();
  if (keyword) {
    list = list.filter((q) => [q.prompt, answerText(q), q.explanation, q.chapter].join(" ").includes(keyword));
  }
  $("bankSummary").textContent = `当前显示 ${list.length} 题，点击题干可以直接开始做。`;
  $("questionList").innerHTML = list.map((q, index) => {
    const s = normalizeStat(stat(q), q);
    const status = s.wrong > 0 ? "错题" : s.seen > 0 ? "已做" : "未做";
    return `
      <button class="question-item ${current?.id === q.id ? "selected" : ""}" data-id="${q.id}">
        <span>${index + 1}. ${q.prompt}</span>
        <small>${q.chapter} · ${typeLabel(q.type)} · ${status}</small>
      </button>
    `;
  }).join("");

  const reviewFilter = $("reviewFilter").value;
  const reviewed = questions.filter((q) => {
    const s = normalizeStat(stat(q), q);
    if (s.seen <= 0) return false;
    if (reviewFilter === "wrong") return s.wrong > 0;
    if (reviewFilter === "correct") return s.correct > 0;
    return true;
  });
  $("reviewList").innerHTML = reviewed.length ? reviewed.map((q) => {
    const s = normalizeStat(stat(q), q);
    const last = s.attempts[0] || {};
    return `
      <article class="review-item">
        <div class="review-title">
          <strong>${q.id} ${q.prompt}</strong>
          <button class="mini" data-id="${q.id}">再做一次</button>
        </div>
        <p><strong>最近作答：</strong>${last.selected || "无"}</p>
        <p><strong>标准答案：</strong>${answerText(q)}</p>
        <p><strong>解析：</strong>${q.explanation || "暂无解析。"}</p>
        <small>已做 ${s.seen} 次，正确 ${s.correct} 次，错误 ${s.wrong} 次</small>
      </article>
    `;
  }).join("") : '<div class="empty">还没有已做记录。提交答案后，这里会自动生成回看列表。</div>';
}

function markPriority() {
  if (!current) return;
  const s = normalizeStat(stat(current), current);
  s.priority = true;
  state.history[current.id] = s;
  save();
  $("feedback").style.display = "block";
  $("feedback").className = "";
  $("feedback").innerHTML = "已加入重点题。";
  renderLists();
}

function exportRecord() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "bio-quiz-record.json";
  link.click();
}

function switchView(id) {
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === id));
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === id));
  renderLists();
}

function drawBackground() {
  const canvas = $("bio-bg");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  canvas.width = innerWidth * devicePixelRatio;
  canvas.height = innerHeight * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  ctx.strokeStyle = "rgba(22,122,114,.14)";
  for (let x = -80; x < innerWidth + 80; x += 120) {
    ctx.beginPath();
    for (let y = 0; y < innerHeight; y += 20) {
      const dx = Math.sin(y / 50 + x / 90) * 20;
      if (y) ctx.lineTo(x + dx, y);
      else ctx.moveTo(x + dx, y);
    }
    ctx.stroke();
  }
}

function initQuestions(data) {
  questions = data;
  const chapters = ["全部章节", ...Array.from(new Set(questions.map((q) => q.chapter)))];
  $("chapterFilter").innerHTML = chapters.map((chapter) => `<option>${chapter}</option>`).join("");
  renderQuestion();
  renderLists();
}

document.addEventListener("click", (event) => {
  const tab = event.target.closest(".tab");
  if (tab) switchView(tab.dataset.view);

  const item = event.target.closest(".question-item, .mini");
  if (item?.dataset.id) {
    const q = questions.find((entry) => entry.id === item.dataset.id);
    if (q) {
      switchView("practiceView");
      renderQuestion(q);
    }
  }
});

$("nextBtn").onclick = () => renderQuestion();
$("checkBtn").onclick = () => submitAnswer(false);
$("showBtn").onclick = () => submitAnswer(true);
$("againBtn").onclick = markPriority;
$("resetBtn").onclick = () => {
  if (confirm("确定清空本设备的练习记录吗？")) {
    localStorage.removeItem(storeKey);
    location.reload();
  }
};
$("exportBtn").onclick = exportRecord;
$("searchBox").oninput = renderLists;
$("reviewFilter").onchange = renderLists;
document.addEventListener("change", (event) => {
  if (event.target.name === "mode" || event.target.id === "chapterFilter") {
    orderIndex = 0;
    renderQuestion();
    renderLists();
  }
});
addEventListener("resize", drawBackground);
drawBackground();

if (window.BIO_QUESTIONS) {
  initQuestions(window.BIO_QUESTIONS);
} else {
  fetch("questions.json")
    .then((response) => response.json())
    .then(initQuestions)
    .catch((err) => {
      $("badge").textContent = "题库加载失败";
      $("prompt").textContent = "请确认 questions.json 和 index.html 在同一文件夹，或使用本地服务器打开。";
      console.error(err);
    });
}
