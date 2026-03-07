import { useState, useMemo } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import SearchIcon from '@mui/icons-material/Search';
import type { Product } from '../utils/types';
import productsData from '../data/products.json';

const products = productsData as Product[];

const MAX_SUGGESTIONS = 20;

interface Props {
  onSelect: (product: Product) => void;
  disabled?: boolean;
}

export default function ProductSearch({ onSelect, disabled }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return [];
    return products
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, MAX_SUGGESTIONS);
  }, [query]);

  const handleChange = (_: unknown, value: Product | null) => {
    if (value) {
      onSelect(value);
      setQuery('');
      setOpen(false);
    }
  };

  return (
    <Autocomplete
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      inputValue={query}
      onInputChange={(_, v) => setQuery(v)}
      options={options}
      getOptionLabel={(p) => p.name}
      onChange={handleChange}
      disabled={disabled}
      noOptionsText="該当する商品がありません"
      loading={false}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="商品名で検索…"
          size="small"
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 0.5, color: 'text.secondary' }}>
                <SearchIcon fontSize="small" />
              </Box>
            ),
          }}
        />
      )}
      renderOption={(props, option) => (
        <Box
          component="li"
          {...props}
          key={option.id}
          sx={{ flexDirection: 'column', alignItems: 'stretch', py: 1 }}
        >
          <Typography variant="body2" fontWeight={600}>
            {option.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ¥{option.price.toLocaleString()} · {option.calories}kcal · P{option.protein}g
          </Typography>
        </Box>
      )}
    />
  );
}
