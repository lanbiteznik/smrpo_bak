'use client';

if (typeof window !== 'undefined') {
  import('bootstrap').then((bootstrap) => {
    // Initialize all Bootstrap components
    bootstrap.Tooltip.Default.allowList = { ...bootstrap.Tooltip.Default.allowList };
  });
}
