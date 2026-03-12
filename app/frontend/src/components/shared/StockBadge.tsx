import React from 'react';

interface StockBadgeProps {
  stock: number;
}

const StockBadge: React.FC<StockBadgeProps> = ({ stock }) =>
  stock > 0 ? (
    <span className='badge-green'>{stock} in stock</span>
  ) : (
    <span className='badge-red'>Out of stock</span>
  );

export default StockBadge;
