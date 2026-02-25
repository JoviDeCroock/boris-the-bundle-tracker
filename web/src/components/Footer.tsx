export function Footer() {
  return (
    <footer class="bg-neutral-950 border-t border-neutral-800/60 py-10 px-6">
      <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <a href="/" class="flex items-center gap-2.5">
          <div
            class="w-6 h-6 rounded-md flex items-center justify-center text-neutral-950 font-bold text-xs"
            style="background: #f97316;"
          >
            B
          </div>
          <span class="text-sm font-bold text-white tracking-tight">Boris</span>
        </a>
        <nav class="flex gap-6 text-sm text-neutral-600">
          <a href="#features" class="hover:text-neutral-300 transition-colors">
            Features
          </a>
          <a href="#how-it-works" class="hover:text-neutral-300 transition-colors">
            How it works
          </a>
          <a
            href="https://github.com/JoviDeCroock/boris-the-bundle-tracker"
            class="hover:text-neutral-300 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </nav>
        <p class="font-mono text-xs text-neutral-700">&copy; {new Date().getFullYear()} Boris</p>
      </div>
    </footer>
  );
}
