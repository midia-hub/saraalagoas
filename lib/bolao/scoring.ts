export const POINTS_CONFIG = {
  exactScore: 10,
  correctOutcome: 5,
  oneScoreCorrect: 2,
  participation: 1,
} as const

export function calculateGuessPoints(
  guess: { brazil_guess: number; opponent_guess: number },
  result: { brazil_score: number; opponent_score: number }
): number {
  const { brazil_guess, opponent_guess } = guess
  const { brazil_score, opponent_score } = result

  if (brazil_guess === brazil_score && opponent_guess === opponent_score) {
    return POINTS_CONFIG.exactScore
  }

  const guessOutcome = Math.sign(brazil_guess - opponent_guess)
  const resultOutcome = Math.sign(brazil_score - opponent_score)
  if (guessOutcome === resultOutcome) {
    return POINTS_CONFIG.correctOutcome
  }

  if (brazil_guess === brazil_score || opponent_guess === opponent_score) {
    return POINTS_CONFIG.oneScoreCorrect
  }

  return POINTS_CONFIG.participation
}
