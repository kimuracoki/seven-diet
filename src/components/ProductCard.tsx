import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import type { Product } from '../utils/types';

interface Props {
  product: Product;
}

export default function ProductCard({ product }: Props) {
  return (
    <Card sx={{ display: 'flex', mb: 1.5, overflow: 'hidden' }}>
      <CardMedia
        component="img"
        sx={{ width: 100, height: 100, objectFit: 'cover', flexShrink: 0 }}
        image={product.image_url || 'https://via.placeholder.com/100?text=No+Image'}
        alt={product.name}
      />
      <CardContent sx={{ flex: 1, py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
        <Typography variant="body2" fontWeight={600} noWrap>
          {product.name}
        </Typography>
        <Typography variant="body2" color="secondary" fontWeight={700} sx={{ mt: 0.25 }}>
          ¥{product.price.toLocaleString()}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
          <Chip label={`${product.calories}kcal`} size="small" sx={{ fontSize: '0.7rem', height: 22 }} />
          <Chip label={`P ${product.protein}g`} size="small" color="error" variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }} />
          <Chip label={`F ${product.fat}g`} size="small" color="warning" variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }} />
          <Chip label={`C ${product.carbs}g`} size="small" color="info" variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }} />
        </Box>
      </CardContent>
    </Card>
  );
}
