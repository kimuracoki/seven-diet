import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import type { Meal } from '../utils/types';
import ProductCard from './ProductCard';

interface Props {
  meal: Meal;
}

export default function MealPlan({ meal }: Props) {
  return (
    <Box sx={{ mb: 2 }}>
      <Divider sx={{ mb: 1.5 }}>
        <Chip
          label={`${meal.label}  ${Math.round(meal.totals.calories)}kcal / ¥${meal.totals.price.toLocaleString()}`}
          color={meal.type === 'lunch' ? 'primary' : 'secondary'}
          variant="outlined"
          sx={{ fontWeight: 600 }}
        />
      </Divider>
      {meal.items.map((product, i) => (
        <ProductCard key={`${product.id}-${i}`} product={product} />
      ))}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          P {Math.round(meal.totals.protein)}g / F {Math.round(meal.totals.fat)}g / C {Math.round(meal.totals.carbs)}g
        </Typography>
      </Box>
    </Box>
  );
}
