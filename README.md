# race-pace-reference-charts

Open data and a small dependency-free Python tool for race pace math: official race distances, pace-to-finish-time charts (per mile and per km), goal-time-to-pace tables for 5K, 10K, half marathon and marathon, even-pace splits, run/walk interval averages, and a Riegel race-time estimate.

The static website source for the interactive calculators at [race-pace-calculator.com](https://race-pace-calculator.com/) is in `src/`.

All tables are generated from the formulas in `tools/racepace.py`, so they can be checked and rebuilt instead of trusted blindly.

## Data

| File | What it contains |
| --- | --- |
| `data/race-distances.csv` | Road mile, 5K, 10K, half marathon and marathon in metres, kilometres and miles, with the source of each distance |
| `data/pace-chart-per-mile.csv` | Pace per mile from 5:00 to 15:00 (15 s steps), equivalent pace per km, and finish times for 5K, 10K, half and marathon |
| `data/pace-chart-per-km.csv` | Pace per km from 3:00 to 9:00 (10 s steps), equivalent pace per mile, and the same four finish times |
| `data/goal-time-to-pace-5k.csv` | 5K goal times 12:00 to 60:00 (1 min steps) with the required pace per km and per mile and average speed |
| `data/goal-time-to-pace-10k.csv` | 10K goal times 25:00 to 2:00:00 (2:30 steps), same columns |
| `data/goal-time-to-pace-half.csv` | Half marathon goal times 1:00:00 to 3:00:00 (5 min steps), same columns |
| `data/goal-time-to-pace-marathon.csv` | Marathon goal times 2:00:00 to 6:00:00 (10 min steps), same columns |

Times are rounded to the nearest second (halves round up). Regenerate everything with:

```bash
python3 tools/build_data.py
```

## Formulas

- Pace = time / distance. Example: 10K (6.21371 mi) in 50:00 is 3000 / 6.21371 = 482.8 s, about 8:03 per mile.
- Finish time = pace x distance. Example: 9:00 per mile over a half marathon (13.10938 mi) is 540 x 13.10938 = 7079 s, or 1:57:59.
- Run/walk average pace = cycle time / cycle distance, where cycle distance = run time / run pace + walk time / walk pace. Example: 3 min at 6:00/km plus 1 min at 10:00/km covers 0.5 + 0.1 = 0.6 km in 4 min, an average of 6:40/km. A plain time-weighted mean of the two paces (7:00/km) overstates the time.
- Riegel estimate: T2 = T1 x (D2 / D1) ^ b, with b = 1.06 by default. This is an empirical approximation from Riegel (1981), not a guarantee; the exponent can be changed with `--exponent`.

## Command-line tool

Python 3.8+ with no third-party packages.

```bash
python3 tools/racepace.py pace    --distance marathon --time 3:30:00
python3 tools/racepace.py time    --distance 10k --pace 8:00 --unit mi
python3 tools/racepace.py splits  --distance half --time 1:45:00 --unit km
python3 tools/racepace.py runwalk --distance 5k --run-min 3 --walk-min 1 --run-pace 6:00 --walk-pace 10:00 --unit km
python3 tools/racepace.py predict --distance 10k --time 50:00 --target marathon
```

Distances accept `mile`, `5k`, `10k`, `half`, `marathon`, or a number in the chosen `--unit` (`km` or `mi`).

Run the tests with `python3 -m unittest discover -s tests`.

## Sources

- World Athletics, Competition and Technical Rules (2026 edition), Technical Rule 55 (Road Races): standard distances include Road Mile (1609.344 m), 5 km, 10 km, Half-Marathon and Marathon (42.195 km). https://worldathletics.org/about-iaaf/documents/book-of-rules
- NIST Handbook 44, Appendix C: 1 mile = 5280 ft = 1609.344 m. https://www.nist.gov/pml/owm/nist-handbook-44-current-edition
- Riegel, P. S. (1981). Athletic records and human endurance. American Scientist, 69(3), 285-290. https://pubmed.ncbi.nlm.nih.gov/7235349/

The half marathon distance (21.0975 km) is half of the 42.195 km marathon.

## Using the charts in a browser

The same calculations are available as interactive calculators at [race-pace-calculator.com](https://race-pace-calculator.com/).

## License

Code: MIT. Data tables: CC BY 4.0. See `LICENSE`.
