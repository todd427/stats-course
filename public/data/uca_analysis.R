# ============================================================
#  UCA SYNTHETIC DATASET — R CODEBOOK & ANALYSIS SCRIPT
#  Understanding Cyber-Aggression through AI Use, Trust,
#  and Personality Factors
#  Todd McCaffrey · MSc Cyberpsychology · ATU Letterkenny
# ============================================================
#
#  This script reproduces the key analyses from the UCA
#  dissertation using the synthetic dataset.
#
#  Dataset: uca_synthetic.csv (n=167)
#  Download: stats.ucahub.ie/data/uca_synthetic.csv
#
# ============================================================

# ── SETUP ───────────────────────────────────────────────────
# install.packages(c("mice", "psych", "lavaan", "ggplot2", "dplyr"))
library(mice)      # multiple imputation
library(psych)     # descriptive stats, alpha
library(ggplot2)   # visualisation
library(dplyr)     # data wrangling

# ── LOAD DATA ───────────────────────────────────────────────
df <- read.csv("uca_synthetic.csv")

# ── CODEBOOK ────────────────────────────────────────────────
# participant_id  : integer  Unique participant identifier (1–167)
# age             : integer  Participant age in years
# gender          : integer  1 = Female, 2 = Male, 3 = Non-binary/Other
# moral_disengagement : numeric  Composite scale score, 1–5
#                                Bandura's Mechanisms of Moral
#                                Disengagement Scale (8 items)
#                                Higher = greater moral disengagement
# cyber_aggression    : numeric  Composite scale score, 1–5
#                                Cyber-Aggression Typology Questionnaire
#                                Higher = greater cyber-aggression
# ai_trust            : numeric  Composite scale score, 1–5
#                                AI Trust Scale (5 items)
#                                Higher = greater trust in AI systems
# ai_use              : numeric  Composite scale score, 1–5
#                                AI Use Frequency Scale (4 items)
#                                Higher = more frequent AI use

# ── 1. DESCRIPTIVE STATISTICS ───────────────────────────────
cat("\n=== Descriptive Statistics ===\n")
describe(df[, c("moral_disengagement", "cyber_aggression",
                "ai_trust", "ai_use")])

# Missing data pattern
cat("\n=== Missing Data Pattern ===\n")
md.pattern(df[, c("moral_disengagement", "cyber_aggression",
                   "ai_trust", "ai_use")])

# ── 2. MULTIPLE IMPUTATION (m=5) ────────────────────────────
# MAR assumption — consistent with dissertation Little's MCAR test
set.seed(42)
imp <- mice(
  df[, c("moral_disengagement", "cyber_aggression",
         "ai_trust", "ai_use", "age", "gender")],
  m = 5,
  method = "pmm",    # predictive mean matching
  printFlag = FALSE
)

cat("\n=== Imputation complete: m =", imp$m, "datasets ===\n")

# Get one completed dataset for initial exploration
df_complete <- complete(imp, 1)

# ── 3. CORRELATIONS ─────────────────────────────────────────
cat("\n=== Correlation Matrix ===\n")
cor_matrix <- cor(df_complete[, c("moral_disengagement",
                                   "cyber_aggression",
                                   "ai_trust", "ai_use")],
                  use = "complete.obs")
print(round(cor_matrix, 3))

# With significance tests
corr.test(df_complete[, c("moral_disengagement",
                           "cyber_aggression",
                           "ai_trust", "ai_use")])

# ── 4. HIERARCHICAL REGRESSION ──────────────────────────────
# Run on each imputed dataset and pool with Rubin's Rules

# Block 1: Demographics
fit_block1 <- with(imp,
  lm(cyber_aggression ~ age + gender))

# Block 2: + Moral Disengagement
fit_block2 <- with(imp,
  lm(cyber_aggression ~ age + gender + moral_disengagement))

# Block 3: + AI factors
fit_block3 <- with(imp,
  lm(cyber_aggression ~ age + gender + moral_disengagement +
       ai_trust + ai_use))

# Pool results
pool1 <- pool(fit_block1)
pool2 <- pool(fit_block2)
pool3 <- pool(fit_block3)

cat("\n=== Block 1: Demographics ===\n")
summary(pool1)

cat("\n=== Block 2: + Moral Disengagement ===\n")
summary(pool2)

