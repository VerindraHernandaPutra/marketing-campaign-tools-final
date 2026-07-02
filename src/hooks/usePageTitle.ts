import { useEffect } from 'react';

const usePageTitle = (page: string) => {
  useEffect(() => {
    document.title = `${page} — Marketing Campaign Platform`;
    return () => { document.title = 'Marketing Campaign Platform'; };
  }, [page]);
};

export default usePageTitle;
