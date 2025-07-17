# ScriptFollower Context Engineering Rules

## General
- Use Vue 3 `<script setup>` syntax for all components.
- Prefer Composition API (`ref`, `reactive`, `watch`, etc.) over Options API.
- Use `async/await` for asynchronous operations.
- All stateful logic should be managed via `reactive` or `ref` objects.
- Use clear, descriptive variable and function names.
- The base folder for the main project is 'script-follower-vite' all other folder references should be relative to this
- All modules should be imported from `/src/modules/` or `/src/components/`.

## State Management
- Use a single `state` object (created with `reactive`) for global app state.
- Pass `state` as a prop to child components when needed.
- Avoid using Vuex or external state libraries unless absolutely necessary.

## Components
- Components should be placed in `/src/components/`.
- Props should be explicitly typed and documented.
- Use events (`@event-name`) for communication from child to parent.
- Use `v-model` for two-way binding where appropriate.

## Styling
- use the `/src/css` folder for custom styles. 
- each component has it's own css file
- use app.css for general application wide styling

## Context Modules
- Place context-related logic in `/src/context/`.
- Context modules should export composables (functions starting with `use...`).
- Context should be injected via composables, not via global variables.

## Document & Sound Processing
- Use `DocumentProcessor`, `SoundProcessor`, and `SoundManager` classes from `/src/modules/`.
- Always update `state` when document or sound data changes.
- Use helper functions from `/src/modules/utilities.js` for CSV and text processing.

## Error Handling
- Always set `state.error` with a user-friendly message on error.
- Clear `state.error` when retrying or resolving errors.

## UI/UX
- Use `state.message` for status updates (e.g., loading, success).
- Use `state.error` for error messages.
- Implement autoscroll and keyboard navigation as shown in `App.vue`.

## Local Storage
- Use `docProcessor.saveToLocalStorage()`, `restoreFromLocalStorage()`, and `clearLocalStorage()` for persistence.

## Accessibility
- Ensure keyboard navigation works for all interactive elements.
- Use semantic HTML and ARIA attributes where appropriate.

## Testing
- Unit tests should be placed in `/src/__tests__/`.
- Use Jest or Vitest for testing.

## Comments
- Use line comments (`// ...`) for inline explanations.
- Use block comments (`/** ... */`) for function documentation.

## File Naming
- Use camelCase for JS/TS files and PascalCase for Vue components.

## Example Imports
```js
import { reactive, ref, watch } from 'vue'
import { DocumentProcessor } from './modules/documentProcessor'
import { useSpeechRecognition } from './modules/speechRecognition'
```

## Example State
```js
const state = reactive({
  message: '',
  error: '',
  transcript: '',
  listening: false,
  // ...other fields
})
```

---

**Always follow these rules when generating or modifying code for this project.**