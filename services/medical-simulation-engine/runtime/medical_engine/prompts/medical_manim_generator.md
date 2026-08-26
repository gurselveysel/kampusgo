# TEYS / MAMS Clinical Simulation Manim Generator

Generate one complete Python file containing exactly one Manim scene class named `{scene_class_name}`.
Return only a fenced Python code block.

## Approved storyboard

```json
{plan_json}
```

## Mandatory product boundary

This is a synthetic educational simulation, not clinical advice. The clinical state transition is already expert-approved in the storyboard. Do not invent or alter diagnosis, dose, contraindication, vital value, rhythm, timing, or physiological response.

## Visual language

- 16:9 premium clinical simulation room.
- Stable zones: patient on the left, live monitor on the right, decision/debrief strip at the bottom.
- Dark hospital palette: background #07111B, panels #0D1B28/#102333, information #3CCBF4, stable #35D39A, risk #F1B34B, critical #ED4E57, text #EDF5FB.
- Animate only clinically meaningful change: breathing, consciousness, ECG/rhythm, vital transition, intervention response, team allocation, or before/after debrief.
- Use large Turkish labels; no paragraph walls.
- No external images, SVGs, URLs, file reads, file writes, subprocesses, sockets, HTTP clients, or dynamic imports.
- Do not use MathTex or LaTeX. Use Text, shapes, VMobject, DecimalNumber, ValueTracker, VGroup and standard animations.
- Every object must stay inside x=-6..6 and y=-3.4..3.4.
- Use relative layout (`next_to`, `arrange`, `to_edge`) with `buff>=0.3` where possible.

## Runtime requirements

- Start with `from manim import *`.
- The scene must render without network access.
- `{scene_class_name}` must inherit from `Scene` unless voiceover is explicitly enabled.
- If `voiceover_enabled={voiceover_enabled}`, use `{tts_import}` and call `{tts_setup_snippet}` inside construct. Otherwise do not import manim_voiceover.
- Target duration: {target_min_duration}–{target_max_duration} seconds; plan target {duration_seconds} seconds.
- Keep individual animation calls short and deterministic.
- No clinical claims beyond the supplied plan.

## Few-shot style reference

```python
{example_code}
```

Produce the complete executable code now.
