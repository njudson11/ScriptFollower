# Error Handling Strategy

## Overview

ScriptFollower 3 implements comprehensive error handling at multiple levels to ensure stability and provide meaningful feedback to users.

## Error Categories

### 1. Document Loading Errors

**Scenarios:**
- Unsupported file format
- Corrupted file
- File too large (>50MB)
- Permission denied

**Handling:**
```typescript
const handleFileUpload = async (file: File) => {
  try {
    if (file.size > 50 * 1024 * 1024) {
      throw new Error('File is too large (max 50MB)')
    }
    
    const document = await processor.processFile(file)
    appStore.loadDocument(document)
  } catch (error) {
    appStore.setError(error instanceof Error ? error.message : 'Failed to load document')
    eventBus.emit({
      type: EVENT_TYPES.DOCUMENT_ERROR,
      payload: { fileName: file.name, error },
      timestamp: new Date()
    })
  }
}
```

### 2. Parser Errors

**Handling Corrupted Files:**
```typescript
async parseODT(file: File): Promise<Document> {
  try {
    const zip = new JSZip()
    await zip.loadAsync(file)
    const contentFile = zip.file('content.xml')
    
    if (!contentFile) {
      throw new Error('Invalid ODT: content.xml not found')
    }
    
    const xmlContent = await contentFile.async('text')
    const xmlDoc = new DOMParser().parseFromString(xmlContent, 'text/xml')
    
    if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
      throw new Error('Malformed XML in ODT')
    }
    
    return this.extractDocument(xmlDoc)
  } catch (error) {
    eventBus.emit({
      type: EVENT_TYPES.DOCUMENT_ERROR,
      payload: {
        documentName: file.name,
        error: error instanceof Error ? error.message : String(error),
        parser: 'ODT'
      },
      timestamp: new Date()
    })
    throw error
  }
}
```

### 3. Feature Errors

**Feature Initialization:**
```typescript
async registerFeature(feature: FeaturePlugin) {
  try {
    await feature.init()
    this.features.set(feature.id, feature)
    
    eventBus.emit({
      type: EVENT_TYPES.FEATURE_INITIALIZED,
      payload: { featureId: feature.id, featureName: feature.name },
      timestamp: new Date()
    })
  } catch (error) {
    eventBus.emit({
      type: EVENT_TYPES.FEATURE_ERROR,
      payload: {
        featureId: feature.id,
        error: error instanceof Error ? error.message : String(error),
        severity: 'error'
      },
      timestamp: new Date()
    })
    // Don't throw - allow app to continue without this feature
  }
}
```

**Feature Runtime Errors:**
```typescript
async executeKeybinding(binding: KeyBinding, context: any) {
  try {
    await binding.handler(context)
  } catch (error) {
    eventBus.emit({
      type: EVENT_TYPES.KEYBINDING_TRIGGERED,
      payload: {
        keybindingId: binding.id,
        featureId: binding.featureId,
        error: error instanceof Error ? error.message : String(error)
      },
      timestamp: new Date()
    })
  }
}
```

### 4. Annotation Errors

**Invalid Annotations:**
```typescript
function validateAnnotations(
  annotations: Map<string, any>,
  definitions: Annotation[]
): string[] {
  const errors: string[] = []
  const defMap = new Map(definitions.map(a => [a.name, a]))
  
  for (const [name, value] of annotations) {
    const def = defMap.get(name)
    if (!def) {
      errors.push(`Unknown annotation: ${name}`)
      continue
    }
    
    try {
      const parsed = def.parseValue(value)
      if (!def.validateValue(parsed)) {
        errors.push(`Invalid value for ${name}: ${value}`)
      }
    } catch (error) {
      errors.push(`Failed to parse ${name}: ${value}`)
    }
  }
  
  return errors
}
```

### 5. UI Component Errors

**Error Boundary:**
```typescript
export default {
  errorCaptured(error: Error, instance: any, info: string) {
    eventBus.emit({
      type: EVENT_TYPES.UI_ERROR,
      payload: {
        error: error.message,
        component: instance.$options.name,
        info
      },
      timestamp: new Date()
    })
    
    // Return false to prevent propagation
    return false
  }
}
```

## Error Display

### Error Banner
```vue
<div v-if="appState.error" class="error-banner">
  <span class="error-message">{{ appState.error }}</span>
  <button @click="dismissError" class="close-btn">×</button>
  <button @click="retryAction" class="retry-btn">Retry</button>
</div>
```

