#!/usr/bin/env python3
"""racepace - small, dependency-free race pace helpers.

Units: distances in metres internally; one international mile = 1609.344 m
(NIST Handbook 44, Appendix C; World Athletics Technical Rule 55 "Road Mile (1609.344m)").

Usage examples:
  python tools/racepace.py pace --distance marathon --time 3:30:00
  python tools/racepace.py time --distance 10k --pace 8:00 --unit mi
  python tools/racepace.py splits --distance half --time 1:45:00 --unit km
  python tools/racepace.py runwalk --distance 5k --run-min 3 --walk-min 1 --run-pace 6:00 --walk-pace 10:00 --unit km
  python tools/racepace.py predict --distance 10k --time 50:00 --target marathon
"""
import argparse
import math
import sys

MILE_M = 1609.344
KM_M = 1000.0
# World Athletics Technical Rule 55: marathon 42.195 km; half marathon is half of that.
DISTANCES_M = {
    "mile": MILE_M,
    "5k": 5000.0,
    "10k": 10000.0,
    "half": 21097.5,
    "marathon": 42195.0,
}
UNIT_M = {"km": KM_M, "mi": MILE_M}


def parse_time(text):
    """'h:mm:ss', 'mm:ss' or plain seconds -> seconds (float)."""
    parts = [float(p) for p in str(text).strip().split(":")]
    if len(parts) > 3 or any(p < 0 for p in parts):
        raise ValueError(f"bad time: {text}")
    seconds = 0.0
    for p in parts:
        seconds = seconds * 60 + p
    return seconds


def fmt_time(seconds, force_hours=False):
    seconds = int(math.floor(seconds + 0.5))  # round half up
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    if h or force_hours:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


def parse_distance(text, unit="km"):
    key = str(text).strip().lower()
    if key in DISTANCES_M:
        return DISTANCES_M[key]
    return float(key) * UNIT_M[unit]


def pace_per_unit(total_seconds, distance_m, unit):
    """Pace = time / distance, expressed in seconds per km or per mile."""
    return total_seconds / (distance_m / UNIT_M[unit])


def finish_time(pace_seconds, distance_m, unit):
    """Finish time = pace x distance."""
    return pace_seconds * (distance_m / UNIT_M[unit])


def splits(total_seconds, distance_m, unit):
    """Even-pace cumulative split at every whole km/mile, plus the finish."""
    step = UNIT_M[unit]
    out = []
    n = int(math.floor(distance_m / step + 1e-9))
    for i in range(1, n + 1):
        out.append((i * step, total_seconds * i * step / distance_m))
    if abs(n * step - distance_m) > 1e-6:
        out.append((distance_m, total_seconds))
    return out


def run_walk_average(run_min, walk_min, run_pace_s, walk_pace_s):
    """Average pace over one run/walk cycle.

    Distance covered in the cycle = run_time / run_pace + walk_time / walk_pace,
    so the average pace is cycle_time / cycle_distance (a time-weighted
    harmonic mean of the two paces), not a simple time-weighted mean.
    """
    run_s, walk_s = run_min * 60.0, walk_min * 60.0
    dist_units = run_s / run_pace_s + walk_s / walk_pace_s
    return (run_s + walk_s) / dist_units


def riegel(t1_seconds, d1_m, d2_m, exponent=1.06):
    """Riegel (1981) endurance model T2 = T1 * (D2/D1) ** b.

    b = 1.06 is the exponent commonly used in race predictors; it is an
    approximation, not a law. Predictions get less reliable the further the
    target distance is from the input race.
    """
    return t1_seconds * (d2_m / d1_m) ** exponent


def main(argv=None):
    ap = argparse.ArgumentParser(description="Race pace helpers")
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("pace", help="pace from distance and time")
    p.add_argument("--distance", required=True, help="5k, 10k, half, marathon, mile, or a number in --unit")
    p.add_argument("--time", required=True)
    p.add_argument("--unit", choices=UNIT_M, default="km")

    t = sub.add_parser("time", help="finish time from distance and pace")
    t.add_argument("--distance", required=True)
    t.add_argument("--pace", required=True, help="mm:ss per --unit")
    t.add_argument("--unit", choices=UNIT_M, default="km")

    s = sub.add_parser("splits", help="even-pace splits")
    s.add_argument("--distance", required=True)
    s.add_argument("--time", required=True)
    s.add_argument("--unit", choices=UNIT_M, default="km")

    r = sub.add_parser("runwalk", help="run/walk interval average pace")
    r.add_argument("--distance", required=True)
    r.add_argument("--run-min", type=float, required=True)
    r.add_argument("--walk-min", type=float, required=True)
    r.add_argument("--run-pace", required=True)
    r.add_argument("--walk-pace", required=True)
    r.add_argument("--unit", choices=UNIT_M, default="km")

    q = sub.add_parser("predict", help="Riegel race-time estimate")
    q.add_argument("--distance", required=True)
    q.add_argument("--time", required=True)
    q.add_argument("--target", required=True)
    q.add_argument("--exponent", type=float, default=1.06)
    q.add_argument("--unit", choices=UNIT_M, default="km")

    a = ap.parse_args(argv)
    if a.cmd == "pace":
        d = parse_distance(a.distance, a.unit)
        sec = parse_time(a.time)
        for u in ("km", "mi"):
            print(f"pace /{u}: {fmt_time(pace_per_unit(sec, d, u))}")
        print(f"speed: {d / 1000 / (sec / 3600):.2f} km/h, {d / MILE_M / (sec / 3600):.2f} mph")
    elif a.cmd == "time":
        d = parse_distance(a.distance, a.unit)
        print(fmt_time(finish_time(parse_time(a.pace), d, a.unit), force_hours=True))
    elif a.cmd == "splits":
        d = parse_distance(a.distance, a.unit)
        sec = parse_time(a.time)
        for dist, cum in splits(sec, d, a.unit):
            print(f"{dist / UNIT_M[a.unit]:8.3f} {a.unit}  {fmt_time(cum, force_hours=True)}")
    elif a.cmd == "runwalk":
        d = parse_distance(a.distance, a.unit)
        avg = run_walk_average(a.run_min, a.walk_min, parse_time(a.run_pace), parse_time(a.walk_pace))
        print(f"average pace /{a.unit}: {fmt_time(avg)}")
        print(f"estimated finish: {fmt_time(finish_time(avg, d, a.unit), force_hours=True)}")
    elif a.cmd == "predict":
        d1 = parse_distance(a.distance, a.unit)
        d2 = parse_distance(a.target, a.unit)
        print(fmt_time(riegel(parse_time(a.time), d1, d2, a.exponent), force_hours=True))
    return 0


if __name__ == "__main__":
    sys.exit(main())
