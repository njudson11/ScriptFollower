# Feature Annotations System

## Overview

Annotations enable per-line, feature-specific configuration without modifying the script data. They use `{annotation=value}` syntax parsed from line text.

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

```typescript
class AnnotationManager {
  registerAnnotation(featureId: string, annotation: Annotation): void
  unregisterAnnotation(featureId: string, annotationName: string): void
  
  getAnnotationsForFeature(featureId: string): Annotation[]
  
  parseAnnotations(lineText: string): Map<string, any>
  validateAnnotations(annotations: Map<string, any>, context: any): boolean
  
  applyAnnotations(lineId: string, annotations: Map<string, any>): Promise<void>
}
```

## Sound Feature Annotations

Sound Feature declares:

```typescript
getAnnotations(): Annotation[] {
  return [
    {
      name: 'volume',
      description: 'Sound volume (0-100)',
      type: 'number',
      defaultValue: 100,
      constraints: { min: 0, max: 100 },
      parseValue: (val) => parseInt(val),
      validateValue: (val) => val >= 0 && val <= 100
    },
    {
      name: 'speed',
      description: 'Playback speed (0.5-2.0)',
      type: 'number',
      defaultValue: 1.0,
      constraints: { min: 0.5, max: 2.0 },
      parseValue: (val) => parseFloat(val),
      validateValue: (val) => val >= 0.5 && val <= 2.0
    },
    {
      name: 'fade-in',
      description: 'Fade in duration (milliseconds)',
      type: 'number',
      defaultValue: 0,
      constraints: { min: 0 },
      parseValue: (val) => parseInt(val),
      validateValue: (val) => val >= 0
    },
    {
      name: 'fade-out',
      description: 'Fade out duration (milliseconds)',
      type: 'number',
      defaultValue: 0,
      constraints: { min: 0 },
      parseValue: (val) => parseInt(val),
      validateValue: (val) => val >= 0
    },
    {
      name: 'loop',
      description: 'Loop playback',
      type: 'boolean',
      defaultValue: false,
      parseValue: (val) => val.toLowerCase() === 'true',
      validateValue: (val) => typeof val === 'boolean'
    },
    {
      name: 'delay',
      description: 'Delay before playing (milliseconds)',
      type: 'number',
      defaultValue: 0,
      constraints: { min: 0 },
      parseValue: (val) => parseInt(val),
      validateValue: (val) => val >= 0
    },
    {
      name: 'pan',
      description: 'Stereo pan (left, center, right)',
      type: 'enum',
      defaultValue: 'center',
      constraints: { enum: ['left', 'center', 'right'] },
      parseValue: (val) => val.toLowerCase(),
      validateValue: (val) => ['left', 'center', 'right'].includes(val)
    },
    {
      name: 'stop',
      description: 'Stop behavior (all, previous, or cue IDs)',
      type: 'string',
      parseValue: (val) => val.trim(),
      validateValue: (val) => {
        if (val === 'all' || val === 'previous') return true
        // Comma-separated cue IDs: cue_1,cue_2,cue_3
        return val.split(',').every(id => id.trim().match(/^cue_\d+$/))
      }
    }
  ]
}
```

## Syntax

Annotations appear in curly braces with `=` assignments:

```
{annotation=value}
{annotation1=value1, annotation2=value2}
```

### Examples

Sound cue with volume at 50%:
```
JOHN
{volume=50}
Hello, how are you?
```

Multiple annotations:
```
JOHN
{volume=75, speed=1.2, fade-in=500}
This is important dialogue.
```

Stop action with specific cues:
```
JOHN
{stop=cue_1,cue_3}
Quiet down!
```

Stop all sounds:
```
SOUND_EFFECT
{stop=all}
Thunder crashes.
```

## Parsing

```typescript
function parseAnnotations(lineText: string): Map<string, any> {
  const annotations = new Map<string, any>()
  
  // Match pattern: {key=value, key2=value2}
  const match = lineText.match(/\{([^}]+)\}/)
  if (!match) return annotations
  
  const pairs = match[1].split(',')
  for (const pair of pairs) {
    const [key, value] = pair.split('=').map(s => s.trim())
    if (key && value) {
      annotations.set(key, value)
    }
  }
  
  return annotations
}

// Example
parseAnnotations('{volume=50, speed=1.2}')
// Map { 'volume' => '50', 'speed' => '1.2' }
```

## Feature Scoping

**Critical**: Annotations only apply if the feature exists on the line.

```typescript
class SoundFeature {
  applyAnnotations(lineId: string, annotations: Map<string, any>) {
    // Only apply if this line has a sound cue
    const cues = this.getCuesForLine(lineId)
    if (cues.length === 0) {
      // Silently ignore - sound feature isn't used on this line
      return
    }
    
    // Apply annotations to cues
    for (const [key, value] of annotations) {
      if (key === 'volume') {
        cues.forEach(cue => cue.volume = this.parseVolume(value))
      } else if (key === 'speed') {
        cues.forEach(cue => cue.speed = this.parseSpeed(value))
      }
      // ...
    }
  }
}

class LightsFeature {
  applyAnnotations(lineId: string, annotations: Map<string, any>) {
    // Only apply if this line has lights
    if (!this.hasLightsForLine(lineId)) {
      return
    }
    
    // Apply annotations to lights
    for (const [key, value] of annotations) {
      if (key === 'color') {
        this.setLightColor(lineId, value)
      } else if (key === 'intensity') {
        this.setLightIntensity(lineId, parseFloat(value))
      }
    }
  }
}
```