### Problems Panel
Future: List all errors and warnings:
```
Errors (3):
  ✗ Line 5: Unknown annotation "colr" (did you mean "color"?)
  ✗ Document: PDF parsing failed - file corrupted
  ✗ Feature: Sound feature failed to initialize

Warnings (2):
  ⚠ Line 10: Sound volume 150 exceeds maximum (100)
  ⚠ Document: Very large script (5000 lines) may be slow
```

## Error Recovery

### Graceful Degradation
```typescript
// ✅ If Sound Feature fails to init, app continues
try {
  await featureManager.registerFeature(new SoundFeature())
} catch (error) {
  console.warn('Sound Feature disabled:', error)
  // User can still use app without sound
}

// ✅ If one line fails to parse, skip it and continue
for (const line of lines) {
  try {
    processLine(line)
  } catch (error) {
    errors.push({ lineId: line.id, error: error.message })
    // Continue with next line
  }
}
```

### Retry Logic
```typescript
async function retryWithBackoff(
  fn: () => Promise<any>,
  maxAttempts: number = 3,
  delayMs: number = 1000
) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxAttempts - 1) throw error
      
      await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)))
    }
  }
}
```

## Error Logging

### Console Logging
```typescript
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

class Logger {
  log(level: LogLevel, message: string, data?: any) {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] ${LogLevel[level]}`
    
    if (level >= LogLevel.WARN) {
      console.error(`${prefix}: ${message}`, data)
    } else {
      console.log(`${prefix}: ${message}`, data)
    }
  }
}
```

### Error Reporting Service (Future)
```typescript
async function reportError(error: ErrorReport) {
  if (!isOptedIn()) return
  
  try {
    await fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        context: error.context,
        userAgent: navigator.userAgent,
        appVersion: APP_VERSION,
        timestamp: new Date().toISOString()
      })
    })
  } catch (error) {
    // Silently fail, don't recurse
    console.warn('Failed to report error')
  }
}
```

## Testing Error Scenarios

```typescript
describe('Error Handling', () => {
  it('handles corrupted ODT file', async () => {
    const badFile = new File(['corrupted'], 'bad.odt', { type: 'application/vnd.oasis.opendocument.text' })
    
    try {
      await parseODT(badFile)
      expect.fail('Should throw error')
    } catch (error) {
      expect(error.message).toContain('Invalid')
    }
  })
  
  it('recovers from feature initialization error', async () => {
    const badFeature = {
      id: 'bad',
      init: async () => { throw new Error('Init failed') }
    }
    
    await expect(
      featureManager.registerFeature(badFeature)
    ).rejects.toThrow()
    
    // App should still be functional
    expect(featureManager.getAllFeatures().length).toBe(0)
  })
  
  it('skips malformed annotations', async () => {
    const lineText = 'JOHN\n{volume=150, colr=red}\nHello'
    const errors = validateAnnotations(parseAnnotations(lineText), annotations)
    
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('volume')
    expect(errors[1]).toContain('colr')
  })
})
```

## Best Practices

### 1. Specific Error Messages
```typescript
// ❌ Bad
throw new Error('Failed')

// ✅ Good
throw new Error('Failed to parse annotation "volume": value 150 exceeds maximum 100')
```

### 2. Error Context
```typescript
// ❌ Bad
throw error

// ✅ Good
throw new Error(`Document ${fileName} parsing failed: ${error.message}`)
```

### 3. Graceful Degradation
```typescript
// ❌ Bad - crashes entire app
await featureManager.registerFeature(feature)

// ✅ Good - app continues
try {
  await featureManager.registerFeature(feature)
} catch (error) {
  console.warn(`Feature ${feature.id} unavailable: ${error.message}`)
}
```

### 4. User-Friendly Messages
```typescript
// ❌ Bad - technical jargon
"DOMParser.parseFromString returned null"

// ✅ Good - user understandable
"Unable to read the document. It may be corrupted or incomplete."
```

## Error States

```
User Action
    ↓
Try Operation
    ├─ Success → Proceed
    ├─ Recoverable Error → Show message + Retry
    └─ Fatal Error → Show message + Disable feature

App continues running in all cases
```

## Future Enhancements

1. **Sentry Integration**: Automatic error reporting
2. **Error Analytics**: Track common errors
3. **User Feedback**: "Send Error Report" button
4. **Offline Mode**: Handle network errors gracefully
5. **Crash Recovery**: Auto-restore state
