/* ==========================================================================
   ضغطة واحدة قد تكلّفك الكثير — منطق العرض التفاعلي
   لا يجمع هذا الملف أي بيانات، ولا يفحص الجهاز، ولا يتصل بأي خدمة خارجية.
   ========================================================================== */

(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const escapeHtml = (value) =>
    String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[char]));

  const els = {
    body: document.body,
    deck: $("#deck"),
    topbar: $("#topbar"),
    navbar: $("#navbar"),
    progressRail: $(".progress-rail"),
    progressFill: $("#progressFill"),
    skipLink: $(".skip-link"),
    chapterLabel: $("#chapterLabel"),
    currentNum: $("#currentNum"),
    counterTotal: $(".counter__total"),
    prevBtn: $("#prevBtn"),
    nextBtn: $("#nextBtn"),
    quizBtn: $("#quizBtn"),
    quizScore: $("#quizScore"),
    quizScoreValue: $("#quizScoreValue"),
    quizTabs: $("#quizTabs"),
    quizStage: $("#quizStage"),
    soundToggle: $("#soundToggle"),
    fullscreenBtn: $("#fullscreenBtn"),
    fullscreenBtn2: $("#fullscreenBtn2"),
    restartBtn: $("#restartBtn"),
    helpBtn: $("#helpBtn"),
    helpDialog: $("#helpDialog"),
    closeHelp: $("#closeHelp"),
    closeHelp2: $("#closeHelp2"),
    intro: $("#intro"),
    introStage: $("#introStage"),
    introMessages: $("#introMessages"),
    introMsg: $("#introMsg"),
    introEcho: $("#introEcho"),
    introLog: $("#introLog"),
    introClock: $("#introClock"),
    introStatus: $("#introStatus"),
    introRing: $("#introRing"),
    introPct: $("#introPct"),
    introLinks: $("#introLinks"),
    introSources: $("#introSources"),
    introAttempts: $("#introAttempts"),
    introDepth: $("#introDepth"),
    introDepthText: $("#introDepthText"),
    introThreat: $("#introThreat"),
    introThreatBar: $("#introThreatBar"),
    introOutbound: $("#introOutbound"),
    introActivity: $("#introActivity"),
    introProtected: $("#introProtected"),
    dashMessage: $(".dash__message"),
    introFlash: $("#introFlash"),
    introBlackout: $("#introBlackout"),
    introAlert: $("#introAlert"),
    introBreach: $("#introBreach"),
    introCountdown: $("#introCountdown"),
    countdownRing: $("#countdownRing"),
    countdownNum: $("#countdownNum"),
    countdownBar: $("#countdownBar"),
    introReveal: $("#introReveal"),
    revealTitle: $("#revealTitle"),
    introSound: $("#introSound"),
    reduceMotion: $("#reduceMotion"),
    introControls: $(".intro__controls"),
    skipIntro: $("#skipIntro"),
    startShow: $("#startShow"),
    replayIntro: $("#replayIntro"),
    revealQuiz: $("#revealQuiz"),
    scrollCue: $("#scrollCue"),
    toast: $("#toast"),
  };

  const slides = $$(".slide");
  const totalSlides = slides.length;
  let current = 0;
  let introActive = true;
  let introRevealed = false;
  let introRunning = false;

  /* ---------------------------------------------------------------------
     1. المؤثرات الصوتية — إنذار وتشويش تقني فقط، بلا موسيقى
     نحاول التشغيل التلقائي، ونكمل عند أول تفاعل إن منعه المتصفح.
     --------------------------------------------------------------------- */
  let audioCtx = null;
  let soundOn = true;
  let audioUnlocked = false;
  let audioGestureBound = false;
  const activeAudioNodes = new Set();

  function ensureAudio() {
    if (!soundOn) return null;
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    try {
      if (!audioCtx) audioCtx = new AudioCtor();
      if (audioCtx.state === "suspended") {
        audioCtx.resume().then(() => {
          if (audioCtx && audioCtx.state === "running") audioUnlocked = true;
        }).catch(() => {});
      } else if (audioCtx.state === "running") {
        audioUnlocked = true;
      }
      return audioCtx;
    } catch (error) {
      return null;
    }
  }

  function trackNode(node) {
    activeAudioNodes.add(node);
    node.addEventListener("ended", () => activeAudioNodes.delete(node), { once: true });
  }

  function tone(frequency, duration = 0.1, type = "sine", volume = 0.03, delay = 0) {
    const ctx = ensureAudio();
    if (!ctx || ctx.state !== "running") return;
    try {
      const start = ctx.currentTime + delay;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(volume, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      trackNode(oscillator);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.03);
    } catch (error) {
      /* الصوت رفاهية بصرية؛ نتجاهل أي فشل بهدوء. */
    }
  }

  function noiseBurst(duration = 0.22, volume = 0.02, filterFrequency = 1400, delay = 0) {
    const ctx = ensureAudio();
    if (!ctx || ctx.state !== "running") return;
    try {
      const start = ctx.currentTime + delay;
      const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = filterFrequency;
      filter.Q.value = 0.7;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(volume, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      trackNode(source);
      source.start(start);
      source.stop(start + duration + 0.02);
    } catch (error) {
      /* تجاهل */
    }
  }

  function alarmBurst(intensity = 1) {
    if (!soundOn) return;
    const level = Math.max(0.35, Math.min(1.4, intensity));
    tone(940, 0.18, "square", 0.026 * level);
    tone(640, 0.22, "square", 0.024 * level, 0.18);
    tone(940, 0.18, "square", 0.022 * level, 0.42);
    noiseBurst(0.34, 0.018 * level, 1900);
  }

  function countdownTone(remaining) {
    if (!soundOn) return;
    tone(330 + remaining * 55, 0.07, "triangle", remaining <= 2 ? 0.034 : 0.026);
    if (remaining === 1) tone(880, 0.12, "square", 0.02, 0.04);
  }

  function alarmPeak() {
    if (!soundOn) return;
    for (let i = 0; i < 4; i += 1) {
      tone(1080 - i * 90, 0.14, "sawtooth", 0.028, i * 0.13);
      tone(540 - i * 35, 0.18, "square", 0.022, i * 0.13 + 0.06);
    }
    noiseBurst(0.9, 0.035, 1200);
    noiseBurst(0.55, 0.025, 3200, 0.2);
  }

  function stopAllAudio() {
    activeAudioNodes.forEach((node) => {
      try { node.stop(); } catch (error) { /* تجاهل */ }
    });
    activeAudioNodes.clear();
  }

  function primeAudio() {
    if (!soundOn) return;
    const ctx = ensureAudio();
    if (!ctx) return;
    if (ctx.state === "running") audioUnlocked = true;
    bindAudioGesture();
  }

  function bindAudioGesture() {
    if (audioGestureBound) return;
    audioGestureBound = true;
    const unlock = () => {
      if (!soundOn) return;
      const ctx = ensureAudio();
      if (!ctx) return;
      const afterResume = () => {
        if (ctx.state !== "running") return;
        audioUnlocked = true;
        if (!introRunning) return;
        if (introPhase === "signal" || introPhase === "alert" || introPhase === "breach") {
          alarmBurst(0.8);
        } else if (introPhase === "dashboard") {
          tone(760, 0.06, "triangle", 0.024);
          noiseBurst(0.18, 0.014, 1700);
        }
      };
      if (ctx.state === "suspended") ctx.resume().then(afterResume).catch(() => {});
      else afterResume();
    };
    ["pointerdown", "keydown", "touchstart"].forEach((eventName) => {
      document.addEventListener(eventName, unlock, { once: true, capture: true, passive: true });
    });
  }

  function setSoundState(nextState, announce = false) {
    soundOn = Boolean(nextState);
    if (soundOn) {
      primeAudio();
      if (announce && !introActive) tone(680, 0.07, "sine", 0.025);
    } else {
      stopAllAudio();
    }

    const set = (button, label) => {
      if (!button) return;
      button.setAttribute("aria-pressed", String(soundOn));
      button.setAttribute("aria-label", soundOn ? "كتم المؤثرات الصوتية" : "تشغيل المؤثرات الصوتية");
      const use = button.querySelector("use");
      if (use) use.setAttribute("href", soundOn ? "#i-volume" : "#i-mute");
      const text = button.querySelector("span");
      if (text) text.textContent = label;
      button.title = label;
    };

    set(els.soundToggle, soundOn ? "الصوت مفعّل" : "الصوت مغلق");
    set(els.introSound, soundOn ? "كتم الصوت" : "تشغيل الصوت");

    if (announce && !introActive) {
      showToast(soundOn ? "تم تشغيل المؤثرات الصوتية — بدون موسيقى" : "تم كتم المؤثرات الصوتية");
    }
  }

  function toggleSound() {
    setSoundState(!soundOn, true);
  }

  /* ---------------------------------------------------------------------
     2. رسائل التنبيه الصغيرة
     --------------------------------------------------------------------- */
  let toastTimer = null;
  let toastHideTimer = null;

  function showToast(message, duration = 2800) {
    if (!els.toast) return;
    clearTimeout(toastTimer);
    clearTimeout(toastHideTimer);
    els.toast.textContent = message;
    els.toast.hidden = false;
    requestAnimationFrame(() => els.toast.classList.add("is-visible"));
    toastTimer = setTimeout(() => {
      els.toast.classList.remove("is-visible");
      toastHideTimer = setTimeout(() => {
        els.toast.hidden = true;
      }, 320);
    }, duration);
  }

  /* ---------------------------------------------------------------------
     3. التنقل بين الشرائح
     --------------------------------------------------------------------- */
  function setBackgroundLock(locked) {
    [els.deck, els.topbar, els.navbar, els.skipLink].forEach((element) => {
      if (!element) return;
      if (locked) element.setAttribute("inert", "");
      else element.removeAttribute("inert");
    });
  }

  function updateUI() {
    const slide = slides[current];
    els.currentNum.textContent = String(current + 1);
    if (els.counterTotal) els.counterTotal.textContent = String(totalSlides);
    els.progressFill.style.width = `${((current + 1) / totalSlides) * 100}%`;
    els.prevBtn.disabled = current === 0;
    els.nextBtn.disabled = current === totalSlides - 1;
    els.chapterLabel.textContent = slide.dataset.chapter || "";

    slides.forEach((item, index) => {
      const active = index === current;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-hidden", active ? "false" : "true");
      if (active) item.removeAttribute("inert");
      else item.setAttribute("inert", "");
    });

    scheduleScrollCue();
  }

  let scrollCueFrame = 0;

  function updateScrollCue() {
    if (!els.scrollCue) return;
    const slide = slides[current];
    if (!slide || introActive) {
      els.scrollCue.classList.remove("is-visible");
      return;
    }
    const maxScroll = slide.scrollHeight - slide.clientHeight;
    const remaining = maxScroll - slide.scrollTop;
    const isClosing = current === totalSlides - 1;
    let show = maxScroll > 24 && remaining > 24;

    // في الشريحة الأخيرة: لا نغطّي التوقيع إذا كان ظاهرًا،
    // لكن نُظهر تلميح التمرير إذا كان التوقيع ما زال أسفل الشاشة.
    if (isClosing) {
      const credit = slide.querySelector(".closing__credit");
      if (credit) {
        const slideRect = slide.getBoundingClientRect();
        const creditRect = credit.getBoundingClientRect();
        const creditVisible = creditRect.top < slideRect.bottom - 12 && creditRect.bottom > slideRect.top + 12;
        // يظهر التلميح فقط قبل أول تمرير إن كان التوقيع خارج الشاشة.
        show = show && slide.scrollTop < 8 && !creditVisible;
      } else {
        show = false;
      }
    }

    const label = els.scrollCue.querySelector("span");
    if (label) {
      label.textContent = isClosing ? "اسحب للأسفل لرؤية التوقيع" : "اسحب للأسفل لرؤية المزيد";
    }
    els.scrollCue.classList.toggle("is-visible", show);
  }

  function scheduleScrollCue() {
    if (scrollCueFrame) return;
    scrollCueFrame = requestAnimationFrame(() => {
      scrollCueFrame = 0;
      updateScrollCue();
    });
  }

  function goToSlide(index, options = {}) {
    if (introActive && options.allowDuringIntro !== true) return;
    const target = Math.max(0, Math.min(totalSlides - 1, Number(index) || 0));
    if (target === current && !options.force) return;

    const forward = target > current;
    slides.forEach((item) => item.classList.remove("is-active"));
    slides[target].style.setProperty("--enter", forward ? "-1" : "1");
    // إعادة تشغيل أنيميشن الدخول والظهور المتدرج
    void slides[target].offsetWidth;
    current = target;
    updateUI();
    slides[target].scrollTop = 0;
    scheduleScrollCue();

    if (options.focus !== false) {
      slides[target].focus({ preventScroll: true });
    }
  }

  function nextSlide() {
    if (introActive) return;
    if (current >= totalSlides - 1) {
      showToast("وصلت إلى نهاية العرض — يمكنك إعادة العرض من البداية");
      return;
    }
    goToSlide(current + 1);
  }

  function previousSlide() {
    if (introActive) return;
    if (current <= 0) return;
    goToSlide(current - 1);
  }

  function restartPresentation() {
    resetQuiz();
    goToSlide(0, { force: true, allowDuringIntro: true, focus: false });
    startIntro();
  }

  /* ---------------------------------------------------------------------
     4. المقدمة السينمائية
     --------------------------------------------------------------------- */
  let introTimers = [];
  let clockTimer = null;
  let progressTimer = null;
  let logTicker = null;
  let countdownTimer = null;
  let revealStageTimer = null;
  let revealFocusTimer = null;
  let introStartedAt = 0;
  let introPctValue = 0;
  let introPhase = "black";
  let motionReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const FILLER_LOGS = [
    ["TRACE", "فحص ترويسات الرسالة"],
    ["DNS", "مطابقة النطاق مع القائمة البيضاء"],
    ["TLS", "قراءة بصمة الشهادة الرقمية"],
    ["REDIR", "تحليل مسار إعادة التوجيه"],
    ["FILE", "فحص الملف المرفق في بيئة معزولة"],
    ["AUTH", "مقارنة سجل الاتصال السابق"],
    ["SCORE", "تحديث درجة الخطورة"],
    ["PORT", "فحص منافذ الجلسة النشطة"],
    ["GUARD", "مراقبة محاولات الوصول"],
    ["LOCK", "تجميد الموارد الحساسة مؤقتًا"],
    ["LOG", "تسجيل الحدث في السجل المحلي"],
  ];

  const INTRO_MESSAGES = [
    { text: "تم اكتشاف نشاط غير معتاد...", tag: "ALERT / 01", shake: "1", status: "نشاط غير معتاد", warn: true },
    { text: "رصد اتصال غير موثوق...", tag: "TRACE / 02", shake: "1", status: "اتصال غير موثوق", warn: true },
    { text: "محاولة الوصول إلى موارد محمية...", tag: "ACCESS / 03", shake: "2", status: "محاولة وصول", warn: true },
    { text: "فشل التحقق الأمني!", tag: "FAIL / 04", shake: "3", status: "فشل التحقق", danger: true },
  ];

  function clearIntroTimers() {
    introTimers.forEach((timer) => clearTimeout(timer));
    introTimers = [];
    if (clockTimer) {
      clearInterval(clockTimer);
      clockTimer = null;
    }
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
    if (logTicker) {
      clearInterval(logTicker);
      logTicker = null;
    }
    if (countdownTimer) {
      clearTimeout(countdownTimer);
      countdownTimer = null;
    }
  }

  function later(callback, delay) {
    introTimers.push(setTimeout(callback, delay));
  }

  function formatClock(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  }

  function setIntroPhase(phase) {
    introPhase = phase;
    els.intro.dataset.phase = phase;
  }

  function flashIntro() {
    if (motionReduced || !els.introFlash) return;
    els.introFlash.classList.remove("is-flashing");
    void els.introFlash.offsetWidth;
    els.introFlash.classList.add("is-flashing");
    setTimeout(() => els.introFlash.classList.remove("is-flashing"), 700);
  }

  function setStatus(text, level = "") {
    if (!els.introStatus) return;
    els.introStatus.textContent = text;
    const wrapper = els.introStatus.closest(".dash__status");
    if (wrapper) {
      wrapper.classList.toggle("is-warn", level === "warn");
      wrapper.classList.toggle("is-danger", level === "danger");
    }
  }

  function setThreat(level) {
    if (!els.introThreat || !els.introThreatBar) return;
    const map = {
      low: { label: "منخفض", code: "LOW", width: "8%", color: "#4fd1b8" },
      medium: { label: "متوسط", code: "MEDIUM", width: "38%", color: "#f5b942" },
      high: { label: "مرتفع", code: "HIGH", width: "68%", color: "#ff8a5c" },
      critical: { label: "حرج", code: "CRITICAL", width: "100%", color: "#ff3b4e" },
    };
    const state = map[level] || map.low;
    const label = els.introThreat.querySelector("span");
    const code = els.introThreat.querySelector("b");
    if (label) label.textContent = state.label;
    if (code) code.textContent = state.code;
    els.introThreat.classList.toggle("is-medium", level === "medium");
    els.introThreat.classList.toggle("is-high", level === "high");
    els.introThreat.classList.toggle("is-critical", level === "critical");
    els.introThreatBar.style.width = state.width;
    els.introThreatBar.style.background = state.color;
  }

  function updateProgress(value, options = {}) {
    introPctValue = value;
    const color = value >= 75 ? "#ff3b4e" : value >= 45 ? "#f5b942" : "#4fd1b8";
    if (els.introRing) {
      els.introRing.style.setProperty("--p", String(value));
      els.introRing.style.setProperty("--ring", color);
    }
    if (els.introPct) els.introPct.textContent = String(value);
    if (els.introDepth) {
      els.introDepth.style.width = `${value}%`;
      els.introDepth.style.background = value >= 75
        ? "linear-gradient(90deg, #7c1220, #ff3b4e)"
        : "linear-gradient(90deg, #2e8d79, #4fd1b8)";
    }
    if (els.introDepthText) els.introDepthText.textContent = `${value}%`;
    if (els.introLinks) els.introLinks.textContent = String(Math.min(4, Math.round(value / 25)));
    if (els.introAttempts) els.introAttempts.textContent = String(value >= 75 ? 4 : value >= 45 ? 2 : value >= 20 ? 1 : 0);
    if (els.introSources) els.introSources.textContent = String(value >= 75 ? 5 : 3);
    if (els.introOutbound) els.introOutbound.textContent = `${Math.round(value * 0.72)} KB`;
    if (els.introProtected) els.introProtected.textContent = String(value >= 90 ? 3 : value >= 75 ? 8 : 12);
    if (els.introActivity) {
      els.introActivity.textContent = value >= 75 ? "حرج" : value >= 45 ? "مريب" : "طبيعي";
      els.introActivity.style.color = value >= 75 ? "#ff7784" : value >= 45 ? "#f5b942" : "#aabdb6";
    }
    if (options.threat) setThreat(options.threat);
  }

  function animateProgress(target, duration = 800, options = {}) {
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
    if (options.threat) setThreat(options.threat);
    if (duration <= 0) {
      updateProgress(target, options);
      return;
    }
    const from = introPctValue;
    const started = performance.now();
    progressTimer = setInterval(() => {
      const progress = Math.min(1, (performance.now() - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      updateProgress(Math.round(from + (target - from) * eased), options);
      if (progress >= 1) {
        clearInterval(progressTimer);
        progressTimer = null;
        updateProgress(target, options);
      }
    }, 40);
  }

  function pushLog(tag, text, level = "") {
    if (!els.introLog) return;
    const line = document.createElement("div");
    line.className = `logline${level ? ` is-${level}` : ""}`;
    const time = document.createElement("time");
    time.textContent = formatClock(performance.now() - introStartedAt);
    const label = document.createElement("b");
    label.textContent = tag;
    const message = document.createElement("span");
    message.textContent = text;
    line.append(time, label, message);
    els.introLog.append(line);
    while (els.introLog.children.length > 18) {
      els.introLog.firstElementChild.remove();
    }
  }

  function startLogTicker() {
    if (logTicker) clearInterval(logTicker);
    let index = 0;
    logTicker = setInterval(() => {
      if (!introRunning || (introPhase !== "dashboard" && introPhase !== "alert")) return;
      const item = FILLER_LOGS[index % FILLER_LOGS.length];
      index += 1;
      pushLog(item[0], item[1]);
      if (index % 3 === 0) tone(480 + (index % 5) * 40, 0.03, "sine", 0.009);
    }, 700);
  }

  function seedDashboardLogs() {
    const seeds = [
      ["DNS", "تحقق من سجل النطاق"],
      ["TLS", "فحص شهادة الاتصال"],
      ["REDIR", "تتبع مسار إعادة التوجيه"],
      ["FILE", "فحص الملفات المؤقتة"],
      ["AUTH", "مراجعة صلاحيات الجلسة"],
      ["SCORE", "حساب مؤشر الخطورة"],
      ["PORT", "فحص منافذ الاتصال"],
      ["GUARD", "تفعيل طبقة الحماية"],
      ["LOG", "تسجيل الأحداث محليًا"],
    ];
    seeds.forEach(([tag, text], index) => {
      pushLog(tag, text, index === 5 ? "warn" : "");
    });
  }

  function resetDashboard() {
    if (els.introLog) els.introLog.replaceChildren();
    if (els.introMsg) {
      els.introMsg.textContent = "";
      els.introMsg.dataset.text = "";
      els.introMsg.className = "intro__msg";
    }
    if (els.introEcho) {
      els.introEcho.textContent = "";
      els.introEcho.classList.remove("is-visible");
    }
    if (els.dashMessage) els.dashMessage.className = "dash__message";
    updateProgress(0, { threat: "low" });
    setStatus("INITIALIZING");
  }

  function showIntroMessage(message) {
    if (!introRunning || !els.introMsg) return;
    const previous = els.introMsg.dataset.text || "";
    if (els.introEcho) {
      els.introEcho.textContent = previous;
      els.introEcho.classList.toggle("is-visible", Boolean(previous));
    }
    els.introMsg.dataset.text = message.text;
    els.introMsg.className = `intro__msg${message.danger ? " intro__msg--danger" : ""}`;
    els.introMsg.innerHTML = `<span class="intro__msg-tag" aria-hidden="true">${escapeHtml(message.tag)}</span><span class="intro__msg-text">${escapeHtml(message.text)}</span>`;
    void els.introMsg.offsetWidth;
    els.introMsg.classList.add("is-in");
    els.introStage.dataset.shake = motionReduced ? "0" : message.shake;
    setStatus(message.status, message.danger ? "danger" : message.warn ? "warn" : "");
    if (els.dashMessage) {
      els.dashMessage.classList.toggle("is-warn", Boolean(message.warn && !message.danger));
      els.dashMessage.classList.toggle("is-danger", Boolean(message.danger));
    }
    if (message.danger) {
      alarmBurst(1.05);
      noiseBurst(0.22, 0.02, 2600);
    } else {
      tone(message.warn ? 720 : 560, 0.055, "triangle", 0.022);
    }
  }

  function startCountdown() {
    if (!introRunning) return;
    setIntroPhase("countdown");
    if (els.introBreach) els.introBreach.hidden = true;
    if (els.introCountdown) els.introCountdown.hidden = false;
    let remaining = 5;
    const step = () => {
      if (!introRunning) return;
      if (els.countdownNum) els.countdownNum.textContent = String(remaining);
      if (els.countdownRing) {
        els.countdownRing.style.setProperty("--p", String(remaining * 20));
        els.countdownRing.classList.remove("is-tick");
        void els.countdownRing.offsetWidth;
        els.countdownRing.classList.add("is-tick");
      }
      if (els.countdownBar) els.countdownBar.style.transform = `scaleX(${remaining / 5})`;
      countdownTone(remaining);
      remaining -= 1;
      if (remaining >= 1) {
        countdownTimer = setTimeout(step, 650);
      } else {
        countdownTimer = setTimeout(() => {
          if (introRunning) cutToBlack();
        }, 650);
      }
    };
    step();
  }

  function cutToBlack() {
    stopAllAudio();
    setIntroPhase("blackout");
    els.introStage.dataset.shake = "0";
    if (els.introAlert) els.introAlert.hidden = true;
    if (els.introBreach) els.introBreach.hidden = true;
    if (els.introCountdown) els.introCountdown.hidden = true;
    if (els.introBlackout) els.introBlackout.hidden = false;
  }

  function showIntroReveal() {
    if (introRevealed) return;
    introRevealed = true;
    introRunning = false;
    introPhase = "reveal";
    clearIntroTimers();
    stopAllAudio();
    els.introStage.dataset.shake = "0";
    els.intro.classList.remove("is-cut");
    els.intro.classList.add("is-revealed");
    if (els.introBlackout) els.introBlackout.hidden = true;
    if (els.introAlert) els.introAlert.hidden = true;
    if (els.introBreach) els.introBreach.hidden = true;
    if (els.introCountdown) els.introCountdown.hidden = true;
    els.introReveal.hidden = false;
    clearTimeout(revealStageTimer);
    clearTimeout(revealFocusTimer);
    revealStageTimer = setTimeout(() => {
      els.introStage.hidden = true;
    }, 380);
    revealFocusTimer = setTimeout(() => {
      els.revealTitle.focus({ preventScroll: true });
    }, 620);
  }

  function startIntro() {
    clearIntroTimers();
    clearTimeout(revealStageTimer);
    clearTimeout(revealFocusTimer);
    revealStageTimer = null;
    revealFocusTimer = null;
    stopAllAudio();
    introActive = true;
    introRunning = true;
    introRevealed = false;
    introPhase = "dashboard";
    introPctValue = 0;

    els.body.dataset.mood = "threat";
    els.body.classList.add("intro-active");
    if (els.scrollCue) els.scrollCue.classList.remove("is-visible");
    setBackgroundLock(true);

    els.intro.hidden = false;
    els.intro.removeAttribute("aria-hidden");
    els.intro.classList.remove("is-done", "is-armed", "is-cut", "is-revealed");
    setIntroPhase("dashboard");
    els.introStage.hidden = false;
    els.introStage.dataset.shake = "0";
    els.introReveal.hidden = true;
    if (els.introAlert) els.introAlert.hidden = true;
    if (els.introBreach) els.introBreach.hidden = true;
    if (els.introCountdown) els.introCountdown.hidden = true;
    if (els.introBlackout) els.introBlackout.hidden = true;
    if (els.countdownNum) els.countdownNum.textContent = "5";
    if (els.countdownRing) els.countdownRing.style.setProperty("--p", "100");
    if (els.countdownBar) els.countdownBar.style.transform = "scaleX(1)";
    if (els.introControls) els.introControls.style.visibility = "";
    resetDashboard();

    els.introClock.textContent = "00:00:00";
    introStartedAt = performance.now();
    clockTimer = setInterval(() => {
      els.introClock.textContent = formatClock(performance.now() - introStartedAt);
    }, 200);

    primeAudio();
    bindAudioGesture();

    setTimeout(() => {
      if (introRunning) els.intro.focus({ preventScroll: true });
    }, 110);

    // يبدأ الفحص مباشرة عند فتح الموقع، دون مشهد مثلث افتتاحي
    setIntroPhase("dashboard");
    setStatus("INITIALIZING");
    pushLog("BOOT", "تهيئة محرك التحليل الآمن");
    seedDashboardLogs();
    showIntroMessage({ text: "جارٍ تحليل الرابط...", tag: "SCAN / 00", status: "تحليل الرابط", shake: "0" });
    animateProgress(8, 1200, { threat: "low" });
    startLogTicker();
    tone(520, 0.06, "triangle", 0.022);
    noiseBurst(0.18, 0.012, 900);

    later(() => {
      if (!introRunning) return;
      pushLog("TRACE", "فتح الرابط داخل بيئة معزولة");
      animateProgress(19, 1400);
      tone(600, 0.05, "sine", 0.02);
    }, 2300);

    later(() => {
      if (!introRunning) return;
      showIntroMessage(INTRO_MESSAGES[0]);
      pushLog("ALERT", "نشاط غير معتاد على الاتصال", "warn");
      animateProgress(39, 1800, { threat: "medium" });
    }, 4300);

    later(() => {
      if (!introRunning) return;
      showIntroMessage(INTRO_MESSAGES[1]);
      pushLog("TRACE", "رصد اتصال غير موثوق", "warn");
      animateProgress(58, 1800, { threat: "medium" });
    }, 7300);

    later(() => {
      if (!introRunning) return;
      showIntroMessage(INTRO_MESSAGES[2]);
      pushLog("ACCESS", "محاولة الوصول إلى موارد محمية", "warn");
      animateProgress(78, 1800, { threat: "high" });
      flashIntro();
      noiseBurst(0.26, 0.018, 2100);
    }, 10300);

    later(() => {
      if (!introRunning) return;
      showIntroMessage(INTRO_MESSAGES[3]);
      pushLog("FAIL", "فشل التحقق الأمني", "danger");
      setStatus("SECURITY FAILURE", "danger");
      animateProgress(92, 1600, { threat: "critical" });
      alarmBurst(1.1);
    }, 13300);

    later(() => {
      if (!introRunning) return;
      if (logTicker) {
        clearInterval(logTicker);
        logTicker = null;
      }
      setIntroPhase("alert");
      setStatus("CRITICAL THREAT", "danger");
      if (els.introAlert) els.introAlert.hidden = false;
      flashIntro();
      alarmBurst(1.25);
      noiseBurst(0.4, 0.022, 1600);
    }, 15300);

    later(() => {
      if (!introRunning) return;
      if (els.introAlert) els.introAlert.hidden = true;
      setIntroPhase("breach");
      setStatus("BREACH", "danger");
      if (els.introBreach) els.introBreach.hidden = false;
      flashIntro();
      alarmPeak();
    }, 17800);

    // عدّاد تنازلي بعد ظهور عبارة الاختراق (نُبقي العبارة ظاهرة مدة كافية على الجوال)
    later(startCountdown, 20200);

    // بعد انتهاء العدّاد: شاشة سوداء صامتة ثم لحظة الكشف
    later(showIntroReveal, 25400);
  }

  function skipToReveal() {
    if (introRevealed) return;
    showIntroReveal();
  }

  function setMotionReduced(nextState, announce = false) {
    motionReduced = Boolean(nextState);
    document.documentElement.classList.toggle("reduce-motion", motionReduced);
    if (els.reduceMotion) {
      els.reduceMotion.setAttribute("aria-pressed", String(motionReduced));
      els.reduceMotion.setAttribute("aria-label", motionReduced ? "تفعيل الحركة الكاملة" : "تقليل الحركة والوميض");
      const label = els.reduceMotion.querySelector("span");
      if (label) label.textContent = motionReduced ? "الحركة الكاملة" : "تقليل الحركة";
    }
    if (announce && !introActive) {
      showToast(motionReduced ? "تم تقليل الحركة والوميض" : "تم تفعيل الحركة الكاملة");
    }
  }

  function finishIntro(targetSlide = 0) {
    clearIntroTimers();
    clearTimeout(revealStageTimer);
    clearTimeout(revealFocusTimer);
    revealStageTimer = null;
    revealFocusTimer = null;
    stopAllAudio();
    introRunning = false;
    introActive = false;
    els.intro.classList.add("is-done");
    els.intro.setAttribute("aria-hidden", "true");
    els.body.classList.remove("intro-active");
    els.body.dataset.mood = "calm";
    setBackgroundLock(false);
    goToSlide(targetSlide, { force: true, allowDuringIntro: true, focus: false });
    scheduleScrollCue();
    setTimeout(() => {
      const active = slides[current];
      if (active) active.focus({ preventScroll: true });
    }, 500);
  }

  /* ---------------------------------------------------------------------
     5. الاختبار التفاعلي (سيناريوهات خيالية بالكامل)
     --------------------------------------------------------------------- */
  const quizData = [
    {
      id: 1,
      from: "جوائز كبرى",
      address: "winner@promo.example.test",
      time: "الآن",
      subject: "أنت الفائز بجهاز جديد!",
      body: "تهانينا! تم اختيارك للفوز بجهاز لوحي ضمن حملة خاصة. أكمل بياناتك خلال 10 دقائق لاستلام الجائزة.",
      link: "https://prize-claim.example.test/claim?id=winner",
      correct: "suspicious",
      why: "لم تشارك في أي سحب، والمهلة القصيرة أسلوب ضغط نفسي. الرابط يطلب بياناتك مقابل جائزة، والنطاق لا يتبع أي جهة معروفة.",
      wrong: "الرسالة ليست آمنة: جائزة لم تشارك فيها + مهلة 10 دقائق + طلب بيانات = مزيج كلاسيكي للتصيد. لا يوجد سبب مشروع لطلب بياناتك الشخصية مقابل جائزة.",
      signs: ["جائزة غير متوقعة", "استعجال", "طلب بيانات", "نطاق غريب"],
      signsTitle: "علامات التحذير",
      rule: "لا توجد جائزة حقيقية تحتاج كلمة مرورك أو بيانات بطاقتك لتصلك.",
    },
    {
      id: 2,
      from: "الدعم الفني",
      address: "security@account-verify.example.test",
      time: "الآن",
      subject: "تنبيه أمني: سيُغلق حسابك خلال 24 ساعة",
      body: "لاحظنا نشاطًا غير معتاد على حسابك. لتجنّب إغلاق الحساب، سجّل الدخول وأكّد هويتك عبر الرابط التالي.",
      link: "https://secure-login.example.test/verify",
      correct: "suspicious",
      why: "التهديد بإغلاق الحساب خلال 24 ساعة أسلوب ضغط نفسي. طلب تسجيل الدخول من رابط في رسالة علامة خطر، والنطاق يوحي بالأمان لكنه ليس نطاق الجهة. افتح التطبيق الرسمي وتحقق بنفسك.",
      wrong: "قد يبدو التنبيه رسميًا، لكن التهديد بإغلاق الحساب وطلب تسجيل الدخول من رابط هما علامتا خطر واضحتان. الجهات الموثوقة تطلب منك فتح تطبيقها مباشرة، لا اتباع رابط في رسالة.",
      signs: ["تهديد واستعجال", "طلب تسجيل دخول", "نطاق مقلّد", "مرسل مجهول"],
      signsTitle: "علامات التحذير",
      rule: "لا تسجّل الدخول من رابط وصلك؛ افتح التطبيق أو اكتب العنوان بنفسك.",
    },
    {
      id: 3,
      from: "منسّق الورشة — جامعة خيالية",
      address: "workshop@example.test",
      time: "اليوم",
      subject: "تذكير: ورشة الأمن الرقمي غدًا",
      body: "مرحبًا، تذكير بأن ورشة الأمن الرقمي ستبدأ غدًا الساعة 10:00 في القاعة 3. لا حاجة لأي إجراء، ويمكنك مراجعة جدولك عبر بوابة الجامعة الرسمية.",
      link: null,
      correct: "safe",
      why: "لا يوجد رابط للضغط، ولا طلب بيانات أو دفع أو استعجال. الرسالة تذكير عادي ويمكن التحقق من الجدول عبر البوابة الرسمية. ومع ذلك، يبقى التحقق من المرسل عند الشك.",
      wrong: "قد يبدو الحذر هنا مبررًا، لكن لا توجد مؤشرات خطر عملية: لا رابط، ولا طلب بيانات، ولا استعجال. الإجابة الأدق أن الرسالة تبدو آمنة — مع التحقق عند الشك.",
      signs: ["لا رابط", "لا طلب بيانات", "لا استعجال"],
      signsTitle: "لماذا تبدو آمنة",
      rule: "الحذر لا يعني الشك في كل شيء؛ لكنه يعني التحقق قبل الضغط.",
    },
  ];

  const quiz = {
    index: 0,
    answers: {},
    summary: false,
  };

  function answeredCount() {
    return Object.keys(quiz.answers).length;
  }

  function quizScore() {
    return quizData.reduce((score, question) => {
      const answer = quiz.answers[question.id];
      return score + (answer && answer.choice === question.correct ? 1 : 0);
    }, 0);
  }

  function updateQuizScore() {
    const score = quizScore();
    const answered = answeredCount();
    if (els.quizScoreValue) els.quizScoreValue.textContent = `${score} / ${quizData.length}`;
    if (els.quizScore) {
      els.quizScore.classList.toggle("is-complete", answered === quizData.length);
      const label = answered === quizData.length
        ? `نتيجتك النهائية ${score} من ${quizData.length}`
        : `نتيجتك ${score} من ${quizData.length}، وأجبت عن ${answered} من ${quizData.length}`;
      els.quizScore.setAttribute("aria-label", label);
    }
  }

  function renderQuizTabs() {
    if (!els.quizTabs) return;
    const tabs = quizData.map((question, index) => {
      const answer = quiz.answers[question.id];
      let statusClass = "";
      if (answer) {
        statusClass = answer.choice === question.correct ? " is-correct" : " is-wrong";
      }
      const selected = !quiz.summary && quiz.index === index;
      return `
        <button class="quiz__tab${statusClass}" type="button" role="tab"
          id="quizTab${index}" aria-controls="quizStage" aria-selected="${selected}"
          data-q="${index}" aria-label="الرسالة ${index + 1}${answer ? (answer.choice === question.correct ? " — إجابة صحيحة" : " — إجابة غير دقيقة") : ""}">
          ${index + 1}
        </button>`;
    }).join("");

    const resultTab = answeredCount() === quizData.length
      ? `<button class="quiz__tab quiz__tab--result" type="button" role="tab"
           aria-selected="${quiz.summary}" data-summary="true">
           <svg class="ico" aria-hidden="true"><use href="#i-check"></use></svg>
           النتيجة
         </button>`
      : "";

    els.quizTabs.innerHTML = tabs + resultTab;
  }

  function feedbackMarkup(question, isCorrect, picked) {
    const correctLabel = question.correct === "suspicious" ? "مشبوهة" : "تبدو آمنة";
    return `
      <div class="feedback${isCorrect ? "" : " feedback--wrong"}">
        <div class="feedback__head">
          <span class="feedback__icon">
            <svg class="ico" aria-hidden="true"><use href="#i-${isCorrect ? "check" : "alert"}"></use></svg>
          </span>
          <div>
            <h3 class="feedback__title" tabindex="-1">${isCorrect ? "أحسنت — التقييم صحيح" : "ليست الإجابة الأدق"}</h3>
            <span>${isCorrect ? "إجابة صحيحة" : `الإجابة الأدق: ${correctLabel}`}</span>
          </div>
        </div>
        <p class="feedback__why">${escapeHtml(isCorrect ? question.why : question.wrong)}</p>
        <div class="feedback__signs">
          <span class="chip ${question.correct === "suspicious" ? "chip--warn" : "chip--ok"}">${escapeHtml(question.signsTitle)}</span>
          ${question.signs.map((sign) => `<span>${escapeHtml(sign)}</span>`).join("")}
        </div>
        <p class="feedback__rule"><strong>القاعدة:</strong> ${escapeHtml(question.rule)}</p>
      </div>`;
  }

  function renderQuestion() {
    const question = quizData[quiz.index];
    const answer = quiz.answers[question.id];
    const picked = answer ? answer.choice : null;
    const isCorrect = Boolean(answer && picked === question.correct);
    const allAnswered = answeredCount() === quizData.length;

    const linkBlock = question.link
      ? `<div class="mail__link">
           <svg class="ico" aria-hidden="true"><use href="#i-link"></use></svg>
           <span>${escapeHtml(question.link)}</span>
         </div>`
      : `<div class="mail__safe-note">
           <svg class="ico" aria-hidden="true"><use href="#i-check"></use></svg>
           <span>لا يوجد رابط في هذه الرسالة — مجرد تذكير بلا إجراء مطلوب</span>
         </div>`;

    const footer = answer
      ? `<div class="quiz__foot">
           <span class="quiz__result-note">
             <svg class="ico" aria-hidden="true"><use href="#i-shield"></use></svg>
             شرح الإجابة ظاهر أعلاه
           </span>
           <button class="btn btn--primary" type="button" data-action="next">
             ${quiz.index === quizData.length - 1 || allAnswered ? "اعرض النتيجة" : "الرسالة التالية"}
             <svg class="ico" aria-hidden="true"><use href="#i-arrow-left"></use></svg>
           </button>
         </div>`
      : `<div class="quiz__foot">
           <span class="quiz__result-note">
             <svg class="ico" aria-hidden="true"><use href="#i-eye"></use></svg>
             اقرأ الرسالة جيدًا قبل الاختيار
           </span>
           <span class="quiz__result-note">${quiz.index + 1} من ${quizData.length}</span>
         </div>`;

    els.quizStage.innerHTML = `
      <article class="mail" aria-label="رسالة خيالية رقم ${quiz.index + 1}">
        <div class="mail__head">
          <span class="mail__avatar" aria-hidden="true">؟</span>
          <div class="mail__who">
            <strong>${escapeHtml(question.from)}</strong>
            <small dir="ltr">${escapeHtml(question.address)}</small>
          </div>
          <div class="mail__meta">
            <span class="chip chip--warn">رسالة خيالية</span>
            <span class="mail__time">${escapeHtml(question.time)}</span>
          </div>
        </div>
        <h3 class="mail__subject">${escapeHtml(question.subject)}</h3>
        <p class="mail__body">${escapeHtml(question.body)}</p>
        ${linkBlock}
      </article>

      <div class="quiz__choices">
        <p class="quiz__prompt">ما تقييمك لهذه الرسالة؟</p>
        <div class="choice-row">
          <button class="choice choice--danger${picked === "suspicious" ? " is-picked" : ""}" type="button"
            data-choice="suspicious" aria-pressed="${picked === "suspicious"}" ${answer ? "disabled" : ""}>
            <svg class="ico" aria-hidden="true"><use href="#i-alert"></use></svg>
            مشبوهة
          </button>
          <button class="choice choice--ok${picked === "safe" ? " is-picked" : ""}" type="button"
            data-choice="safe" aria-pressed="${picked === "safe"}" ${answer ? "disabled" : ""}>
            <svg class="ico" aria-hidden="true"><use href="#i-check"></use></svg>
            تبدو آمنة
          </button>
        </div>
      </div>

      ${answer ? feedbackMarkup(question, isCorrect, picked) : ""}
      ${footer}
    `;

    if (els.quizStage) {
      els.quizStage.setAttribute("role", "tabpanel");
      els.quizStage.setAttribute("aria-labelledby", `quizTab${quiz.index}`);
    }
  }

  function renderSummary() {
    const score = quizScore();
    const percent = Math.round((score / quizData.length) * 100);
    const messages = {
      3: {
        title: "ممتاز — عينك صارت أدق",
        text: "التقطت كل الإشارات. أفضل حماية ليست الخوف من كل رسالة، بل التحقق قبل الضغط.",
      },
      2: {
        title: "قريب جدًا",
        text: "أحد التقييمات لم يكن دقيقًا. راجع الاستعجال، وطلب البيانات، والنطاق الغريب قبل أن تقرر.",
      },
      1: {
        title: "لنراجع معًا",
        text: "بعض الرسائل مصممة لتبدو رسمية. أعد الاختبار وركّز على الرابط، والطلب، والمهلة الزمنية.",
      },
      0: {
        title: "هذه فرصة للتعلّم",
        text: "لا مشكلة — الوعي يُبنى بالتدريب. أعد الاختبار واقرأ تفسير كل إجابة بهدوء.",
      },
    };
    const message = messages[score] || messages[0];

    els.quizStage.innerHTML = `
      <div class="quiz-summary">
        <div class="score-ring" style="--p:${percent}" role="img" aria-label="النتيجة ${score} من ${quizData.length}">
          <span>${score}<small>/ ${quizData.length}</small></span>
        </div>
        <div class="quiz-summary__body">
          <h3>${escapeHtml(message.title)}</h3>
          <p>${escapeHtml(message.text)}</p>
          <div class="quiz-summary__actions">
            <button class="btn btn--ghost" type="button" data-action="review">راجع الرسائل</button>
            <button class="btn btn--ghost" type="button" data-action="reset">
              <svg class="ico" aria-hidden="true"><use href="#i-refresh"></use></svg>
              أعد الاختبار
            </button>
            <button class="btn btn--primary" type="button" data-action="finish">
              إلى الخلاصة
              <svg class="ico" aria-hidden="true"><use href="#i-arrow-left"></use></svg>
            </button>
          </div>
        </div>
      </div>`;

    if (els.quizStage) {
      els.quizStage.removeAttribute("role");
      els.quizStage.removeAttribute("aria-labelledby");
    }
  }

  function renderQuiz() {
    renderQuizTabs();
    if (quiz.summary) renderSummary();
    else renderQuestion();
    updateQuizScore();
  }

  function answerQuestion(choice) {
    const question = quizData[quiz.index];
    if (quiz.answers[question.id]) return;
    if (choice !== "suspicious" && choice !== "safe") return;
    quiz.answers[question.id] = { choice };
    quiz.summary = false;
    renderQuiz();

    const title = $(".feedback__title", els.quizStage);
    if (title) {
      setTimeout(() => title.focus({ preventScroll: true }), 60);
    }
    const feedback = $(".feedback", els.quizStage);
    if (feedback) {
      setTimeout(() => {
        feedback.scrollIntoView({ block: "start" });
      }, 60);
    }
  }

  function goToQuiz() {
    if (introActive) return;
    goToSlide(6);
  }

  function resetQuiz() {
    quiz.index = 0;
    quiz.answers = {};
    quiz.summary = false;
    renderQuiz();
    scrollQuizTop();
  }

  function scrollQuizTop() {
    const slide = slides[current];
    if (slide) slide.scrollTop = 0;
  }

  /* ---------------------------------------------------------------------
     6. ملء الشاشة
     --------------------------------------------------------------------- */
  async function toggleFullscreen() {
    const root = document.documentElement;
    if (!root.requestFullscreen) {
      showToast("ملء الشاشة غير مدعوم في هذا المتصفح — جرّب F11");
      return;
    }
    try {
      if (!document.fullscreenElement) {
        await root.requestFullscreen();
        showToast("وضع ملء الشاشة مفعّل — مناسب للبروجكتر");
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      showToast("تعذر تفعيل ملء الشاشة — جرّب F11");
    }
  }

  function updateFullscreenUI() {
    const active = Boolean(document.fullscreenElement);
    [els.fullscreenBtn, els.fullscreenBtn2].forEach((button) => {
      if (!button) return;
      const use = button.querySelector("use");
      if (use) use.setAttribute("href", active ? "#i-compress" : "#i-expand");
      button.setAttribute("aria-label", active ? "إنهاء ملء الشاشة" : "ملء الشاشة");
      button.title = active ? "إنهاء ملء الشاشة (F)" : "ملء الشاشة (F)";
    });
  }

  /* ---------------------------------------------------------------------
     7. دليل الاستخدام
     --------------------------------------------------------------------- */
  function openHelp() {
    if (!els.helpDialog) return;
    if (typeof els.helpDialog.showModal === "function" && !els.helpDialog.open) {
      els.helpDialog.showModal();
    } else if (!els.helpDialog.open) {
      els.helpDialog.setAttribute("open", "");
    }
  }

  function closeHelp() {
    if (!els.helpDialog) return;
    if (typeof els.helpDialog.close === "function" && els.helpDialog.open) {
      els.helpDialog.close();
    } else {
      els.helpDialog.removeAttribute("open");
    }
  }

  /* ---------------------------------------------------------------------
     8. ربط الأحداث
     --------------------------------------------------------------------- */
  function bindEvents() {
    els.nextBtn.addEventListener("click", nextSlide);
    els.prevBtn.addEventListener("click", previousSlide);
    els.quizBtn.addEventListener("click", goToQuiz);
    els.restartBtn.addEventListener("click", restartPresentation);
    els.soundToggle.addEventListener("click", toggleSound);
    els.introSound.addEventListener("click", toggleSound);
    if (els.reduceMotion) {
      els.reduceMotion.addEventListener("click", () => setMotionReduced(!motionReduced, true));
    }
    els.fullscreenBtn.addEventListener("click", toggleFullscreen);
    if (els.fullscreenBtn2) els.fullscreenBtn2.addEventListener("click", toggleFullscreen);
    els.helpBtn.addEventListener("click", openHelp);
    els.closeHelp.addEventListener("click", closeHelp);
    els.closeHelp2.addEventListener("click", closeHelp);

    document.addEventListener("fullscreenchange", updateFullscreenUI);

    els.helpDialog.addEventListener("click", (event) => {
      if (event.target === els.helpDialog) closeHelp();
    });

    els.skipIntro.addEventListener("click", skipToReveal);
    els.replayIntro.addEventListener("click", startIntro);
    els.startShow.addEventListener("click", () => finishIntro(0));
    els.revealQuiz.addEventListener("click", () => finishIntro(6));

    document.addEventListener("click", (event) => {
      const nextTrigger = event.target.closest("[data-next]");
      if (nextTrigger) {
        nextSlide();
        return;
      }
      const quizTrigger = event.target.closest("[data-quiz]");
      if (quizTrigger) {
        goToQuiz();
        return;
      }
      const replayTrigger = event.target.closest("[data-replay]");
      if (replayTrigger) {
        restartPresentation();
        return;
      }
      const gotoTrigger = event.target.closest("[data-goto]");
      if (gotoTrigger) {
        goToSlide(Number(gotoTrigger.dataset.goto));
      }
    });

    els.quizTabs.addEventListener("click", (event) => {
      const resultTab = event.target.closest("[data-summary]");
      if (resultTab) {
        quiz.summary = true;
        renderQuiz();
        scrollQuizTop();
        return;
      }
      const tab = event.target.closest("[data-q]");
      if (!tab) return;
      quiz.index = Number(tab.dataset.q);
      quiz.summary = false;
      renderQuiz();
      scrollQuizTop();
    });

    els.quizStage.addEventListener("click", (event) => {
      const choice = event.target.closest("[data-choice]");
      if (choice) {
        answerQuestion(choice.dataset.choice);
        return;
      }
      const action = event.target.closest("[data-action]");
      if (!action) return;

      if (action.dataset.action === "next") {
        const allAnswered = answeredCount() === quizData.length;
        if (allAnswered) {
          quiz.summary = true;
          renderQuiz();
        } else {
          quiz.index = Math.min(quizData.length - 1, quiz.index + 1);
          renderQuiz();
        }
        scrollQuizTop();
      } else if (action.dataset.action === "reset") {
        resetQuiz();
      } else if (action.dataset.action === "review") {
        quiz.summary = false;
        quiz.index = 0;
        renderQuiz();
        scrollQuizTop();
      } else if (action.dataset.action === "finish") {
        goToSlide(totalSlides - 1);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (els.helpDialog.open) return;

      if (introActive) {
        if (event.key === "Escape") {
          event.preventDefault();
          skipToReveal();
        }
        return;
      }

      const tag = (document.activeElement && document.activeElement.tagName || "").toLowerCase();
      const isFormField = tag === "input" || tag === "textarea" || tag === "select";
      if (isFormField) return;

      if ((event.key === " " || event.key === "Enter") && (tag === "button" || tag === "a")) {
        return;
      }

      switch (event.key) {
        case "ArrowLeft":
        case "PageDown":
        case " ":
          event.preventDefault();
          nextSlide();
          break;
        case "ArrowRight":
        case "PageUp":
          event.preventDefault();
          previousSlide();
          break;
        case "Home":
          event.preventDefault();
          goToSlide(0);
          break;
        case "End":
          event.preventDefault();
          goToSlide(totalSlides - 1);
          break;
        case "f":
        case "F":
          event.preventDefault();
          toggleFullscreen();
          break;
        case "m":
        case "M":
          event.preventDefault();
          toggleSound();
          break;
        case "r":
        case "R":
          event.preventDefault();
          restartPresentation();
          break;
        case "?":
          event.preventDefault();
          openHelp();
          break;
        case "Escape":
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
          break;
        default:
          break;
      }
    });

    // التمرير باللمس (يمين/يسار) على الجوال
    let touchStart = null;
    els.deck.addEventListener("touchstart", (event) => {
      if (introActive || event.touches.length !== 1) return;
      const touch = event.touches[0];
      touchStart = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    }, { passive: true });

    els.deck.addEventListener("touchend", (event) => {
      if (!touchStart || introActive) {
        touchStart = null;
        return;
      }
      const touch = event.changedTouches[0];
      const dx = touch.clientX - touchStart.x;
      const dy = touch.clientY - touchStart.y;
      const elapsed = Date.now() - touchStart.time;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.4 && elapsed < 850) {
        if (dx < 0) nextSlide();
        else previousSlide();
      }
      touchStart = null;
    }, { passive: true });

    // توهّج يتبع المؤشر على الأجهزة المكتبية فقط
    if (window.matchMedia("(hover: hover)").matches) {
      let glowFrame = null;
      let lastX = 0;
      let lastY = 0;
      document.addEventListener("pointermove", (event) => {
        lastX = event.clientX;
        lastY = event.clientY;
        if (glowFrame) return;
        glowFrame = requestAnimationFrame(() => {
          const x = (lastX / window.innerWidth) * 100;
          const y = (lastY / window.innerHeight) * 100;
          document.documentElement.style.setProperty("--mx", `${x}%`);
          document.documentElement.style.setProperty("--my", `${y}%`);
          glowFrame = null;
        });
      }, { passive: true });
    }

    slides.forEach((slide) => {
      slide.addEventListener("scroll", scheduleScrollCue, { passive: true });
    });
    window.addEventListener("resize", scheduleScrollCue, { passive: true });
    window.addEventListener("orientationchange", scheduleScrollCue, { passive: true });

    let hiddenAt = 0;
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        if (introRunning) hiddenAt = performance.now();
        return;
      }
      // لا نتخطّى المقدمة إذا كانت الصفحة مخفية لثوانٍ قصيرة (تنبيه أو مكالمة سريعة).
      // عند العودة بعد غياب أطول، نعرض لحظة الكشف بدل ترك المستخدم عالقًا.
      if (introRunning && hiddenAt && performance.now() - hiddenAt > 5000) {
        showIntroReveal();
      }
      hiddenAt = 0;
    });
  }

  /* ---------------------------------------------------------------------
     9. التشغيل
     --------------------------------------------------------------------- */
  function init() {
    els.counterTotal.textContent = String(totalSlides);
    updateUI();
    renderQuiz();
    setMotionReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches, false);
    setSoundState(true, false);
    bindEvents();

    if (!document.documentElement.requestFullscreen) {
      if (els.fullscreenBtn) els.fullscreenBtn.title = "ملء الشاشة غير مدعوم — جرّب F11";
    }

    startIntro();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
