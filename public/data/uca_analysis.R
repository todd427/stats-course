# ============================================================
#  UCA SYNTHETIC DATASET — R CODEBOOK & ANALYSIS SCRIPT
#  Understanding Cyber-Aggression through AI Use, Trust,
#  and Personality Factors
#  Todd McCaffrey · MSc Cyberpsychology · ATU Letterkenny
# ============================================================
#
#  Reproduces the key analyses from the UCA dissertation on a
#  SYNTHETIC dataset. The synthetic data is drawn from the real
#  sample's composite correlation structure, means and SDs, so
#  the headline results match the thesis closely — but no real
#  participant response is published. See make_synthetic.py.
#
#  Dataset: uca_synthetic.csv (N = 164 screened responses)
#  Download: stats.ucahub.ie/data/uca_synthetic.csv
#
# ============================================================

# ── SETUP ───────────────────────────────────────────────────
# install.packages(c("mice", "psych", "ggplot2", "dplyr"))
library(mice)      # multiple imputation
library(psych)     # descriptives, corr.test
library(ggplot2)   # visualisation
library(dplyr)     # data wrangling

# ── LOAD DATA ───────────────────────────────────────────────
df <- read.csv("uca_synthetic.csv")

# ── CODEBOOK ────────────────────────────────────────────────
# participant_id : integer  Unique id (1–164)
# age_group      : factor   18-24 / 25-34 / 35-44 / 45-54
# gender         : factor   Woman / Man / Non-binary
# ai_frequency   : factor   Never … Daily. 'Never' users skipped the
#                           AI / cyber-cognition block (Q7–Q14): that is the
#                           source of the missingness — a by-design skip, MAR
#                           conditional on ai_frequency, NOT random dropout.
#
# OUTCOME
# hostile_response : numeric 1–10  Hostile Response Likelihood (HRL).
#                           Single-item: likelihood of a sharp/hostile reply to
#                           a provocation vignette. Higher = more hostile.
#
# PREDICTOR SCALES (composite means, 1–5; analytic n = 142, ai_trust n = 140)
# habitual_use        Habitual SNS use            (4 items, alpha = .73)
# empathy_deficit     Online empathy deficit      (4 items, alpha = .75)
# normalization       Aggression normalisation    (4 items, alpha = .67)
# anonymity           Perceived online anonymity  (4 items, alpha = .78)
# moral_disengagement Moral disengagement         (6 items, alpha = .82)
# ai_trust            Trust in AI tools           (5 items, alpha = .84)
# ai_disinhibition    AI-mediated disinhibition   (5 items, alpha = .84)
# ai_familiarity      Self-rated AI familiarity   (single item, 1–10)
#
# BIG FIVE (single-item markers, 1–5; n = 164, agreeableness n = 163)
# extraversion conscientiousness neuroticism agreeableness openness

classic <- c("habitual_use", "empathy_deficit", "normalization",
             "anonymity", "moral_disengagement")
ai      <- c("ai_trust", "ai_disinhibition", "ai_familiarity")
big5    <- c("extraversion", "conscientiousness", "neuroticism",
             "agreeableness", "openness")
preds   <- c(classic, ai, big5)

# ── 1. DESCRIPTIVE STATISTICS ───────────────────────────────
# Report per-variable n: the DV and Big Five sit at N = 164, but the
# predictor / AI scales are at n = 142 (the 'Never' skip branch). Do NOT
# report them under a single blanket N.
cat("\n=== Descriptive Statistics (note the varying n) ===\n")
print(describe(df[, c("hostile_response", preds)])[, c("n", "mean", "sd", "min", "max")])

# ── 2. MISSING DATA ─────────────────────────────────────────
cat("\n=== Missing data pattern ===\n")
md.pattern(df[, c("hostile_response", classic, ai)], plot = FALSE)
# 22 'Never'-AI users are missing all 8 AI / cyber-cognition scales;
# 2 more are missing ai_trust; 1 is missing agreeableness.
# => listwise-complete n = 139 for the full model.

