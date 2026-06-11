#!/usr/bin/env python3
"""
make_synthetic.py — regenerate uca_synthetic.csv

The dataset shipped with this course is SYNTHETIC. No real participant data is
published. It is drawn from a multivariate-normal population whose correlation
matrix, means and SDs were taken from the scored composites of the real UCA
dissertation sample (N = 164), then rescaled to the original Likert ranges and
given the same skip-logic missingness. The result reproduces the dissertation's
headline structure — moral disengagement dominates Hostile Response Likelihood
(beta ~ .46), the AI block is a null increment, and perceived anonymity shows a
suppression effect — without exposing any real response.

    python make_synthetic.py        # writes uca_synthetic.csv next to this file

Requires numpy. Deterministic: SEED is fixed so the CSV is reproducible.
"""
import os
import numpy as np

SEED = 4          # chosen so the n=164 draw reproduces the reported effects
N = 164
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uca_synthetic.csv")

# Composite order. HRL = Hostile Response Likelihood (the outcome).
VARS = ['hostile_response', 'habitual_use', 'empathy_deficit', 'normalization',
        'anonymity', 'moral_disengagement', 'ai_trust', 'ai_disinhibition',
        'ai_familiarity', 'extraversion', 'conscientiousness', 'neuroticism',
        'agreeableness', 'openness']

# Means / SDs of the real scored composites (the targets the synthetic matches).
M = [4.384, 3.748, 2.944, 3.195, 3.162, 2.714, 2.872, 2.769,
     6.401, 3.305, 3.518, 3.726, 3.865, 3.732]
SD = [2.678, 0.795, 0.815, 0.792, 0.812, 0.801, 0.761, 0.943,
      1.730, 1.070, 0.975, 1.098, 0.920, 0.914]

# Correlation matrix of the real scored composites (pairwise-complete).
R = [
  [1.0000, 0.0383, 0.1416, 0.1859,-0.1214, 0.3930, 0.0125,-0.1277, 0.0153, 0.0317,-0.0462,-0.0369,-0.2187, 0.0073],
  [0.0383, 1.0000, 0.0457, 0.1822, 0.0931, 0.1492, 0.1285, 0.1641, 0.0456, 0.0964,-0.2588, 0.3498, 0.1555,-0.0626],
  [0.1416, 0.0457, 1.0000, 0.4777, 0.1485, 0.3722, 0.1693,-0.0060, 0.0727, 0.0199,-0.2307,-0.0734,-0.3692,-0.0410],
  [0.1859, 0.1822, 0.4777, 1.0000, 0.2928, 0.5625, 0.0809, 0.1145, 0.1571,-0.1253,-0.1796, 0.0159,-0.1455,-0.0176],
  [-0.1214,0.0931, 0.1485, 0.2928, 1.0000, 0.2645, 0.0085, 0.2010,-0.0453,-0.2054,-0.1214, 0.1744, 0.0803,-0.0771],
  [0.3930, 0.1492, 0.3722, 0.5625, 0.2645, 1.0000, 0.0776, 0.1062, 0.0904,-0.0975,-0.2165, 0.0202,-0.2444,-0.0203],
  [0.0125, 0.1285, 0.1693, 0.0809, 0.0085, 0.0776, 1.0000, 0.3200, 0.4652,-0.0059,-0.0124,-0.0485,-0.0890,-0.1680],
  [-0.1277,0.1641,-0.0060, 0.1145, 0.2010, 0.1062, 0.3200, 1.0000, 0.4754,-0.2129,-0.1373, 0.1919, 0.1462, 0.0936],
  [0.0153, 0.0456, 0.0727, 0.1571,-0.0453, 0.0904, 0.4652, 0.4754, 1.0000,-0.1239, 0.0419,-0.1032, 0.1029, 0.1192],
  [0.0317, 0.0964, 0.0199,-0.1253,-0.2054,-0.0975,-0.0059,-0.2129,-0.1239, 1.0000,-0.0054,-0.2572, 0.0226, 0.3412],
  [-0.0462,-0.2588,-0.2307,-0.1796,-0.1214,-0.2165,-0.0124,-0.1373, 0.0419,-0.0054, 1.0000,-0.0096, 0.1878,-0.1046],
  [-0.0369,0.3498,-0.0734, 0.0159, 0.1744, 0.0202,-0.0485, 0.1919,-0.1032,-0.2572,-0.0096, 1.0000, 0.3298,-0.1471],
  [-0.2187,0.1555,-0.3692,-0.1455, 0.0803,-0.2444,-0.0890, 0.1462, 0.1029, 0.0226, 0.1878, 0.3298, 1.0000, 0.0663],
  [0.0073,-0.0626,-0.0410,-0.0176,-0.0771,-0.0203,-0.1680, 0.0936, 0.1192, 0.3412,-0.1046,-0.1471, 0.0663, 1.0000],
]

