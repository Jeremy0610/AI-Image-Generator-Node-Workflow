# NodeGen UI/UX Design Direction

Date: 2026-06-03
Branch: codex/v2-ui-design

## Product Direction

Use a Google minimalist product framework while preserving the current workflow product language.

The goal is not to redesign the whole app visually. The goal is to improve information architecture, reduce toolbar clutter, and make the workflow editor feel more professional without changing the parts that already work well.

The product name is `NodeGen`.

## Fixed Design Boundaries

- Keep the current node card design.
- Keep the current infinite dotted canvas style.
- Keep connection lines calm and mostly dark gray or black.
- Do not make connection lines multicolored.
- Keep the current node color system:
  - Text Prompt: indigo / blue
  - Image Input: emerald
  - Settings: orange
  - Style Analyzer: purple
  - Creative Master: teal
  - Prompt Merger: orange
  - Generator: dark navy / blue
  - Output: pink / neutral
  - Sticky Note: yellow
- Use Google-style layout, spacing, hierarchy, and clean surfaces.
- Avoid glassmorphism for the main direction.

## Recommended Structure

### Left Sidebar

Move the current top node toolbar into a left sidebar.

Group the sidebar into clear sections:

1. Nodes
   - Text Prompt
   - Image Input
   - Settings
   - Style Analyzer
   - Creative Master
   - Prompt Merger
   - Generator
   - Output
   - Sticky Note

2. Arrange
   - Align Left
   - Align Top
   - Group (Ctrl+G)

3. Project
   - New
   - Import
   - Export
   - Save

Sidebar buttons should be compact and scannable. Do not keep repeating "Add" in every label inside the sidebar, because the sidebar context already means adding tools.

### Top Bar

The top bar should become a project/status bar, not a node creation toolbar.

Keep only global information and project-level actions:

- Project name
- API Key status
- Local save status
- Last saved time
- Storage usage
- Undo / redo if added later
- Small project actions if needed

Do not show the current model name in the top bar. The model is an implementation detail and creates unnecessary visual noise during normal workflow editing. Model information can stay inside settings or diagnostics if needed.

### Canvas

The canvas should stay visually quiet.

- Preserve the current light dotted background.
- Preserve the current open infinite canvas feeling.
- Keep connection lines dark and low-distraction.
- Use subtle selected-node states.
- Do not add large gradients, decorative panels, or heavy background effects.
- Preserve the bottom-right minimap / overview. It is important for large workflows because users need spatial orientation and a quick way to understand where they are in the canvas.
- The minimap is an overlay only. Workflow connection lines must never connect to the minimap.
- Keep only one canvas control toolbar. The zoom / fit view / lock controls should stay in the bottom-left. Do not duplicate these controls on the right side beside the minimap.
- The bottom-right area should contain only the minimap / canvas overview, not extra zoom buttons, lock buttons, or a second navigation toolbar.

### Node Cards

Do not redesign the node cards. Only polish consistency:

- Keep current card size, rounded shape, shadows, title bars, buttons, and internal layouts.
- Standardize close button placement.
- Standardize loading states.
- Standardize error messages.
- Standardize success/result areas.
- Slightly improve handle hit area if needed, without making handles visually heavy.

### Complex Nodes

Creative Master and future complex nodes should eventually support collapsed and expanded states.

Collapsed summary could show:

- Connected image count
- Selected views count
- Generated prompt count
- Last run status

This prevents large workflows from becoming visually crowded.

### Project Entry Page

Keep the entry page simple and project-first:

- Recent local projects
- Create new workflow
- Import project package
- API Key status
- Local storage status
- Auto-save status

Avoid making the entry page decorative or marketing-heavy.

Use `NodeGen` as the product title on the entry page.

Entry page UX recommendations:

- Treat the entry page as a project launcher, not a marketing landing page.
- The first visual priority should be "continue an existing workflow" and "create a new workflow".
- Recent projects should be the primary content area and should appear near the top of the page.
- Create New Workflow and Import Project should sit directly with the projects section, because they are project actions.
- API Key status should be reduced to a compact status chip or small row item. It should not use a large card.
- Local project library status should be reduced to a compact status chip or small row item. It should not use a large card.
- Storage usage and auto-save status should be secondary footer or side metadata, not the main content.
- Remove or strongly reduce any large status panels above the project list.
- The page should answer "which project do I open next?" before it answers "is the system ready?".
- Do not duplicate storage or auto-save information. If storage and auto-save are shown in the compact status strip, do not repeat them in a bottom footer.
- API Key must look clickable and actionable, not only like a passive status indicator.
- Recommended API Key entry label:
  - If configured: `API Key Ready · Manage`
  - If missing: `Add API Key`
  - If invalid: `API Key Issue · Fix`
- The API Key control should use a button/chip-button treatment with a chevron, edit icon, or "Manage" text so users understand they can click it to enter their own API key.
- Local Library, Autosave, and Storage can remain passive status chips because they are informational.
- Recent project cards should show only the most useful metadata:
  - Project name
  - Thumbnail
  - Last edited time
  - Saved locally status
  - Overflow menu for rename / duplicate / delete
- Avoid a heavy left navigation with many inactive sections unless those sections are real features. If Templates is not implemented yet, do not show it as a primary navigation item.
- Help and settings can stay in the top-right as small icon buttons.
- Keep the background quiet and close to the editor's dotted canvas language, so the product feels consistent from entry page to editor.

## Implementation Order

1. Move node creation tools from the top toolbar to the left sidebar.
2. Convert the top toolbar into a clean project/status bar.
3. Keep node cards visually unchanged, but standardize spacing and states.
4. Improve save status, storage status, and API Key status visibility.
5. Add collapsed state for complex nodes later.
6. Polish the project entry page after the editor structure is stable.

## Editor Acceptance Criteria

When implementing the editor UI:

- There must be exactly one zoom / fit view / lock control group.
- The control group must stay bottom-left unless a later design explicitly changes this.
- The minimap must stay bottom-right.
- The minimap must never be treated as a workflow node.
- Edges must render only between real workflow nodes.
- No edge endpoint should visually touch or terminate on the minimap.
- The top bar must not show the model name.

## Version Safety Plan

Before implementing UI changes, preserve the current working state.

Recommended approach:

1. Keep the existing `codex/v2-engineering` branch as the current engineering baseline.
2. Create a new local branch for the UI experiment, for example:
   - `codex/v2-ui-design`
3. Make UI changes only on the new branch.
4. Do not merge back until the design is approved.
5. Do not push or deploy without explicit confirmation.

This keeps the current version recoverable and lets the UI redesign be reviewed independently.
