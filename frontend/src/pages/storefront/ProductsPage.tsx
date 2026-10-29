import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Filter, SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import type { ProductListItem, PaginatedResponse, ProductFilters } from '@/types';
import ProductCard from '@/components/products/ProductCard';
import PageSpinner from '@/components/ui/PageSpinner';

const SORT_OPTIONS = [
  { value: 'rating_desc', label: 'Top Rated' },
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name_asc', label: 'Name: A–Z' },
];

const MATERIALS = ['Pearl', 'Gemstone', 'Crystal', 'Glass', 'Metal', 'Wood', 'Plastic'];
const COLORS = ['White', 'Cream', 'Pink', 'Red', 'Blue', 'Green', 'Yellow', 'Black', 'Multi'];
const SHAPES = ['Round', 'Oval', 'Teardrop', 'Cube', 'Tube', 'Irregular', 'Flat'];

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const filters: ProductFilters = {
    q: searchParams.get('q') || undefined,
    category: searchParams.get('category') || undefined,
    material: searchParams.get('material') || undefined,
    color: searchParams.get('color') || undefined,
    shape: searchParams.get('shape') || undefined,
    price_min: searchParams.get('price_min') ? Number(searchParams.get('price_min')) : undefined,
    price_max: searchParams.get('price_max') ? Number(searchParams.get('price_max')) : undefined,
    in_stock: searchParams.get('in_stock') === 'true' ? true : undefined,
    sort: (searchParams.get('sort') as ProductFilters['sort']) || 'rating_desc',
    page: Number(searchParams.get('page')) || 1,
    size: 24,
  };

  const { data, isLoading, isError } = useQuery<PaginatedResponse<ProductListItem>>({
    queryKey: ['products', filters],
    queryFn: async () => {
      const params = Object.entries(filters)
        .filter(([, v]) => v !== undefined)
        .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
      const { data } = await api.get<PaginatedResponse<ProductListItem>>('/products', { params });
      return data;
    },
  });

  const setFilter = (key: string, value: string | undefined) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(key, value);
        next.delete('page');
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const clearFilters = () => setSearchParams({});

  const activeFilterCount = ['material', 'color', 'shape', 'price_min', 'price_max', 'in_stock']
    .filter((k) => searchParams.has(k)).length;

  return (
    <div className="page-container py-8 lg:py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl text-midnight-navy font-semibold">
            {filters.q ? `Search: "${filters.q}"` : 'All Products'}
          </h1>
          {data && (
            <p className="text-sm text-charcoal/60 mt-1">{data.total} products found</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Sort */}
          <select
            id="sort-select"
            value={filters.sort}
            onChange={(e) => setFilter('sort', e.target.value)}
            className="input-field w-auto py-2 pr-8 cursor-pointer"
            aria-label="Sort products"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {/* Filter button */}
          <button
            id="filter-toggle-btn"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            aria-expanded={isFilterOpen}
            aria-label="Toggle filters"
            className="lg:hidden flex items-center gap-2 btn-secondary text-sm px-4 py-2"
          >
            <SlidersHorizontal size={16} />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 w-5 h-5 rounded-full bg-champagne-gold text-midnight-navy text-xs font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Sidebar filters - desktop */}
        <aside className="hidden lg:block w-64 flex-shrink-0" aria-label="Product filters">
          <FilterPanel
            searchParams={searchParams}
            setFilter={setFilter}
            clearFilters={clearFilters}
            activeFilterCount={activeFilterCount}
          />
        </aside>

        {/* Mobile filters */}
        <AnimatePresence>
          {isFilterOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 lg:hidden bg-midnight-navy/50 backdrop-blur-sm"
              onClick={() => setIsFilterOpen(false)}
            >
              <motion.aside
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                transition={{ type: 'spring', damping: 30 }}
                className="absolute top-0 left-0 bottom-0 w-72 bg-pearl-ivory overflow-y-auto p-6"
                onClick={(e) => e.stopPropagation()}
                aria-label="Product filters"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-semibold text-midnight-navy text-lg">Filters</h2>
                  <button onClick={() => setIsFilterOpen(false)} aria-label="Close filters">
                    <X size={20} />
                  </button>
                </div>
                <FilterPanel
                  searchParams={searchParams}
                  setFilter={setFilter}
                  clearFilters={clearFilters}
                  activeFilterCount={activeFilterCount}
                />
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Products grid */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="card overflow-hidden">
                  <div className="skeleton aspect-square" />
                  <div className="p-4 space-y-2">
                    <div className="skeleton h-4 rounded w-3/4" />
                    <div className="skeleton h-3 rounded w-1/2" />
                    <div className="skeleton h-5 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-20">
              <p className="text-red-600 font-semibold mb-2">Failed to load products</p>
              <p className="text-charcoal/60 text-sm">Please try again later</p>
            </div>
          ) : data?.items.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🔍</div>
              <h2 className="font-semibold text-midnight-navy text-xl mb-2">No products found</h2>
              <p className="text-charcoal/60 mb-6">Try adjusting your filters or search query</p>
              <button onClick={clearFilters} className="btn-primary">Clear all filters</button>
            </div>
          ) : (
            <>
              <motion.div
                layout
                className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4"
              >
                {data?.items.map((product) => (
                  <motion.div key={product.id} layout>
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </motion.div>

              {/* Pagination */}
              {data && data.pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-12">
                  {Array.from({ length: data.pages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setFilter('page', String(i + 1))}
                      id={`page-btn-${i + 1}`}
                      aria-label={`Page ${i + 1}`}
                      aria-current={data.page === i + 1 ? 'page' : undefined}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                        data.page === i + 1
                          ? 'bg-gradient-gold text-midnight-navy shadow-gold'
                          : 'bg-white text-charcoal hover:bg-gold-50 border border-gold-100'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Filter Panel Component ───────────────────────────────────
function FilterPanel({
  searchParams,
  setFilter,
  clearFilters,
  activeFilterCount,
}: {
  searchParams: URLSearchParams;
  setFilter: (k: string, v: string | undefined) => void;
  clearFilters: () => void;
  activeFilterCount: number;
}) {
  return (
    <div className="space-y-6">
      {activeFilterCount > 0 && (
        <button
          onClick={clearFilters}
          id="clear-filters-btn"
          className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 font-medium"
        >
          <X size={14} /> Clear all filters ({activeFilterCount})
        </button>
      )}

      {/* In Stock */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            id="in-stock-filter"
            type="checkbox"
            checked={searchParams.get('in_stock') === 'true'}
            onChange={(e) => setFilter('in_stock', e.target.checked ? 'true' : undefined)}
            className="w-4 h-4 rounded border-gold-300 text-champagne-gold focus:ring-champagne-gold"
          />
          <span className="text-sm font-medium text-midnight-navy">In Stock Only</span>
        </label>
      </div>

      {/* Material */}
      <FilterSection title="Material" id="material-filter">
        {MATERIALS.map((m) => (
          <label key={m} className="flex items-center gap-3 cursor-pointer">
            <input
              id={`material-${m.toLowerCase()}`}
              type="radio"
              name="material"
              checked={searchParams.get('material') === m}
              onChange={() => setFilter('material', searchParams.get('material') === m ? undefined : m)}
              className="w-4 h-4 border-gold-300 text-champagne-gold"
            />
            <span className="text-sm text-charcoal">{m}</span>
          </label>
        ))}
      </FilterSection>

      {/* Color */}
      <FilterSection title="Color" id="color-filter">
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              id={`color-${c.toLowerCase()}`}
              onClick={() => setFilter('color', searchParams.get('color') === c ? undefined : c)}
              aria-pressed={searchParams.get('color') === c}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                searchParams.get('color') === c
                  ? 'bg-gradient-gold border-champagne-gold text-midnight-navy'
                  : 'border-navy-200 text-charcoal hover:border-champagne-gold hover:bg-gold-50'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Shape */}
      <FilterSection title="Shape" id="shape-filter">
        <div className="flex flex-wrap gap-2">
          {SHAPES.map((s) => (
            <button
              key={s}
              id={`shape-${s.toLowerCase()}`}
              onClick={() => setFilter('shape', searchParams.get('shape') === s ? undefined : s)}
              aria-pressed={searchParams.get('shape') === s}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                searchParams.get('shape') === s
                  ? 'bg-gradient-gold border-champagne-gold text-midnight-navy'
                  : 'border-navy-200 text-charcoal hover:border-champagne-gold hover:bg-gold-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Price Range */}
      <FilterSection title="Price Range (₹)" id="price-filter">
        <div className="flex gap-3">
          <input
            id="price-min-input"
            type="number"
            placeholder="Min"
            value={searchParams.get('price_min') || ''}
            onChange={(e) => setFilter('price_min', e.target.value || undefined)}
            className="input-field py-2 text-sm"
            min={0}
            aria-label="Minimum price"
          />
          <input
            id="price-max-input"
            type="number"
            placeholder="Max"
            value={searchParams.get('price_max') || ''}
            onChange={(e) => setFilter('price_max', e.target.value || undefined)}
            className="input-field py-2 text-sm"
            min={0}
            aria-label="Maximum price"
          />
        </div>
      </FilterSection>
    </div>
  );
}

function FilterSection({
  title,
  id,
  children,
}: {
  title: string;
  id: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-t border-gold-100 pt-4">
      <button
        id={`${id}-toggle`}
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-sm font-semibold text-midnight-navy mb-3"
        aria-expanded={open}
      >
        {title}
        <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-2"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
