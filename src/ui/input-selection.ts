export function selectInputContents(event: Event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || input.readOnly || !["text", "number"].includes(input.type)) return;
  if (event.type === "pointerdown") {
    if (!input.value) return;
    event.preventDefault();
  }
  input.focus();
  input.select();
}
