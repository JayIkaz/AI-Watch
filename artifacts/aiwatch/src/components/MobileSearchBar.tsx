import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { useSearchParams } from "wouter";

export function MobileSearchBar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentQ = searchParams.get("q") ?? "";
  const [inputValue, setInputValue] = useState(currentQ);

  useEffect(() => {
    setInputValue(searchParams.get("q") ?? "");
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (inputValue.trim()) {
        next.set("q", inputValue.trim());
      } else {
        next.delete("q");
      }
      return next;
    });
  };

  const handleClear = () => {
    setInputValue("");
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete("q");
      return next;
    });
  };

  return (
    <form onSubmit={handleSubmit} className="md:hidden mb-4">
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder="Search intelligence..."
          className="w-full bg-card border border-border rounded-xl py-2.5 pl-9 pr-8 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-muted-foreground"
        />
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </form>
  );
}
