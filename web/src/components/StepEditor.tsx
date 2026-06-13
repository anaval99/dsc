/**
 * Ordered step blocks for the recipe form (project-plan.md §7). Free-text
 * blocks; each renders as one card in the app.
 */

"use client";

export function StepEditor({ steps, onChange }: { steps: string[]; onChange: (next: string[]) => void }) {
  function update(index: number, value: string) {
    onChange(steps.map((s, i) => (i === index ? value : s)));
  }
  function add() {
    onChange([...steps, ""]);
  }
  function remove(index: number) {
    onChange(steps.filter((_, i) => i !== index));
  }

  return (
    <fieldset className="editor-group">
      <legend>Steps</legend>
      {steps.map((step, i) => (
        <div className="step-row" key={i}>
          <span className="step-number" aria-hidden="true">
            {i + 1}
          </span>
          <textarea
            className="step-text"
            rows={2}
            placeholder={`Step ${i + 1}`}
            aria-label={`Step ${i + 1}`}
            value={step}
            onChange={(e) => update(i, e.target.value)}
          />
          <button
            type="button"
            className="btn btn-ghost btn-remove"
            aria-label={`Remove step ${i + 1}`}
            onClick={() => remove(i)}
            disabled={steps.length === 1}
          >
            ✕
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-ghost" onClick={add}>
        + Add step
      </button>
    </fieldset>
  );
}
