import { useState, useCallback } from 'react';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import Typography from '@mui/material/Typography';
import RefreshIcon from '@mui/icons-material/Refresh';
import Header from './components/Header';
import NutritionSummary from './components/NutritionSummary';
import MealPlan from './components/MealPlan';
import { generateDailyPlan, generateDailyPlanWithPinned } from './utils/mealPlanner';
import type { DailyPlan } from './utils/types';

export default function App() {
  const [plan, setPlan] = useState<DailyPlan>(() => generateDailyPlan());
  const [pinnedLunch, setPinnedLunch] = useState<Set<number>>(() => new Set());
  const [pinnedDinner, setPinnedDinner] = useState<Set<number>>(() => new Set());

  const togglePinLunch = useCallback((index: number) => {
    setPinnedLunch((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const togglePinDinner = useCallback((index: number) => {
    setPinnedDinner((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const refresh = useCallback(() => {
    const hasPinned = pinnedLunch.size > 0 || pinnedDinner.size > 0;
    if (!hasPinned) {
      setPlan(generateDailyPlan());
      setPinnedLunch(new Set());
      setPinnedDinner(new Set());
    } else {
      setPlan((prev) =>
        generateDailyPlanWithPinned(prev, { lunch: pinnedLunch, dinner: pinnedDinner }),
      );
    }
  }, [pinnedLunch, pinnedDinner]);

  const hasProducts = plan.lunch.items.length > 0 || plan.dinner.items.length > 0;

  return (
    <Box sx={{ pb: 10, minHeight: '100dvh', bgcolor: 'background.default' }}>
      <Header />
      <Container maxWidth="sm" sx={{ pt: 2 }}>
        {hasProducts ? (
          <>
            <NutritionSummary totals={plan.totals} />
            <MealPlan meal={plan.lunch} pinnedIndices={pinnedLunch} onTogglePin={togglePinLunch} />
            <MealPlan meal={plan.dinner} pinnedIndices={pinnedDinner} onTogglePin={togglePinDinner} />
          </>
        ) : (
          <Box sx={{ textAlign: 'center', mt: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              商品データがありません
            </Typography>
            <Typography variant="body2" color="text.secondary">
              scraper を実行して商品データを取得してください
            </Typography>
          </Box>
        )}
      </Container>
      {hasProducts && (
        <Fab
          color="secondary"
          onClick={refresh}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 64,
            height: 64,
          }}
        >
          <RefreshIcon sx={{ fontSize: 32 }} />
        </Fab>
      )}
    </Box>
  );
}