SCALE_1_10 = {'hostile_response', 'ai_familiarity'}   # 1-10 single items
AI_BRANCH = ['habitual_use', 'empathy_deficit', 'normalization', 'anonymity',
             'moral_disengagement', 'ai_trust', 'ai_disinhibition', 'ai_familiarity']


def main():
    rng = np.random.default_rng(SEED)
    Rm = np.array(R)
    # nearest positive-definite (tiny eigen clip) so the draw is stable
    w, V = np.linalg.eigh(Rm)
    Rpd = V @ np.diag(np.clip(w, 1e-6, None)) @ V.T
    d = np.sqrt(np.diag(Rpd))
    Rpd = Rpd / np.outer(d, d)

    Z = rng.multivariate_normal(np.zeros(len(VARS)), Rpd, size=N)
    cols = {}
    for j, v in enumerate(VARS):
        x = (Z[:, j] - Z[:, j].mean()) / Z[:, j].std(ddof=1)
        x = x * SD[j] + M[j]
        if v in SCALE_1_10:
            cols[v] = np.clip(np.round(x), 1, 10).astype(int).astype(object)
        else:
            cols[v] = np.clip(np.round(x * 20) / 20, 1, 5).astype(object)  # 1-5, .05 steps

    # who skips the AI branch (drawn right after Z so the calibration is fixed)
    never = rng.choice(N, 22, replace=False)         # 22 'Never' AI users -> skip branch
    pool = [i for i in range(N) if i not in set(never)]
    extra = rng.choice(pool, 3, replace=False)

    # demographics
    age = rng.choice(['18-24', '25-34', '35-44', '45-54'], N, p=[.46, .24, .18, .12])
    gender = rng.choice(['Woman', 'Man', 'Non-binary'], N, p=[.62, .35, .03])
    freq = rng.choice(['Less than once a month', 'About once a month', 'About once a week',
                       'Several times a week', 'Daily'], N, p=[.09, .14, .21, .27, .29]).astype(object)
    freq[never] = 'Never'

    # skip-logic missingness: 'Never' users never saw the AI / cyber-cognition items
    for v in AI_BRANCH:
        cols[v][never] = ''
    cols['ai_trust'][extra[:2]] = ''                 # -> ai_trust n = 140
    cols['agreeableness'][extra[2]] = ''             # -> agreeableness n = 163, listwise n = 139

    header = (['participant_id', 'age_group', 'gender', 'ai_frequency'] + VARS)
    with open(OUT, 'w') as f:
        f.write(','.join(header) + '\n')
        for i in range(N):
            row = [str(i + 1), age[i], gender[i], freq[i]] + [
                ('' if cols[v][i] == '' else
                 (str(int(cols[v][i])) if v in SCALE_1_10 else f'{cols[v][i]:.2f}'))
                for v in VARS]
            f.write(','.join(row) + '\n')
    print(f"wrote {OUT} ({N} rows)")


if __name__ == '__main__':
    main()
