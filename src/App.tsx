import { useState, useCallback } from 'react';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import Typography from '@mui/material/Typography';
import RefreshIcon from '@mui/icons-material/Refresh';
import Header from './components/Header';
import NutritionSummary from './components/NutritionSummary';
import MealPlan from './components/MealPlan';
import { generateDailyPlan } from './utils/mealPlanner';
import type { DailyPlan } from './utils/types';

export default function App() {
  const [plan, setPlan] = useState<DailyPlan>(() => generateDailyPlan());

  const refresh = useCallback(() => {
    setPlan(generateDailyPlan());
  }, []);

  const hasProducts = plan.lunch.items.length > 0 || plan.dinner.items.length > 0;

  return (
    <Box sx={{ pb: 10, minHeight: '100dvh', bgcolor: 'background.default' }}>
      <Header />
      <Container maxWidth="sm" sx={{ pt: 2 }}>
        {hasProducts ? (
          <>
            <NutritionSummary totals={plan.totals} />
            <MealPlan meal={plan.lunch} />
            <MealPlan meal={plan.dinner} />
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
