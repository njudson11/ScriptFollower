# Feature Annotations System

## Overview

The `AnnotationManager` is now responsible for parsing, updating, and serializing annotations. It correctly handles annotations that are part of a larger text block, preserving any user-written text outside of the `{...}` block.

## IAnnotation Interface

```typescript
interface Annotation {
  readonly name: string                  // e.g., 'volume', 'color'
  readonly description: string           // What this does
  readonly type: 'string' | 'number' | 'boolean' | 'enum' | 'color'
  readonly defaultValue?: any            // Default if not specified
  readonly constraints?: {
    readonly min?: number
    readonly max?: number
    readonly pattern?: string
    readonly enum?: readonly any[]
  }
  readonly parseValue: (value: string) => any
  readonly validateValue: (value: any) => boolean
}
```

## Annotation Manager

The `AnnotationManager` provides methods to safely interact with annotation strings.

```typescript
export class AnnotationManager {
  /**
   * Registers annotation definitions for a specific feature.
   */
  registerFeatureAnnotations(featureId: string, annotations: Annotation[]): void

  /**
   * Parses an annotation string into a raw key-value map.
   */
  parseRaw(annotationStr: string | undefined): Map<string, string>

  /**
   * Serializes a raw map back into an annotation string.
   */
  serializeRaw(annotations: Map<string, string>): string

  /**
   * Updates an annotation string by merging new values into the braced key-value block.
   * Preserves any text outside of the braces.
   * If a value is null, the key is removed. If the resulting block is empty, the block is removed.
   */
  update(existingStr: string | undefined, updates: Record<string, string | number | boolean | null>): string

  /**
   * Merges updates into an existing annotation string.
   * If a value is null, the key is removed.
   * @deprecated Use `update` to preserve surrounding text. This method will be removed.
   */
  merge(existingStr: string | undefined, updates: Record<string, string | number | boolean | null>): string

  /**
   * Gets the parsed and validated value for a specific annotation on a line.
   */
  getValue(annotationStr: string | undefined, key: string): any
}
```

## Sound Feature Annotations

Sound Feature declares:

```typescript
getAnnotations(): Annotation[] {
  return [
    {
      name: 'volume',
      description: 'Sound volume (0-150)',
      type: 'number',
      defaultValue: 100,
      parseValue: (val) => parseFloat(val),
      validateValue: (val) => val >= 0 && val <= 150
    },
    {
        name: 'pan',
        description: 'Stereo pan (-1 to 1, or left/center/right)',
        type: 'string', // Can be string or number
        defaultValue: 'center',
        parseValue: (val) => {
          const lowerVal = val.toLowerCase();
          if (['left', 'center', 'right'].includes(lowerVal)) {
            return lowerVal;
          }
          const num = parseFloat(val);
          return isNaN(num) ? lowerVal : num;
        },
        validateValue: (val) => {
          if (typeof val === 'string') {
            return ['left', 'center', 'right'].includes(val);
          }
          if (typeof val === 'number') {
            return val >= -1 && val <= 1;
          }
          return false;
        }
    },
    {
      name: 'start',
      description: 'Start offset in seconds',
      type: 'number',
      defaultValue: 0,
      parseValue: (val) => parseFloat(val),
      validateValue: (val) => val >= 0
    },
    {
      name: 'end',
      description: 'End offset in seconds',
      type: 'number',
      defaultValue: 0,
      parseValue: (val) => parseFloat(val),
      validateValue: (val) => val >= 0
    },
    {
      name: 'fade-in',
      description: 'Fade in duration (milliseconds)',
      type: 'number',
      defaultValue: 0,
      parseValue: (val) => parseFloat(val),
      validateValue: (val) => val >= 0
    },
    {
      name: 'fade-out',
      description: 'Fade out duration (milliseconds)',
      type: 'number',
      defaultValue: 0,
      parseValue: (val) => parseFloat(val),
      validateValue: (val) => val >= 0
    }
  ]
}
```

## Syntax

Annotations can be part of a larger text block within the `annotation` property of a line.

```
This is a user note. {volume=80, pan=0.5}
```

### Examples

Sound cue with a note and volume at 50%:
```
My note about the sound. {volume=50}
```

Multiple annotations, including a numeric pan:
```
{volume=75, pan=-0.7, fade-in=500}
```

## Parsing and Updating

The `AnnotationManager.update` method is smart enough to handle these cases:

```typescript
const original = "My note {volume=90}";

// Update the volume
const updated = annotationManager.update(original, { volume: 75 });
// Result: "My note {volume=75}"

// Add a new pan value
const withPan = annotationManager.update(updated, { pan: -0.5 });
// Result: "My note {volume=75, pan=-0.5}"

// Remove the volume by passing null
const noVolume = annotationManager.update(withPan, { volume: null });
// Result: "My note {pan=-0.5}"

// Remove the last value, which also removes the braces
const final = annotationManager.update(noVolume, { pan: null });
// Result: "My note"
```

## Validation

Validation is handled internally by the `AnnotationManager` when `getValue` is called. If a value is invalid, the annotation's `defaultValue` is returned.

```typescript
// Annotation string: "{pan=2.5}" (2.5 is invalid, max is 1)
const panValue = annotationManager.getValue("{pan=2.5}", "pan");

// `panValue` will be 'center', the defaultValue for the 'pan' annotation.
```