cat("\n=== Block 3: + AI Factors ===\n")
summary(pool3)

# R² for each block (from one complete dataset as approximation)
m1 <- lm(cyber_aggression ~ age + gender, data = df_complete)
m2 <- lm(cyber_aggression ~ age + gender + moral_disengagement,
         data = df_complete)
m3 <- lm(cyber_aggression ~ age + gender + moral_disengagement +
           ai_trust + ai_use, data = df_complete)

cat("\n=== R² Summary ===\n")
cat("Block 1 R²:", round(summary(m1)$r.squared, 3), "\n")
cat("Block 2 R²:", round(summary(m2)$r.squared, 3),
    " | ΔR²:", round(summary(m2)$r.squared -
                     summary(m1)$r.squared, 3), "\n")
cat("Block 3 R²:", round(summary(m3)$r.squared, 3),
    " | ΔR²:", round(summary(m3)$r.squared -
                     summary(m2)$r.squared, 3), "\n")

# F-change test for Block 3
anova(m2, m3)

# ── 5. SIMPLE STATISTICS ────────────────────────────────────
# t-test: gender differences in cyber-aggression
cat("\n=== t-test: Gender × Cyber-Aggression ===\n")
t.test(cyber_aggression ~ gender,
       data = df_complete[df_complete$gender %in% c(1,2), ])

# Cohen's d
male   <- df_complete$cyber_aggression[df_complete$gender == 2]
female <- df_complete$cyber_aggression[df_complete$gender == 1]
cohens_d <- (mean(male) - mean(female)) /
  sqrt((sd(male)^2 + sd(female)^2) / 2)
cat("Cohen's d:", round(cohens_d, 3), "\n")

# ── 6. Z-SCORES ─────────────────────────────────────────────
# Add z-scores to dataframe
df_complete$z_md <- scale(df_complete$moral_disengagement)
df_complete$z_ca <- scale(df_complete$cyber_aggression)

cat("\n=== Top 5 participants by moral disengagement z-score ===\n")
df_complete %>%
  arrange(desc(z_md)) %>%
  select(participant_id, moral_disengagement, z_md, cyber_aggression) %>%
  head(5) %>%
  print()

# ── 7. VISUALISATION ────────────────────────────────────────
# Scatter: moral disengagement vs cyber-aggression with regression line
p <- ggplot(df_complete,
            aes(x = moral_disengagement, y = cyber_aggression)) +
  geom_point(alpha = 0.5, colour = "#0dcfb2", size = 2) +
  geom_smooth(method = "lm", colour = "#f59e0b",
              fill = "#f59e0b22", linewidth = 1) +
  labs(
    title = "Moral Disengagement → Cyber-Aggression",
    subtitle = paste0("r = ", round(cor(df_complete$moral_disengagement,
                                        df_complete$cyber_aggression), 3)),
    x = "Moral Disengagement (1–5)",
    y = "Cyber-Aggression (1–5)"
  ) +
  theme_minimal(base_size = 13) +
  theme(
    plot.background  = element_rect(fill = "#060d18", colour = NA),
    panel.background = element_rect(fill = "#0c1929", colour = NA),
    panel.grid       = element_line(colour = "#1a3050"),
    text             = element_text(colour = "#c8d8eb"),
    axis.text        = element_text(colour = "#4a6a88"),
    plot.title       = element_text(colour = "#e8f0fa", face = "bold"),
    plot.subtitle    = element_text(colour = "#0dcfb2")
  )

ggsave("uca_scatter.png", p, width = 8, height = 5, dpi = 150)
cat("\nPlot saved: uca_scatter.png\n")

# ── 8. NORMAL DISTRIBUTION CHECK ────────────────────────────
cat("\n=== Normality (Shapiro-Wilk, n≤50 subsample) ===\n")
set.seed(1)
sub <- sample_n(df_complete, 50)
shapiro.test(sub$moral_disengagement)
shapiro.test(sub$cyber_aggression)

# ── DONE ────────────────────────────────────────────────────
cat("\n=== Analysis complete ===\n")
cat("Key finding: ΔR² for AI factors block ≈ .01, p ≈ .43\n")
cat("Moral disengagement is the dominant predictor.\n")
cat("This replicates the UCA dissertation null finding.\n")
