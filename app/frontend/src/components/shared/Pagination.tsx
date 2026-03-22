import React from 'react';

interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  limit: number;
  onPage: (p: number) => void;
}

/**
 * Simple page-number pagination bar.
 * Shows first, prev, up to 5 surrounding pages, next, last.
 */
const Pagination: React.FC<PaginationProps> = ({ page, pages, total, limit, onPage }) => {
  if (pages <= 1) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  // Build the window of page numbers to show
  const delta = 2;
  const start = Math.max(1, page - delta);
  const end = Math.min(pages, page + delta);
  const pageNums: number[] = [];
  for (let i = start; i <= end; i++) pageNums.push(i);

  const btnBase: React.CSSProperties = {
    minWidth: '2rem',
    height: '2rem',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    fontSize: '0.8125rem',
    fontWeight: 500,
    cursor: 'pointer',
    border: '1px solid var(--oai-border)',
    backgroundColor: 'transparent',
    color: 'var(--oai-muted)',
    transition: 'all 0.15s',
    padding: '0 0.4rem',
  };

  const activeStyle: React.CSSProperties = {
    ...btnBase,
    backgroundColor: 'var(--oai-green)',
    borderColor: 'var(--oai-green)',
    color: '#0d0d0d',
  };

  const disabledStyle: React.CSSProperties = {
    ...btnBase,
    opacity: 0.35,
    cursor: 'not-allowed',
  };

  return (
    <div className='flex flex-col items-center gap-2 mt-6'>
      <p className='text-xs' style={{ color: 'var(--oai-subtle)' }}>
        Showing {from}–{to} of {total} book{total !== 1 ? 's' : ''}
      </p>
      <div className='flex items-center gap-1'>
        {/* First */}
        <button
          onClick={() => onPage(1)}
          disabled={page === 1}
          style={page === 1 ? disabledStyle : btnBase}
          title='First page'
        >
          «
        </button>

        {/* Prev */}
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          style={page === 1 ? disabledStyle : btnBase}
          title='Previous page'
        >
          ‹
        </button>

        {/* Leading ellipsis */}
        {start > 1 && (
          <span style={{ ...btnBase, cursor: 'default', border: 'none' }}>…</span>
        )}

        {/* Page numbers */}
        {pageNums.map((n) => (
          <button
            key={n}
            onClick={() => onPage(n)}
            style={n === page ? activeStyle : btnBase}
          >
            {n}
          </button>
        ))}

        {/* Trailing ellipsis */}
        {end < pages && (
          <span style={{ ...btnBase, cursor: 'default', border: 'none' }}>…</span>
        )}

        {/* Next */}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page === pages}
          style={page === pages ? disabledStyle : btnBase}
          title='Next page'
        >
          ›
        </button>

        {/* Last */}
        <button
          onClick={() => onPage(pages)}
          disabled={page === pages}
          style={page === pages ? disabledStyle : btnBase}
          title='Last page'
        >
          »
        </button>
      </div>
    </div>
  );
};

export default Pagination;
