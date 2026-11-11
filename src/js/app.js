(function () {
  var KM_PER_MILE = 1.609344;
  var PRESETS = {
    "5k": { miles: 3.106855961, km: 5 },
    "10k": { miles: 6.213711922, km: 10 },
    "half": { miles: 13.109375, km: 21.0975 },
    "marathon": { miles: 26.21875, km: 42.195 },
    "mile": { miles: 1, km: 1.609344 },
    "custom": null
  };

  function $(id) { return document.getElementById(id); }
  function num(id, fallback) {
    var el = $(id);
    if (!el) return fallback;
    var v = parseFloat(String(el.value).replace(/,/g, ""));
    return isFinite(v) ? v : fallback;
  }
  function setText(id, text) {
    var el = $(id);
    if (el) el.textContent = text;
  }
  function pad2(n) { return String(Math.floor(n)).padStart(2, "0"); }

  function parseHMS(h, m, s) {
    h = Math.max(0, h || 0);
    m = Math.max(0, m || 0);
    s = Math.max(0, s || 0);
    return h * 3600 + m * 60 + s;
  }

  function formatHMS(totalSeconds) {
    if (!isFinite(totalSeconds) || totalSeconds < 0) return "—";
    totalSeconds = Math.round(totalSeconds);
    var h = Math.floor(totalSeconds / 3600);
    var m = Math.floor((totalSeconds % 3600) / 60);
    var s = totalSeconds % 60;
    if (h > 0) return h + ":" + pad2(m) + ":" + pad2(s);
    return m + ":" + pad2(s);
  }

  function formatPace(secondsPerUnit) {
    if (!isFinite(secondsPerUnit) || secondsPerUnit <= 0) return "—";
    return formatHMS(secondsPerUnit);
  }

  function unitLabel() {
    var u = document.body.getAttribute("data-unit") || "miles";
    return u === "km" ? "km" : "mi";
  }

  function getUnit() {
    return document.body.getAttribute("data-unit") || "miles";
  }

  function setUnit(u) {
    document.body.setAttribute("data-unit", u);
    document.querySelectorAll("[data-unit-btn]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-unit-btn") === u ? "true" : "false");
    });
    document.querySelectorAll("[data-unit-label]").forEach(function (el) {
      el.textContent = u === "km" ? "km" : "mi";
    });
    // Keep physical distances and input paces consistent when changing units.
    ["tm-distance", "bike-distance", "rw-distance"].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      var previousUnit = el.dataset.lastUnit || "miles";
      var value = parseFloat(el.value);
      if (previousUnit !== u && isFinite(value) && value >= 0) {
        el.value = (u === "km" ? value * KM_PER_MILE : value / KM_PER_MILE).toFixed(3);
      }
      el.dataset.lastUnit = u;
    });
    ["pace-min", "pace-sec", "tm-pace-min", "tm-pace-sec", "rw-run-pace-min", "rw-run-pace-sec", "rw-walk-pace-min", "rw-walk-pace-sec"].forEach(function (id) {
      var el = $(id);
      if (el && !el.dataset.lastUnit) el.dataset.lastUnit = "miles";
    });
    [["pace-min", "pace-sec"], ["tm-pace-min", "tm-pace-sec"], ["rw-run-pace-min", "rw-run-pace-sec"], ["rw-walk-pace-min", "rw-walk-pace-sec"]].forEach(function (pair) {
      var min = $(pair[0]), sec = $(pair[1]);
      if (!min || !sec) return;
      if (min.dataset.lastUnit !== u) {
        var pace = parseHMS(0, num(pair[0], 0), num(pair[1], 0));
        if (pace > 0) {
          var converted = Math.round(u === "km" ? pace / KM_PER_MILE : pace * KM_PER_MILE);
          min.value = Math.floor(converted / 60);
          sec.value = converted % 60;
        }
      }
      min.dataset.lastUnit = u;
      sec.dataset.lastUnit = u;
    });
    var dist = $("distance");
    if (dist && dist.dataset.lastUnit && dist.dataset.lastUnit !== u) {
      var v = parseFloat(dist.value);
      if (isFinite(v) && v > 0) {
        dist.value = u === "km" ? (v * KM_PER_MILE).toFixed(3) : (v / KM_PER_MILE).toFixed(3);
      }
    }
    if (dist) dist.dataset.lastUnit = u;
    calc();
  }

  function getMode() {
    return document.body.getAttribute("data-calc-mode") || "pace";
  }

  function setMode(mode) {
    document.body.setAttribute("data-calc-mode", mode);
    document.querySelectorAll("[data-mode-btn]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-mode-btn") === mode ? "true" : "false");
    });
    var showDistance = mode !== "distance";
    var showTime = mode !== "time";
    var showPace = mode !== "pace";
    var distBlock = $("block-distance");
    var timeBlock = $("block-time");
    var paceBlock = $("block-pace");
    if (distBlock) distBlock.classList.toggle("hidden", !showDistance && mode === "distance");
    // Always show two of three inputs based on mode:
    // pace mode: distance + time -> pace
    // finish mode: distance + pace -> time
    // distance mode: time + pace -> distance
    if (distBlock) distBlock.classList.toggle("hidden", mode === "distance");
    if (timeBlock) timeBlock.classList.toggle("hidden", mode === "finish");
    if (paceBlock) paceBlock.classList.toggle("hidden", mode === "pace");
    calc();
  }

  function applyPreset(key) {
    var p = PRESETS[key];
    var dist = $("distance");
    if (!dist) return;
    if (!p) {
      dist.focus();
      return;
    }
    var u = getUnit();
    dist.value = (u === "km" ? p.km : p.miles).toFixed(u === "km" ? 3 : 4);
    dist.dataset.lastUnit = u;
    calc();
  }

  function calc() {
    if (!$("out-pace") && !$("out-primary")) return;
    var mode = getMode();
    var unit = getUnit();
    var distance = Math.max(0, num("distance", 0));
    var timeSec = parseHMS(num("hours", 0), num("minutes", 0), num("seconds", 0));
    var paceSec = parseHMS(0, num("pace-min", 0), num("pace-sec", 0));

    var pace, finish, distOut, note;

    if (mode === "pace") {
      if (distance <= 0 || timeSec <= 0) {
        renderEmpty("Enter distance and finish time.");
        return;
      }
      pace = timeSec / distance;
      finish = timeSec;
      distOut = distance;
      note = "Pace from distance ÷ time.";
    } else if (mode === "finish") {
      if (distance <= 0 || paceSec <= 0) {
        renderEmpty("Enter distance and target pace.");
        return;
      }
      pace = paceSec;
      finish = paceSec * distance;
      distOut = distance;
      note = "Finish time from pace × distance.";
    } else {
      if (timeSec <= 0 || paceSec <= 0) {
        renderEmpty("Enter time and pace.");
        return;
      }
      pace = paceSec;
      finish = timeSec;
      distOut = timeSec / paceSec;
      note = "Distance from time ÷ pace.";
      var distEl = $("distance");
      if (distEl) distEl.value = distOut.toFixed(3);
    }

    var label = unit === "km" ? "/km" : "/mi";
    var speed = pace > 0 ? 3600 / pace : 0;
    var speedLabel = unit === "km" ? "km/h" : "mph";

    setText("out-pace", formatPace(pace) + " " + label);
    setText("out-finish", formatHMS(finish));
    setText("out-distance", (isFinite(distOut) ? distOut.toFixed(3) : "—") + " " + (unit === "km" ? "km" : "mi"));
    setText("out-speed", speed > 0 ? speed.toFixed(2) + " " + speedLabel : "—");
    setText("out-primary", formatPace(pace) + " " + label);
    setText("out-note", note);

    // splits table for common races if we have a pace
    renderSplits(pace, unit);
    renderEquivalent(pace, unit);
  }

  function renderEmpty(msg) {
    setText("out-pace", "—");
    setText("out-finish", "—");
    setText("out-distance", "—");
    setText("out-speed", "—");
    setText("out-primary", "—");
    setText("out-note", msg || "");
    var splits = $("splits-body");
    if (splits) splits.innerHTML = "";
  }

  function renderSplits(pacePerUnit, unit) {
    var body = $("splits-body");
    if (!body || !isFinite(pacePerUnit) || pacePerUnit <= 0) return;
    var rows = [];
    var maxUnits = unit === "km" ? 42 : 26;
    var step = 1;
    var limit = Math.min(maxUnits, 10);
    // show first 5 + half + marathon markers via race presets instead
    for (var i = 1; i <= 5; i++) {
      rows.push({ label: i + " " + (unit === "km" ? "km" : "mi"), sec: pacePerUnit * i });
    }
    var races = [
      { name: "5K", km: 5, miles: 3.106855961 },
      { name: "10K", km: 10, miles: 6.213711922 },
      { name: "Half", km: 21.0975, miles: 13.109375 },
      { name: "Marathon", km: 42.195, miles: 26.21875 }
    ];
    races.forEach(function (r) {
      var d = unit === "km" ? r.km : r.miles;
      rows.push({ label: r.name + " (" + d.toFixed(unit === "km" ? 1 : 2) + ")", sec: pacePerUnit * d });
    });
    body.innerHTML = rows.map(function (r) {
      return "<tr><td>" + r.label + "</td><td>" + formatHMS(r.sec) + "</td></tr>";
    }).join("");
  }

  function renderEquivalent(pacePerUnit, unit) {
    var el = $("out-equiv");
    if (!el || !isFinite(pacePerUnit) || pacePerUnit <= 0) return;
    // convert pace to the other unit
    if (unit === "miles") {
      var perKm = pacePerUnit / KM_PER_MILE;
      el.textContent = formatPace(perKm) + " /km";
    } else {
      var perMi = pacePerUnit * KM_PER_MILE;
      el.textContent = formatPace(perMi) + " /mi";
    }
  }

  // Treadmill: incline-adjusted effort (simple rule of thumb: +1% incline ≈ +15–20 sec/mi effort)
  function calcTreadmill() {
    if (!$("tm-out-pace")) return;
    var unit = getUnit();
    var paceSec = parseHMS(0, num("tm-pace-min", 0), num("tm-pace-sec", 0));
    var incline = Math.max(0, num("tm-incline", 0));
    var distance = Math.max(0, num("tm-distance", 0));
    if (paceSec <= 0) {
      setText("tm-out-pace", "—");
      setText("tm-out-effort", "—");
      setText("tm-out-finish", "—");
      setText("tm-out-note", "Enter treadmill pace.");
      return;
    }
    // Rough outdoor-equivalent: each 1% incline adds ~12 sec/km or ~20 sec/mi of effort
    var addPer = unit === "km" ? 12 : 20;
    var effortPace = paceSec + incline * addPer;
    var finish = distance > 0 ? paceSec * distance : 0;
    setText("tm-out-pace", formatPace(paceSec) + (unit === "km" ? " /km" : " /mi"));
    setText("tm-out-effort", formatPace(effortPace) + (unit === "km" ? " /km equiv." : " /mi equiv."));
    setText("tm-out-finish", distance > 0 ? formatHMS(finish) : "—");
    setText("tm-out-note", "Rule of thumb only: ~" + addPer + "s per " + (unit === "km" ? "km" : "mi") + " added per 1% incline for outdoor-equivalent effort.");
  }

  // Bike pace: distance + time -> speed (mph/kph) and pace
  function calcBike() {
    if (!$("bike-out-speed")) return;
    var unit = getUnit();
    var distance = Math.max(0, num("bike-distance", 0));
    var timeSec = parseHMS(num("bike-hours", 0), num("bike-minutes", 0), num("bike-seconds", 0));
    var speedIn = num("bike-speed", 0);
    var mode = document.body.getAttribute("data-bike-mode") || "speed";
    if (mode === "speed") {
      if (distance <= 0 || timeSec <= 0) {
        setText("bike-out-speed", "—");
        setText("bike-out-pace", "—");
        setText("bike-out-finish", "—");
        setText("bike-out-note", "Enter distance and ride time.");
        return;
      }
      var speed = distance / (timeSec / 3600);
      var pace = timeSec / distance;
      setText("bike-out-speed", speed.toFixed(2) + (unit === "km" ? " km/h" : " mph"));
      setText("bike-out-pace", formatPace(pace) + (unit === "km" ? " /km" : " /mi"));
      setText("bike-out-finish", formatHMS(timeSec));
      setText("bike-out-note", "Average speed from distance ÷ time.");
    } else {
      if (distance <= 0 || speedIn <= 0) {
        setText("bike-out-speed", "—");
        setText("bike-out-pace", "—");
        setText("bike-out-finish", "—");
        setText("bike-out-note", "Enter distance and target speed.");
        return;
      }
      var finish = (distance / speedIn) * 3600;
      var pace2 = finish / distance;
      setText("bike-out-speed", speedIn.toFixed(2) + (unit === "km" ? " km/h" : " mph"));
      setText("bike-out-pace", formatPace(pace2) + (unit === "km" ? " /km" : " /mi"));
      setText("bike-out-finish", formatHMS(finish));
      setText("bike-out-note", "Finish time from distance ÷ speed.");
    }
  }

  // Run-walk: run min + walk min intervals over distance
  function calcRunWalk() {
    if (!$("rw-out-pace")) return;
    var unit = getUnit();
    var distance = Math.max(0, num("rw-distance", 0));
    var runMin = Math.max(0, num("rw-run-min", 0));
    var walkMin = Math.max(0, num("rw-walk-min", 0));
    var runPace = parseHMS(0, num("rw-run-pace-min", 0), num("rw-run-pace-sec", 0));
    var walkPace = parseHMS(0, num("rw-walk-pace-min", 0), num("rw-walk-pace-sec", 0));
    if (distance <= 0 || (runMin + walkMin) <= 0 || runPace <= 0 || walkPace <= 0) {
      setText("rw-out-pace", "—");
      setText("rw-out-finish", "—");
      setText("rw-out-note", "Enter distance, run/walk intervals, and paces.");
      return;
    }
    var cycle = runMin + walkMin;
    var runFrac = runMin / cycle;
    var walkFrac = walkMin / cycle;
    // Intervals are time-weighted: distance covered = runTime/runPace + walkTime/walkPace.
    var avgPace = cycle / (runMin / runPace + walkMin / walkPace);
    var finish = avgPace * distance;
    setText("rw-out-pace", formatPace(avgPace) + (unit === "km" ? " /km" : " /mi"));
    setText("rw-out-finish", formatHMS(finish));
    setText("rw-out-run-share", Math.round(runFrac * 100) + "% run / " + Math.round(walkFrac * 100) + "% walk");
    setText("rw-out-note", "Average pace uses total interval time divided by distance covered.");
  }

  function bind() {
    document.querySelectorAll("[data-unit-btn]").forEach(function (btn) {
      btn.addEventListener("click", function () { setUnit(btn.getAttribute("data-unit-btn")); calcTreadmill(); calcBike(); calcRunWalk(); });
    });
    document.querySelectorAll("[data-mode-btn]").forEach(function (btn) {
      btn.addEventListener("click", function () { setMode(btn.getAttribute("data-mode-btn")); });
    });
    document.querySelectorAll("[data-preset]").forEach(function (btn) {
      btn.addEventListener("click", function () { applyPreset(btn.getAttribute("data-preset")); });
    });
    document.querySelectorAll("[data-bike-mode-btn]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var m = btn.getAttribute("data-bike-mode-btn");
        document.body.setAttribute("data-bike-mode", m);
        document.querySelectorAll("[data-bike-mode-btn]").forEach(function (b) {
          b.setAttribute("aria-pressed", b.getAttribute("data-bike-mode-btn") === m ? "true" : "false");
        });
        var speedBlock = $("bike-block-speed");
        var timeBlock = $("bike-block-time");
        if (speedBlock) speedBlock.classList.toggle("hidden", m === "speed");
        if (timeBlock) timeBlock.classList.toggle("hidden", m !== "speed");
        calcBike();
      });
    });
    ["distance","hours","minutes","seconds","pace-min","pace-sec"].forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener("input", calc);
    });
    ["tm-pace-min","tm-pace-sec","tm-incline","tm-distance"].forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener("input", calcTreadmill);
    });
    ["bike-distance","bike-hours","bike-minutes","bike-seconds","bike-speed"].forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener("input", calcBike);
    });
    ["rw-distance","rw-run-min","rw-walk-min","rw-run-pace-min","rw-run-pace-sec","rw-walk-pace-min","rw-walk-pace-sec"].forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener("input", calcRunWalk);
    });
    var calcBtn = $("calc-btn");
    if (calcBtn) calcBtn.addEventListener("click", function () { calc(); calcTreadmill(); calcBike(); calcRunWalk(); });
    var resetBtn = $("reset-btn");
    if (resetBtn) resetBtn.addEventListener("click", function () {
      var d = $("distance"); if (d) d.value = getUnit() === "km" ? "5" : "3.107";
      var h = $("hours"); if (h) h.value = "0";
      var m = $("minutes"); if (m) m.value = "28";
      var s = $("seconds"); if (s) s.value = "0";
      setMode("pace");
      calc();
    });

    // init
    var dist = $("distance");
    if (dist && !dist.dataset.lastUnit) dist.dataset.lastUnit = getUnit();
    if (document.body.getAttribute("data-page") === "home") {
      setMode(getMode());
      calc();
    }
    if (document.body.getAttribute("data-page") === "treadmill") calcTreadmill();
    if (document.body.getAttribute("data-page") === "bike") calcBike();
    if (document.body.getAttribute("data-page") === "runwalk") calcRunWalk();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
