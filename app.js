"use strict";

/* ==========================================================
   Data & constants
   ========================================================== */
const QUESTIONS = [
  {
    question: "Which programming language runs natively in every web browser?",
    options: ["Python", "JavaScript", "Java", "C#"],
    answer: 1,
  },
  {
    question: "What does CSS stand for?",
    options: ["Computer Style Sheets", "Creative Style System", "Cascading Style Sheets", "Colorful Style Syntax"],
    answer: 2,
  },
  {
    question: "What is the capital city of Australia?",
    options: ["Canberra", "Sydney", "Melbourne", "Perth"],
    answer: 0,
  },
  {
    question: "What is the chemical symbol for gold?",
    options: ["Ag", "Gd", "Au", "Go"],
    answer: 2,
  },
  {
    question: "Who painted the Mona Lisa?",
    options: ["Michelangelo", "Raphael", "Vincent van Gogh", "Leonardo da Vinci"],
    answer: 3,
  },
];

const TIME_LIMIT = 15;      // seconds per question
const ANSWER_DELAY = 1500;  // ms before advancing after an answer
const TIMEOUT_DELAY = 2000; // ms before advancing after time runs out
const WARNING_AT = 5;       // seconds left when the timer turns red
const LETTERS = ["A", "B", "C", "D"];

/* ==========================================================
   State (no DOM access in this section)
   ========================================================== */
const state = {
  index: 0,
  score: 0,
  timeLeft: TIME_LIMIT,
  locked: false,
  timerId: null,
  advanceId: null,
};

function clearTimers() {
  clearInterval(state.timerId);
  clearTimeout(state.advanceId);
  state.timerId = null;
  state.advanceId = null;
}

function resetState() {
  clearTimers();
  state.index = 0;
  state.score = 0;
  state.timeLeft = TIME_LIMIT;
  state.locked = false;
}

function currentQuestion() {
  return QUESTIONS[state.index];
}

function getPercent() {
  return Math.round((state.score / QUESTIONS.length) * 100);
}

function getMessage(percent) {
  if (percent === 100) return "Perfect score!";
  if (percent >= 80) return "Excellent!";
  if (percent >= 60) return "Good job!";
  if (percent >= 40) return "Not bad, keep practicing.";
  return "Try again!";
}

/* ==========================================================
   Game logic (updates state, then calls render functions)
   ========================================================== */
function startQuiz() {
  resetState();
  showScreen("quiz");
  renderQuestion();
  startTimer();
}

function startTimer() {
  clearInterval(state.timerId);
  state.timeLeft = TIME_LIMIT;
  renderTimer();
  state.timerId = setInterval(tick, 1000);
}

function tick() {
  state.timeLeft -= 1;
  renderTimer();
  if (state.timeLeft <= 0) handleTimeout();
}

function lockQuestion() {
  state.locked = true;
  clearInterval(state.timerId);
  state.timerId = null;
}

function handleTimeout() {
  lockQuestion();
  renderReveal(null);
  renderFeedback("Time's up! The correct answer is highlighted.", "bad");
  scheduleAdvance(TIMEOUT_DELAY);
}

function submitAnswer(choice) {
  if (state.locked) return;
  lockQuestion();
  const isCorrect = choice === currentQuestion().answer;
  if (isCorrect) state.score += 1;
  renderReveal(choice);
  renderFeedback(isCorrect ? "Correct!" : "Not quite. The correct answer is highlighted.", isCorrect ? "good" : "bad");
  scheduleAdvance(ANSWER_DELAY);
}

function scheduleAdvance(delay) {
  renderProgress();
  state.advanceId = setTimeout(nextQuestion, delay);
}

function nextQuestion() {
  state.index += 1;
  state.locked = false;
  if (state.index >= QUESTIONS.length) {
    finishQuiz();
    return;
  }
  renderQuestion();
  startTimer();
}

function finishQuiz() {
  clearTimers();
  renderResults();
}

/* ==========================================================
   UI rendering (reads state, writes to the DOM)
   ========================================================== */
const ui = {
  screens: {
    start: document.getElementById("start-screen"),
    quiz: document.getElementById("quiz-screen"),
    result: document.getElementById("result-screen"),
  },
  startBtn: document.getElementById("start-btn"),
  restartBtn: document.getElementById("restart-btn"),
  progressText: document.getElementById("progress-text"),
  progressTrack: document.querySelector(".progress"),
  progressBar: document.getElementById("progress-bar"),
  timer: document.getElementById("timer"),
  question: document.getElementById("question-text"),
  options: document.getElementById("options"),
  feedback: document.getElementById("feedback"),
  ring: document.getElementById("ring"),
  percent: document.getElementById("percent"),
  resultMessage: document.getElementById("result-message"),
  resultScore: document.getElementById("result-score"),
};

function showScreen(name) {
  Object.entries(ui.screens).forEach(([key, el]) => {
    el.classList.toggle("active", key === name);
  });
}

function renderProgress() {
  const answered = state.index + (state.locked ? 1 : 0);
  const pct = (answered / QUESTIONS.length) * 100;
  ui.progressBar.style.width = pct + "%";
  ui.progressTrack.setAttribute("aria-valuenow", Math.round(pct));
}

function renderTimer() {
  ui.timer.textContent = Math.max(state.timeLeft, 0) + "s";
  ui.timer.classList.toggle("warning", state.timeLeft <= WARNING_AT);
}

function renderFeedback(text = "", tone = "") {
  ui.feedback.textContent = text;
  ui.feedback.className = "feedback" + (tone ? " " + tone : "");
}

function renderQuestion() {
  const q = currentQuestion();
  ui.progressText.textContent = `Question ${state.index + 1} of ${QUESTIONS.length}`;
  ui.question.textContent = q.question;
  renderFeedback();
  renderProgress();

  ui.options.innerHTML = "";
  q.options.forEach((text, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option";
    btn.dataset.index = i;

    const key = document.createElement("span");
    key.className = "option-key";
    key.textContent = LETTERS[i];

    const label = document.createElement("span");
    label.textContent = text;

    btn.append(key, label);
    btn.addEventListener("click", () => submitAnswer(i));
    ui.options.append(btn);
  });
}

function renderReveal(selected) {
  const correctIndex = currentQuestion().answer;
  ui.options.querySelectorAll(".option").forEach((btn, i) => {
    btn.disabled = true;
    if (i === correctIndex) btn.classList.add("correct");
    else if (i === selected) btn.classList.add("wrong");
    else btn.classList.add("dim");
  });
}

function renderResults() {
  const percent = getPercent();
  ui.percent.textContent = percent + "%";
  ui.resultMessage.textContent = getMessage(percent);
  ui.resultScore.textContent = `You answered ${state.score} of ${QUESTIONS.length} correctly.`;

  ui.ring.style.setProperty("--pct", 0);
  showScreen("result");
  // Two frames so the browser paints 0 first, letting the ring animate up.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => ui.ring.style.setProperty("--pct", percent));
  });
}

/* ==========================================================
   Event wiring
   ========================================================== */
ui.startBtn.addEventListener("click", startQuiz);
ui.restartBtn.addEventListener("click", startQuiz);

// Keyboard shortcut: press 1-4 to pick an option.
document.addEventListener("keydown", (event) => {
  if (!ui.screens.quiz.classList.contains("active")) return;
  const i = Number(event.key) - 1;
  if (Number.isInteger(i) && i >= 0 && i < currentQuestion().options.length) submitAnswer(i);
});
