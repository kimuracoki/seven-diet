import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import type { NutritionTotals } from '../utils/types';
import { PFC_TARGETS } from '../utils/types';

interface Props {
  totals: NutritionTotals;
}

interface BarProps {
  label: string;
  value: number;
  target: number;
  unit: string;
  color: 'error' | 'warning' | 'info' | 'primary';
}

function NutrientBar({ label, value, target, unit, color }: BarProps) {
  const pct = Math.min((value / target) * 100, 120);
  const over = value > target * 1.15;

  return (
    <Box sx={{ mb: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
        <Typography variant="caption" fontWeight={600}>
          {label}
        </Typography>
        <Typography variant="caption" color={over ? 'error' : 'text.secondary'}>
          {Math.round(value)} / {target}{unit}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={Math.min(pct, 100)}
        color={color}
        sx={{ height: 8, borderRadius: 4 }}
      />
    </Box>
  );
}

export default function NutritionSummary({ totals }: Props) {
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1.5 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          1日の合計
        </Typography>
        <Typography variant="h6" color="secondary" fontWeight={700}>
          ¥{totals.price.toLocaleString()}
        </Typography>
      </Box>
      <NutrientBar label="カロリー" value={totals.calories} target={PFC_TARGETS.calories} unit="kcal" color="primary" />
      <NutrientBar label="たんぱく質 (P)" value={totals.protein} target={PFC_TARGETS.protein} unit="g" color="error" />
      <NutrientBar label="脂質 (F)" value={totals.fat} target={PFC_TARGETS.fat} unit="g" color="warning" />
      <NutrientBar label="炭水化物 (C)" value={totals.carbs} target={PFC_TARGETS.carbs} unit="g" color="info" />
    </Paper>
  );
}