# ── 3. MULTIPLE IMPUTATION (m = 20) ─────────────────────────
# The branch missingness is MAR given ai_frequency, so include it as a
# predictor in the imputation model. Compare with listwise deletion below.
set.seed(42)
imp_vars <- c("hostile_response", preds, "ai_frequency")
imp <- mice(df[, imp_vars], m = 20, method = "pmm", printFlag = FALSE)
cat("\n=== Imputation complete: m =", imp$m, "datasets ===\n")

# ── 4. CORRELATIONS (with the suppression preview) ──────────
cat("\n=== Zero-order correlations with HRL ===\n")
zo <- sapply(preds, function(v) cor(df$hostile_response, df[[v]],
                                    use = "complete.obs"))
print(round(sort(zo), 3))
# NOTE: moral_disengagement is the strongest zero-order correlate (~ .38).
# anonymity is only weakly NEGATIVE and non-significant at the zero order
# (~ -.10) — keep an eye on it: it flips to a clear negative predictor once
# the other variables are held constant (a suppression effect, see §6).

# ── 5. HIERARCHICAL REGRESSION (listwise, n = 139) ──────────
# DV = HRL. Five nested blocks, all fit on the SAME complete-case set so the
# ΔR² / ΔF tests are valid. Classic predictors first, then AI components one
# at a time (so H2 reads component-by-component), then Big Five.
cc <- df[complete.cases(df[, c("hostile_response", preds)]),
         c("hostile_response", preds)]
cat("\n=== Hierarchical regression: complete cases n =", nrow(cc), "===\n")

m1 <- lm(hostile_response ~ habitual_use + empathy_deficit + normalization +
           anonymity + moral_disengagement, data = cc)               # Classic
m2 <- update(m1, . ~ . + ai_trust)                                   # + AI Trust
m3 <- update(m2, . ~ . + ai_disinhibition)                          # + AI Disinhibition
m4 <- update(m3, . ~ . + ai_familiarity)                            # + AI Familiarity
m5 <- update(m4, . ~ . + extraversion + conscientiousness +
               neuroticism + agreeableness + openness)              # + Big Five

models <- list("1. Classic" = m1, "2. + AI Trust" = m2,
               "3. + AI Disinhibition" = m3, "4. + AI Familiarity" = m4,
               "5. + Big Five" = m5)

cat(sprintf("%-22s %6s %7s %7s %7s\n", "Block", "R2", "adjR2", "dR2", "p(dF)"))
prev <- NULL
for (nm in names(models)) {
  s <- summary(models[[nm]])
  dr <- if (is.null(prev)) NA else s$r.squared - summary(prev)$r.squared
  p  <- if (is.null(prev)) NA else anova(prev, models[[nm]])$`Pr(>F)`[2]
  cat(sprintf("%-22s %6.3f %7.3f %7s %7s\n", nm, s$r.squared, s$adj.r.squared,
              ifelse(is.na(dr), "—", sprintf("%.3f", dr)),
              ifelse(is.na(p),  "—", sprintf("%.3f", p))))
  prev <- models[[nm]]
}

# The AI block as a whole (Classic -> + AI Familiarity): a null increment.
cat("\n=== AI block omnibus (3 AI predictors over Classic) ===\n")
print(anova(m1, m4))
dR2_ai <- summary(m4)$r.squared - summary(m1)$r.squared
cat("AI block ΔR² ≈", round(dR2_ai, 3),
    "— small, non-significant. Cohen's f² ≈", round(dR2_ai / (1 - summary(m4)$r.squared), 3), "\n")

# Pooled full model over the imputations (Rubin's Rules) for comparison.
cat("\n=== Full model pooled across imputations (Rubin's Rules) ===\n")
fit_full <- with(imp, lm(hostile_response ~ habitual_use + empathy_deficit +
  normalization + anonymity + moral_disengagement + ai_trust +
  ai_disinhibition + ai_familiarity + extraversion + conscientiousness +
  neuroticism + agreeableness + openness))
