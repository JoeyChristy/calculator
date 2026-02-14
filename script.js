const expressionEl = document.getElementById("expression");
const resultEl = document.getElementById("result");
const keys = document.querySelector(".keys");
const calculatorEl = document.getElementById("calculator");
const secretEl = document.getElementById("secret");
const graphCanvas = document.getElementById("graph");
const controls = document.querySelector(".controls");

let expression = "";
let justEvaluated = false;
let secretBuffer = "";

const operators = new Set(["+", "-", "*", "/", "%", "^"]);
const secretCode = "7423";

function formatExpression(text) {
  return text
    .replaceAll("sqrt(", "sqrt(")
    .replaceAll("log10(", "log(")
    .replaceAll("ln(", "ln(")
    .replaceAll("sin(", "sin(")
    .replaceAll("cos(", "cos(")
    .replaceAll("tan(", "tan(")
    .replaceAll("pi", "π")
    .replaceAll("*", " × ")
    .replaceAll("/", " ÷ ")
    .replaceAll("-", " − ")
    .replaceAll("+", " + ")
    .replaceAll("^", " ^ ")
    .replaceAll("%", " % ");
}

function updateDisplay(resetResult = false) {
  expressionEl.textContent = expression ? formatExpression(expression) : "0";
  if (resetResult || !expression) {
    resultEl.textContent = "0";
  }
}

function toExecutable(raw, xValue = null) {
  if (!raw) {
    return null;
  }

  const stripped = raw.replace(/\s+/g, "");
  if (!/^[0-9+\-*/%^().,a-z]+$/i.test(stripped)) {
    return null;
  }

  let expr = stripped
    .replaceAll("^", "**")
    .replaceAll("sin(", "Math.sin(")
    .replaceAll("cos(", "Math.cos(")
    .replaceAll("tan(", "Math.tan(")
    .replaceAll("sqrt(", "Math.sqrt(")
    .replaceAll("log10(", "Math.log10(")
    .replaceAll("ln(", "Math.log(")
    .replace(/\bpi\b/g, "Math.PI")
    .replace(/\be\b/g, "Math.E");

  if (expr.includes("x")) {
    if (xValue === null) {
      return null;
    }
    expr = expr.replace(/\bx\b/g, `(${xValue})`);
  }

  return expr;
}

function evaluate(raw, xValue = null) {
  const executable = toExecutable(raw, xValue);
  if (!executable) {
    return null;
  }

  try {
    const value = Function(`"use strict"; return (${executable})`)();
    if (!Number.isFinite(value)) {
      return null;
    }
    return Number.isInteger(value) ? value : Number(value.toFixed(10));
  } catch {
    return null;
  }
}

function trackSecretCode(value) {
  if (!/^[0-9]$/.test(value)) {
    return;
  }

  secretBuffer = `${secretBuffer}${value}`.slice(-secretCode.length);
  if (secretBuffer === secretCode) {
    calculatorEl.remove();
    secretEl.hidden = false;
  }
}

function appendValue(value) {
  if (justEvaluated && !operators.has(value)) {
    expression = "";
  }
  justEvaluated = false;

  if (value === ".") {
    const numberMatch = expression.match(/(\d+\.?\d*|\.\d*)$/);
    const currentNumber = numberMatch ? numberMatch[0] : "";
    if (currentNumber.includes(".")) {
      return;
    }
    if (!currentNumber) {
      expression += "0";
    }
  }

  if (operators.has(value)) {
    if (!expression) {
      if (value === "-") {
        expression = "-";
      }
      return;
    }

    const last = expression.at(-1);
    if (operators.has(last)) {
      expression = `${expression.slice(0, -1)}${value}`;
      return;
    }
  }

  expression += value;
  trackSecretCode(value);
}

function clearAll() {
  expression = "";
  resultEl.textContent = "0";
  justEvaluated = false;
}

