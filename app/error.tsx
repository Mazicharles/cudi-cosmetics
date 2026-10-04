'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="panel">
      <h1 className="text-4xl">A little pause</h1>
      <p className="my-5">
        We could not load this page. Please try again in a moment.
      </p>
      <button onClick={reset} className="btn">
        Try again
      </button>
    </div>
  );
}
