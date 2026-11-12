#!/usr/bin/env python3
"""Regenerate every CSV in data/ from the formulas in racepace.py."""
import csv
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from racepace import DISTANCES_M, MILE_M, KM_M, fmt_time  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), "..", "data")
RACES = [("5k", "5K"), ("10k", "10K"), ("half", "Half marathon"), ("marathon", "Marathon")]


def write(name, header, rows):
    with open(os.path.join(ROOT, name), "w", newline="") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(header)
        w.writerows(rows)


def main():
    os.makedirs(ROOT, exist_ok=True)
    write(
        "race-distances.csv",
        ["race", "metres", "kilometres", "miles", "source"],
        [
            ["Road mile", 1609.344, 1.609344, 1, "World Athletics Technical Rule 55 (Road Mile 1609.344m); NIST HB44 App. C"],
            ["5K", 5000, 5, round(5000 / MILE_M, 5), "World Athletics Technical Rule 55 (5km)"],
            ["10K", 10000, 10, round(10000 / MILE_M, 5), "World Athletics Technical Rule 55 (10km)"],
            ["Half marathon", 21097.5, 21.0975, round(21097.5 / MILE_M, 5), "Half of the 42.195km marathon (World Athletics Technical Rule 55)"],
            ["Marathon", 42195, 42.195, round(42195 / MILE_M, 5), "World Athletics Technical Rule 55 (Marathon 42.195km)"],
        ],
    )
    # Finish times for a pace given per mile (5:00 to 15:00 in 15 s steps).
    rows = []
    for pace in range(300, 901, 15):
        rows.append([fmt_time(pace), fmt_time(pace * KM_M / MILE_M)] +
                    [fmt_time(pace * DISTANCES_M[k] / MILE_M, force_hours=True) for k, _ in RACES])
    write("pace-chart-per-mile.csv",
          ["pace_per_mile", "equivalent_pace_per_km"] + [f"{label.lower().replace(' ', '_')}_finish" for _, label in RACES], rows)
    # Finish times for a pace given per km (3:00 to 9:00 in 10 s steps).
    rows = []
    for pace in range(180, 541, 10):
        rows.append([fmt_time(pace), fmt_time(pace * MILE_M / KM_M)] +
                    [fmt_time(pace * DISTANCES_M[k] / KM_M, force_hours=True) for k, _ in RACES])
    write("pace-chart-per-km.csv",
          ["pace_per_km", "equivalent_pace_per_mile"] + [f"{label.lower().replace(' ', '_')}_finish" for _, label in RACES], rows)
    # Goal finish time -> required pace, one file per race.
    goals = {
        "5k": range(12 * 60, 60 * 60 + 1, 60),
        "10k": range(25 * 60, 2 * 3600 + 1, 150),
        "half": range(60 * 60, 3 * 3600 + 1, 300),
        "marathon": range(2 * 3600, 6 * 3600 + 1, 600),
    }
    for key, label in RACES:
        rows = []
        for t in goals[key]:
            d = DISTANCES_M[key]
            rows.append([fmt_time(t, force_hours=True), fmt_time(t / (d / KM_M)), fmt_time(t / (d / MILE_M)),
                         f"{d / KM_M / (t / 3600):.2f}", f"{d / MILE_M / (t / 3600):.2f}"])
        write(f"goal-time-to-pace-{key}.csv",
              ["finish_time", "pace_per_km", "pace_per_mile", "speed_kmh", "speed_mph"], rows)


if __name__ == "__main__":
    main()