print(summary(pool(fit_full))[, c("term", "estimate", "std.error", "p.value")])

# ── 6. THE SUPPRESSION EFFECT (perceived anonymity) ─────────
# Anonymity is non-significant alone but a significant NEGATIVE predictor in
# the multivariate model — the other predictors suppress irrelevant variance
# in anonymity, sharpening its unique contribution.
cat("\n=== Suppression: anonymity, alone vs. adjusted ===\n")
alone    <- lm(hostile_response ~ anonymity, data = cc)
adjusted <- m5
cat("Zero-order  : b =", round(coef(alone)["anonymity"], 3),
    " p =", round(summary(alone)$coefficients["anonymity", 4], 3), "\n")
cat("Multivariate: b =", round(coef(adjusted)["anonymity"], 3),
    " p =", round(summary(adjusted)$coefficients["anonymity", 4], 3), "\n")

# Standardised betas of the full model (z-score everything, refit).
zc <- as.data.frame(scale(cc))
mz <- lm(hostile_response ~ ., data = zc)
cat("\n=== Standardised betas (full model) ===\n")
print(round(sort(coef(mz)[-1], decreasing = TRUE), 3))
# moral_disengagement ≈ .46 (dominant); anonymity ≈ -.20 (suppression).

# ── 7. GROUP COMPARISON (t-test + Cohen's d) ────────────────
cat("\n=== HRL by gender (Woman vs Man) ===\n")
gg <- df[df$gender %in% c("Woman", "Man"), ]
print(t.test(hostile_response ~ gender, data = gg))
w <- gg$hostile_response[gg$gender == "Woman"]
m <- gg$hostile_response[gg$gender == "Man"]
cat("Cohen's d:", round((mean(m) - mean(w)) / sqrt((sd(m)^2 + sd(w)^2) / 2), 3), "\n")

# ── 8. VISUALISATION ────────────────────────────────────────
theme_uca <- theme_minimal(base_size = 13) + theme(
  plot.background  = element_rect(fill = "#060d18", colour = NA),
  panel.background = element_rect(fill = "#0c1929", colour = NA),
  panel.grid       = element_line(colour = "#1a3050"),
  text             = element_text(colour = "#c8d8eb"),
  axis.text        = element_text(colour = "#4a6a88"),
  plot.title       = element_text(colour = "#e8f0fa", face = "bold"),
  plot.subtitle    = element_text(colour = "#0dcfb2"))

p <- ggplot(cc, aes(moral_disengagement, hostile_response)) +
  geom_jitter(alpha = 0.5, colour = "#0dcfb2", size = 2, height = 0.2) +
  geom_smooth(method = "lm", colour = "#f59e0b", fill = "#f59e0b22", linewidth = 1) +
  labs(title = "Moral Disengagement → Hostile Response Likelihood",
       subtitle = paste0("r = ", round(cor(cc$moral_disengagement,
                                            cc$hostile_response), 3),
                         "  ·  the dominant predictor in every model"),
       x = "Moral Disengagement (1–5)", y = "Hostile Response Likelihood (1–10)") +
  theme_uca
ggsave("uca_scatter.png", p, width = 8, height = 5, dpi = 150)
cat("\nPlot saved: uca_scatter.png\n")

# ── DONE ────────────────────────────────────────────────────
cat("\n=== Analysis complete ===\n")
cat("Moral disengagement dominates HRL (β ≈ .46, p < .001).\n")
cat("The AI block adds essentially nothing (ΔR² ≈ .04, ns) — a meaningful null.\n")
cat("Perceived anonymity is a suppression effect: null alone, negative when adjusted.\n")
cat("This reproduces the UCA dissertation's headline findings.\n")
