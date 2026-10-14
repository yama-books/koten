/* Checkpoint -> 敬語訳アシスト (same-origin, no URL text parameters).
 * Keigo v0.4 remains a learning hypothesis tool, not an automatic correct-answer engine.
 */
(() => {
  const input = document.getElementById("input");
  const launch = document.getElementById("openKeigo");
  const launchFromPoint = document.getElementById("openKeigoFromPoint");
  const dialog = document.getElementById("keigoDialog");
  const frame = document.getElementById("keigoFrame");
  const close = document.getElementById("closeKeigo");
  const status = document.getElementById("keigoStatus");
  if (!input || !launch || !launchFromPoint || !dialog || !frame || !close || !status) return;

  const MAX_PASSAGE_LENGTH = 10000; // Matches v0.4's message payload limit.
  let frameLoaded = false;
  let pending = null;
  let previousFocus = null;

  function rangeOrNull(start, end, textLength) {
    if (!Number.isInteger(start) || !Number.isInteger(end)) return null;
    if (start < 0 || end <= start || end > textLength) return null;
    return {selectedStart: start, selectedEnd: end};
  }

  function currentTextSelection() {
    return rangeOrNull(input.selectionStart, input.selectionEnd, input.value.length);
  }

  function sendToKeigo() {
    if (!frameLoaded || !pending || dialog.hidden || !frame.contentWindow) return;
    frame.contentWindow.postMessage({type: "keigo-assist:load", payload: pending}, window.location.origin);
    status.textContent = "本文を引き継ぎました。敬語の種類や敬意の方向は仮説として検討してください。";
  }

  function openWithRange(range) {
    const text = input.value;
    if (!text.trim()) {
      status.textContent = "本文を入力してください。";
      input.focus();
      return;
    }
    if (text.length > MAX_PASSAGE_LENGTH) {
      window.alert("敬語訳アシストに渡せる本文は一度に10,000文字までです。本文を分けてください。");
      return;
    }
    pending = {text};
    const validRange = range && rangeOrNull(range.selectedStart, range.selectedEnd, text.length);
    if (validRange) Object.assign(pending, validRange);

    previousFocus = document.activeElement;
    if (document.getElementById("drawer").classList.contains("open")) closeDrawer();
    dialog.hidden = false;
    dialog.setAttribute("aria-hidden", "false");
    document.body.classList.add("keigo-open");
    close.focus();
    status.textContent = "敬語訳アシストを開いています…";
    if (frameLoaded) sendToKeigo();
    else if (!frame.getAttribute("src")) frame.setAttribute("src", "keigo-assist/index.html");
  }

  function closeKeigo() {
    if (dialog.hidden) return;
    dialog.hidden = true;
    dialog.setAttribute("aria-hidden", "true");
    document.body.classList.remove("keigo-open");
    pending = null;
    if (previousFocus && previousFocus.isConnected && typeof previousFocus.focus === "function") previousFocus.focus();
    else launch.focus();
    previousFocus = null;
  }

  frame.addEventListener("load", () => {
    frameLoaded = !!frame.contentDocument?.getElementById("passage");
    if (!frameLoaded) {
      status.textContent = "敬語訳アシストを読み込めませんでした。ページを再読み込みしてください。";
      return;
    }
    sendToKeigo();
  });
  launch.addEventListener("click", () => openWithRange(currentTextSelection()));
  launchFromPoint.addEventListener("click", () => {
    const h = typeof currentPoint === "function" ? currentPoint() : null;
    if (!h || h.type !== "honorific") return;
    openWithRange(rangeOrNull(h.start, h.end, input.value.length));
  });
  close.addEventListener("click", closeKeigo);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeKeigo();
  });
  document.addEventListener("keydown", (event) => {
    if (dialog.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeKeigo();
    } else if (event.key === "Tab") {
      // Focus stays within the same-origin assistant panel while it is open.
      const available = [close, frame].filter(el => !el.disabled && !el.hidden);
      if (document.activeElement === close && event.shiftKey) {
        event.preventDefault(); frame.focus();
      } else if (document.activeElement === frame && !event.shiftKey) {
        event.preventDefault(); close.focus();
      }
    }
  });
})();
