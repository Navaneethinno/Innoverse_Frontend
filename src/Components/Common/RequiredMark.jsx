// The asterisk after a required field's label (the API refuses the save
// without it), the same on every form.
export function RequiredMark() {
  return (
    <span aria-hidden="true" className="text-red-500">
      {" "}*
    </span>
  );
}
