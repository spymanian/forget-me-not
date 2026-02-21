import GoogleSignIn from "@/components/GoogleSignIn";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-8 font-sans dark:bg-black">
      <main className="w-full max-w-lg rounded-xl bg-white p-8 shadow-sm dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Forget Me Not
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-300">
          Sign in to create and open encrypted capsules.
        </p>
        <div className="mt-6">
          <GoogleSignIn />
        </div>
        <a href="/dashboard" className="mt-4 inline-block text-sm text-zinc-700 underline dark:text-zinc-200">
          Go to dashboard
        </a>
      </main>
    </div>
  );
}
