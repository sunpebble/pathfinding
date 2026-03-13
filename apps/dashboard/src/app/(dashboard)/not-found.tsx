import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-bold text-gray-900">404</h2>
        <h3 className="text-xl text-gray-700">Page Not Found</h3>
        <p className="text-gray-500 max-w-md">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