## Validation

```typescript
function validateAnnotations(
  annotations: Map<string, any>,
  annotationDefs: Annotation[]
): string[] {
  const errors: string[] = []
  const defMap = new Map(annotationDefs.map(a => [a.name, a]))
  
  for (const [name, value] of annotations) {
    const def = defMap.get(name)
    if (!def) {
      errors.push(`Unknown annotation: ${name}`)
      continue
    }
    
    const parsed = def.parseValue(value)
    if (!def.validateValue(parsed)) {
      errors.push(`Invalid value for ${name}: ${value}`)
    }
  }
  
  return errors
}
```

## Stop Annotation

Special annotation for stopping sounds:

```typescript
{
  name: 'stop',
  description: 'Stop behavior for this line',
  type: 'string'
}
```

### Stop Modes

**1. Stop All Sounds**
```
{stop=all}
```
Stops all currently playing sounds in document.

**2. Stop Previous Line's Sound**
```
{stop=previous}
```
Stops the sound from the previous line only.

**3. Stop Specific Cues**
```
{stop=cue_1,cue_3,cue_5}
```
Stops specific cue IDs (comma-separated, no spaces).

## Usage Patterns

### Sound with Specific Volume

```
JOHN
{volume=60}
This is delivered quietly.
```

The line has a sound cue (registered via Sound Feature panel), then the annotation modifies its volume to 60%.

### Multiple Features on Same Line

```
STAGE_DIRECTION
{sound-volume=50, lights-intensity=80}
Thunder crashes. Lightning flashes.
```

Both Sound and Lights features apply their annotations to this line.

### Lighting Effect

```
SCENE_HEADING
{lights-color=#FF0000, lights-intensity=100}
INT. OFFICE - RED ALERT
```

Lights change to red at full intensity when this scene heading appears.

### Conditional Playback

```
JOHN
{volume=30, speed=1.5}
(whispered urgently)
Meet me tonight.
```

Sound plays at 30% volume, 1.5x speed (higher pitch/faster).

## Feature Annotation Declaration

```typescript
class LightsFeature implements FeaturePlugin {
  getAnnotations(): Annotation[] {
    return [
      {
        name: 'lights-color',
        description: 'Light color (hex or named)',
        type: 'color',
        parseValue: (val) => val.trim(),
        validateValue: (val) => /^#[0-9A-F]{6}$|^(red|green|blue|yellow)$/i.test(val)
      },
      {
        name: 'lights-intensity',
        description: 'Light intensity (0-100)',
        type: 'number',
        defaultValue: 100,
        constraints: { min: 0, max: 100 },
        parseValue: (val) => parseInt(val),
        validateValue: (val) => val >= 0 && val <= 100
      },
      {
        name: 'lights-fade',
        description: 'Fade duration (milliseconds)',
        type: 'number',
        parseValue: (val) => parseInt(val),
        validateValue: (val) => val >= 0
      }
    ]
  }
}
```

## Parsing Pipeline

```typescript
// 1. Extract annotation text from line
const lineText = "JOHN\n{volume=50}\nHello."
const annotationText = '{volume=50}'

// 2. Parse into map
const parsed = parseAnnotations(annotationText)
// Map { 'volume' => '50' }

// 3. Validate values
const errors = validateAnnotations(parsed, annotationDefs)
if (errors.length > 0) {
  eventBus.emit({
    type: EVENT_TYPES.ANNOTATION_ERROR,
    payload: { lineId, annotationText, error: errors.join('; ') },
    timestamp: new Date()
  })
  return
}

// 4. Apply to features
for (const feature of features) {
  await feature.applyAnnotations?.(lineId, parsed)
}

// 5. Emit success
eventBus.emit({
  type: EVENT_TYPES.ANNOTATION_PARSED,
  payload: { lineId, annotations: Object.fromEntries(parsed) },
  timestamp: new Date()
})
```

## Error Handling

```typescript
class AnnotationProcessor {
  async processLine(lineId: string, lineText: string) {
    try {
      const annotations = parseAnnotations(lineText)
      const errors = validateAnnotations(annotations, this.allAnnotations)
      
      if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join('; ')}`)
      }
      
      for (const feature of this.features) {
        try {
          await feature.applyAnnotations?.(lineId, annotations)
        } catch (error) {
          this.eventBus.emit({
            type: EVENT_TYPES.ANNOTATION_ERROR,
            payload: {
              lineId,
              featureId: feature.id,
              error: error instanceof Error ? error.message : String(error)
            },
            timestamp: new Date()
          })
        }
      }
    } catch (error) {
      this.eventBus.emit({
        type: EVENT_TYPES.ANNOTATION_ERROR,
        payload: {
          lineId,
          error: error instanceof Error ? error.message : String(error)
        },
        timestamp: new Date()
      })
    }
  }
}
```

## Benefits

✅ **Feature-Scoped**: Only applies if feature is used on line
✅ **Type-Safe**: Validation prevents invalid values
✅ **Declarative**: Features declare what they support
✅ **No Core Changes**: Adding annotation types requires no core updates
✅ **Human-Readable**: `{volume=50}` is clear and editable
✅ **Extensible**: New features = new annotation types
✅ **Backwards Compatible**: Missing annotations use defaults
