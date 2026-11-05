// The small amber tag on a record with a change waiting for a checker.
export function PendingTag({ children }) {
  return <span className="whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">{children}</span>;
}