function deleteLast() {
  expression = expression.slice(0, -1);
  justEvaluated = false;
}

function handleEquals() {
  if (!expression || operators.has(expression.at(-1)) || expression.at(-1) === "(") {
    return;
  }

  const value = evaluate(expression);
  if (value === null) {
    resultEl.textContent = "Error";
    justEvaluated = true;
    return;
  }

  expression = String(value);
  resultEl.textContent = expression;
  justEvaluated = true;
}

function clearGraph() {
  const ctx = graphCanvas.getContext("2d");
  const width = graphCanvas.width;
  const height = graphCanvas.height;
  ctx.clearRect(0, 0, width, height);
  drawAxes(ctx, width, height);
}

function drawAxes(ctx, width, height) {
  ctx.strokeStyle = "#8a5a14";
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(width / 2, 0);
  ctx.lineTo(width / 2, height);
  ctx.stroke();
}

function plotGraph() {
  const ctx = graphCanvas.getContext("2d");
  const width = graphCanvas.width;
  const height = graphCanvas.height;
  const xMin = -10;
  const xMax = 10;
  const yMin = -10;
  const yMax = 10;

  ctx.clearRect(0, 0, width, height);
  drawAxes(ctx, width, height);

  if (!expression.includes("x")) {
    resultEl.textContent = "Use x to graph";
    return;
  }

  ctx.strokeStyle = "#ffb703";
  ctx.lineWidth = 2;
  ctx.beginPath();

  let started = false;

  for (let px = 0; px <= width; px += 1) {
    const xValue = xMin + (px / width) * (xMax - xMin);
    const yValue = evaluate(expression, xValue);

    if (yValue === null || yValue < yMin - 200 || yValue > yMax + 200) {
      started = false;
      continue;
    }

    const py = height - ((yValue - yMin) / (yMax - yMin)) * height;

    if (!started) {
      ctx.moveTo(px, py);
      started = true;
    } else {
      ctx.lineTo(px, py);
    }
  }

  ctx.stroke();
}

keys.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const { action, value } = target.dataset;
  if (action === "clear") {
    clearAll();
    clearGraph();
    updateDisplay(true);
    return;
  }

  if (action === "delete") {
    deleteLast();
    updateDisplay(true);
    return;
  }

  if (value) {
    appendValue(value);
    updateDisplay(true);
  }
});

controls.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const { action } = target.dataset;

  if (action === "equals") {
    handleEquals();
    updateDisplay();
    return;
  }

  if (action === "plot") {
    plotGraph();
    return;
  }

  if (action === "clear-graph") {
    clearGraph();
  }
});

window.addEventListener("keydown", (event) => {
  const { key } = event;

  if (/^[0-9]$/.test(key) || ["+", "-", "*", "/", "%", ".", "(", ")", "^", "x"].includes(key)) {
    appendValue(key);
    updateDisplay(true);
    return;
  }

  if (key === "s") {
    appendValue("sin(");
    updateDisplay(true);
    return;
  }

  if (key === "c") {
    appendValue("cos(");
    updateDisplay(true);
    return;
  }

  if (key === "t") {
    appendValue("tan(");
    updateDisplay(true);
    return;
  }

  if (key === "l") {
    appendValue("ln(");
    updateDisplay(true);
    return;
  }

  if (key === "g") {
    appendValue("log10(");
    updateDisplay(true);
    return;
  }

  if (key === "r") {
    appendValue("sqrt(");
    updateDisplay(true);
    return;
  }

  if (key === "p") {
    appendValue("pi");
    updateDisplay(true);
    return;
  }

  if (key === "Enter" || key === "=") {
    handleEquals();
    updateDisplay();
    return;
  }

  if (key === "Backspace") {
    deleteLast();
    updateDisplay(true);
    return;
  }

  if (key === "Escape") {
    clearAll();
    clearGraph();
    updateDisplay(true);
  }
});

clearGraph();
updateDisplay();
