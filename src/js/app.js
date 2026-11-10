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
    return u === "kmֻǱ˞