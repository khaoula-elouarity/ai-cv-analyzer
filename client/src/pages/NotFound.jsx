import { Link } from 'react-router-dom';
import { Home, Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <div className="max-w-md text-center">
        <p className="text-gradient text-6xl font-bold">404</p>
        <h1 className="mt-4 text-xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-[--color-muted]">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <Link to="/dashboard" className="btn btn-primary">
            <Home className="size-4" /> Go to dashboard
          </Link>
          <Link to="/upload" className="btn btn-ghost">
            <Compass className="size-4" /> Upload a CV
          </Link>
        </div>
      </div>
    </div>
  );
}
